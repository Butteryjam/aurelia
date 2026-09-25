'use server'

import { createClient } from '@/lib/supabase/server'
import { recipeModificationInputSchema } from '../schemas/recipe-modification'
import { modifyRecipeWithAi } from '../services/modifier'
import { checkRateLimit } from '../services/rate-limiter'
import type { AiActionResult, ModifiedRecipeResult, RecipeModificationInput } from '../types'

/**
 * Server action: Modify a recipe non-destructively using AI.
 */
export async function modifyRecipeAction(
  input: RecipeModificationInput
): Promise<AiActionResult<ModifiedRecipeResult>> {
  const parsed = recipeModificationInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid modification request.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to modify recipes with AI.' }
  }

  // Check rate limit
  const rateLimit = await checkRateLimit('modification')
  if (!rateLimit.allowed) {
    return {
      error: `You have made several AI modification requests. Please wait ${rateLimit.retryAfterSeconds}s before trying again.`,
      rateLimited: true,
    }
  }

  const result = await modifyRecipeWithAi(parsed.data, user.id)
  if (result.error) {
    return { error: result.error }
  }

  return { data: result.data }
}
