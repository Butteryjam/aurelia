'use server'

import { createClient } from '@/lib/supabase/server'
import { extractRecipeFromText, extractRecipeFromImage } from '../services/extractor'
import { checkRateLimit } from '../services/rate-limiter'
import type { AiActionResult, ExtractedRecipeData } from '../types'

/**
 * Server action: Extract structured recipe from raw text.
 */
export async function extractRecipeFromTextAction(
  rawText: string
): Promise<AiActionResult<ExtractedRecipeData>> {
  if (!rawText || rawText.trim().length < 15) {
    return { error: 'Please enter a bit more recipe text (at least 15 characters).' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to use AI Recipe Import.' }
  }

  // Check rate limit
  const rateLimit = await checkRateLimit('extraction')
  if (!rateLimit.allowed) {
    return {
      error: `You have made several AI requests. Please wait ${rateLimit.retryAfterSeconds}s before trying again.`,
      rateLimited: true,
    }
  }

  const result = await extractRecipeFromText(rawText.trim())
  if (result.error) {
    return { error: result.error }
  }

  return { data: result.data }
}

/**
 * Server action: Extract structured recipe from an image base64 data URI.
 */
export async function extractRecipeFromImageAction(
  base64Data: string,
  mimeType: string = 'image/jpeg'
): Promise<AiActionResult<ExtractedRecipeData>> {
  if (!base64Data) {
    return { error: 'Please provide a valid image file.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to use AI Recipe Import.' }
  }

  // Check rate limit
  const rateLimit = await checkRateLimit('extraction')
  if (!rateLimit.allowed) {
    return {
      error: `You have made several AI requests. Please wait ${rateLimit.retryAfterSeconds}s before trying again.`,
      rateLimited: true,
    }
  }

  const result = await extractRecipeFromImage(base64Data, mimeType)
  if (result.error) {
    return { error: result.error }
  }

  return { data: result.data }
}
