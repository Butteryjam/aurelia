import { NextResponse } from 'next/server'
import { authenticateMobileRequest } from '@/lib/supabase/mobile-auth'
import { extractRecipeFromImage } from '@/features/ai/services/extractor'
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

  const { base64Data, mimeType = 'image/jpeg' } = (body as {
    base64Data?: string
    mimeType?: string
  }) || {}

  if (!base64Data || typeof base64Data !== 'string' || base64Data.trim().length === 0) {
    return NextResponse.json(
      {
        error: 'Please provide a valid image file base64 data string.',
        errorCategory: 'invalid_input',
      },
      { status: 400 }
    )
  }

  // Validate image payload size (max 7MB base64 ~ 5MB binary)
  if (base64Data.length > 7 * 1024 * 1024) {
    return NextResponse.json(
      {
        error: 'Image file exceeds the 5 MB size limit. Please choose a smaller photo.',
        errorCategory: 'invalid_input',
      },
      { status: 400 }
    )
  }

  // Validate supported mimeType
  const normalizedMime = (mimeType || '').toLowerCase()
  if (
    normalizedMime &&
    !normalizedMime.startsWith('image/') &&
    normalizedMime !== 'application/octet-stream'
  ) {
    return NextResponse.json(
      {
        error: 'Unsupported image format. Please select a valid JPEG, PNG, or WebP photo.',
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
      { status: 429 }
    )
  }

  const result = await extractRecipeFromImage(base64Data, mimeType)
  if (result.error || !result.data) {
    return NextResponse.json(
      {
        error: result.error || 'Failed to extract recipe from image.',
        errorCategory: result.errorCategory || 'unexpected_error',
        retryAfterSeconds: result.retryAfterSeconds,
      },
      { status: result.statusCode || 500 }
    )
  }

  return NextResponse.json({ data: result.data })
}
