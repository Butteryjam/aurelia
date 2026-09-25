'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { chatMessageInputSchema, type ChatMessageInput } from '../schemas/chat'
import { generateChefResponse } from '../services/chef'
import { checkRateLimit } from '../services/rate-limiter'
import type { AiActionResult, GroundedRecipeReference } from '../types'
import type { AiMessage } from '@/types/database'

export interface ChatActionResult {
  conversationId: string
  userMessage: AiMessage
  assistantMessage: AiMessage
  references: GroundedRecipeReference[]
}

/**
 * Server action: Send a message to AI Chef, persist conversation & message history, and return grounded answer.
 */
export async function sendChatMessageAction(
  input: ChatMessageInput
): Promise<AiActionResult<ChatActionResult>> {
  const parsed = chatMessageInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid message.' }
  }

  const { message, recipeId } = parsed.data
  let conversationId = parsed.data.conversationId

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to chat with AI Chef.' }
  }

  // Check rate limit
  const rateLimit = await checkRateLimit('chat')
  if (!rateLimit.allowed) {
    return {
      error: `Chef needs a quick breather! Please wait ${rateLimit.retryAfterSeconds}s before sending another message.`,
      rateLimited: true,
    }
  }

  // 1. Create or verify conversation
  if (!conversationId) {
    // Generate a title for the conversation
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
      console.error('Failed to create AI conversation:', convError)
      return { error: 'Could not initialize chat session. Please try again.' }
    }

    conversationId = newConv.id
  } else {
    // Verify conversation ownership
    const { data: existingConv } = await supabase
      .from('ai_conversations')
      .select('id, user_id, recipe_id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!existingConv) {
      return { error: 'Conversation not found.' }
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
    console.error('Failed to save user message:', userMsgError)
    return { error: 'Failed to record message.' }
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
  })

  if (chefResult.error || !chefResult.data) {
    // Clean up orphaned user message so the conversation history stays valid for subsequent retries
    await supabase.from('ai_messages').delete().eq('id', savedUserMsg.id)
    return { error: chefResult.error ?? 'Chef is unavailable.' }
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
    console.error('Failed to save assistant message:', assistError)
    return { error: 'Could not record Chef response.' }
  }

  // 6. Update conversation timestamp
  await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  revalidatePath('/ai-chef')

  return {
    data: {
      conversationId,
      userMessage: savedUserMsg,
      assistantMessage: savedAssistantMsg,
      references: chefResult.data.references,
    },
  }
}
