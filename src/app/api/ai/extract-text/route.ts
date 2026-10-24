import { NextResponse } from 'next/server'
import { authenticateMobileRequest } from '@/lib/supabase/mobile-auth'
import { extractRecipeFromText } from '@/features/ai/services/extractor'
import { checkRateLimit } from '@/features/ai/services/rate-limiter'

export async function POST(request: Request) {
  const auth = await authenticateMobileRequest(request)
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized', errorCategory: 'auth_failure' },
      { status: 401 }
    )
  }

  const { supabase } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body.', errorCategory: 'invalid_input' },
      { status: 400 }
    )
  }

  const text = (body as { text?: string })?.text
  if (!text || typeof text !== 'string' || text.trim().length < 15) {
    return NextResponse.json(
      {
        error: 'Please enter a bit more recipe text (at least 15 characters).',
        errorCategory: 'invalid_input',
      },
      { status: 400 }
    )
  }

  // Enforce Postgres rate limiter using authenticated client
  const rateLimit = await checkRateLimit('extraction', supabase)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `You have made several AI extraction requests. Please wait ${rateLimit.retryAfterSeconds ?? 60}s before trying again.`,
        errorCategory: 'quota_exhausted',
        rateLimited: true,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds ?? 60),
        },
      }
    )
  }

  const result = await extractRecipeFromText(text.trim())
  if (result.error || !result.data) {
    const headers: Record<string, string> = {}
    if (result.statusCode === 429 && result.retryAfterSeconds) {
      headers['Retry-After'] = String(result.retryAfterSeconds)
    }

    return NextResponse.json(
      {
        error: result.error || 'Failed to extract recipe.',
        errorCategory: result.errorCategory || 'unexpected_error',
        retryAfterSeconds: result.retryAfterSeconds,
      },
      {
        status: result.statusCode || 500,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      }
    )
  }

  return NextResponse.json({ data: result.data })
}
