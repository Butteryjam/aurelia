import { NextResponse } from 'next/server'
import { authenticateMobileRequest } from '@/lib/supabase/mobile-auth'
import { chatMessageInputSchema } from '@/features/ai/schemas/chat'
import { generateChefResponse } from '@/features/ai/services/chef'
import { checkRateLimit } from '@/features/ai/services/rate-limiter'

export async function POST(request: Request) {
  const auth = await authenticateMobileRequest(request)
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const { user, supabase } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 })
  }

  const parsed = chatMessageInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid message parameters.' },
      { status: 400 }
    )
  }

  const { message, recipeId } = parsed.data
  let conversationId = parsed.data.conversationId

  // Enforce Postgres rate limiter using authenticated client
  const rateLimit = await checkRateLimit('chat', supabase)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Chef needs a quick breather! Please wait ${rateLimit.retryAfterSeconds ?? 60}s before sending another message.`,
        rateLimited: true,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      { status: 429 }
    )
  }

  // 1. Create or verify conversation ownership
  if (!conversationId) {
    let convTitle = message.slice(0, 45).trim()
    if (message.length > 45) convTitle += '…'

    if (recipeId) {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('title')
        .eq('id', recipeId)
        .single()
      if (recipe?.title) {
        convTitle = `About: ${recipe.title}`
      }
    }

    const { data: newConv, error: convError } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: user.id,
        title: convTitle,
        recipe_id: recipeId || null,
      })
      .select()
      .single()

    if (convError || !newConv) {
      console.error('[POST /api/ai/chat] Failed to create AI conversation:', convError)
      return NextResponse.json({ error: 'Could not initialize chat session.' }, { status: 500 })
    }

    conversationId = newConv.id
  } else {
    const { data: existingConv } = await supabase
      .from('ai_conversations')
      .select('id, user_id, recipe_id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!existingConv) {
      return NextResponse.json({ error: 'Conversation not found or access denied.' }, { status: 404 })
    }
  }

  // 2. Fetch past messages for context history
  const { data: pastMessages } = await supabase
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(10)

  // 3. Insert user message into database
  const { data: savedUserMsg, error: userMsgError } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content: message.trim(),
    })
    .select()
    .single()

  if (userMsgError || !savedUserMsg) {
    console.error('[POST /api/ai/chat] Failed to save user message:', userMsgError)
    return NextResponse.json({ error: 'Failed to record message.' }, { status: 500 })
  }

  // 4. Generate AI Chef response with retrieval & context injection
  const history = (pastMessages ?? []).map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }))

  const chefResult = await generateChefResponse({
    userId: user.id,
    recipeId: recipeId || null,
    userMessage: message.trim(),
    conversationHistory: history,
    customClient: supabase,
  })

  if (chefResult.error || !chefResult.data) {
    // Database hygiene: clean up orphaned user message so conversation state stays consistent
    await supabase.from('ai_messages').delete().eq('id', savedUserMsg.id)
    return NextResponse.json(
      { error: chefResult.error ?? 'AI Chef is currently unavailable.' },
      { status: 500 }
    )
  }

  // 5. Insert assistant response into database
  const { data: savedAssistantMsg, error: assistError } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: chefResult.data.content,
      token_count: chefResult.data.tokenCount ?? null,
    })
    .select()
    .single()

  if (assistError || !savedAssistantMsg) {
    console.error('[POST /api/ai/chat] Failed to save assistant message:', assistError)
    return NextResponse.json({ error: 'Could not record Chef response.' }, { status: 500 })
  }

  // 6. Update conversation timestamp
  await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  return NextResponse.json({
    data: {
      conversationId,
      userMessage: savedUserMsg,
      assistantMessage: savedAssistantMsg,
      references: chefResult.data.references,
    },
  })
}
