import { createClient } from '@/lib/supabase/server'
import type { CookingSession } from '@/types/database'

export interface CookingSessionRecipeSummary {
  id: string
  title: string
  image_url: string | null
  prep_time: number | null
  cook_time: number | null
  total_time: number | null
  servings: number | null
  difficulty: string | null
}

export interface CookingSessionWithRecipe extends CookingSession {
  recipe: CookingSessionRecipeSummary | null
}

/**
 * Fetch recently completed cooking sessions for the authenticated user.
 * Strictly scoped by user_id and batch-joined with recipe metadata.
 */
export async function getRecentCookingSessions(
  limit: number = 4
): Promise<CookingSessionWithRecipe[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data: sessions, error } = await supabase
    .from('cooking_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error || !sessions || sessions.length === 0) {
    return []
  }

  const recipeIds = Array.from(
    new Set(sessions.map((s) => s.recipe_id).filter(Boolean))
  )

  const recipeMap = new Map<string, CookingSessionRecipeSummary>()

  if (recipeIds.length > 0) {
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, title, image_url, prep_time, cook_time, total_time, servings, difficulty')
      .in('id', recipeIds)

    recipes?.forEach((r) => {
      recipeMap.set(r.id, r as CookingSessionRecipeSummary)
    })
  }

  return sessions.map((s) => ({
    ...s,
    recipe: recipeMap.get(s.recipe_id) ?? null,
  }))
}
