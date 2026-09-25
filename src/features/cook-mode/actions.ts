'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/features/recipes/actions'

/**
 * Records a completed cooking session.
 * RLS ensures only the authenticated user can insert their own rows.
 */
export async function completeCookingSession(
  recipeId: string,
  opts?: { notes?: string; rating?: number }
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  // Verify the recipe is accessible
  const { data: recipe } = await supabase
    .from('recipes')
    .select('id')
    .eq('id', recipeId)
    .maybeSingle()

  if (!recipe) {
    return { error: 'Recipe not found.' }
  }

  const { data, error } = await supabase
    .from('cooking_sessions')
    .insert({
      user_id: user.id,
      recipe_id: recipeId,
      completed_at: new Date().toISOString(),
      notes: opts?.notes?.trim() || null,
      rating: opts?.rating ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('Failed to record cooking session:', error)
    return { error: 'Could not save your cooking session.' }
  }

  revalidatePath(`/recipes/${recipeId}`)
  revalidatePath('/')

  return { data: { id: data.id } }
}
