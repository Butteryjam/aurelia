import { NextResponse } from 'next/server'
import { authenticateMobileRequest } from '@/lib/supabase/mobile-auth'
import { recipeModificationInputSchema } from '@/features/ai/schemas/recipe-modification'
import { modifyRecipeWithAi } from '@/features/ai/services/modifier'
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

  const parsed = recipeModificationInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid modification parameters.' },
      { status: 400 }
    )
  }

  // Enforce Postgres rate limiter using authenticated client
  const rateLimit = await checkRateLimit('modification', supabase)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `You have made several AI modification requests. Please wait ${rateLimit.retryAfterSeconds ?? 60}s before trying again.`,
        rateLimited: true,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      { status: 429 }
    )
  }

  const result = await modifyRecipeWithAi(parsed.data, user.id, supabase)
  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error || 'Failed to modify recipe.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: result.data })
}
