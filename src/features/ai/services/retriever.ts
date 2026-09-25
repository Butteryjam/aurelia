import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { RecipeWithDetails } from '@/types/database'
import type { GroundedRecipeReference } from '../types'

export interface RetrievedRecipeContext {
  id: string
  title: string
  cuisine: string | null
  category: string | null
  cookTime: number | null
  difficulty: string | null
  ingredientSummary?: string
}

/**
 * Retrieve targeted user recipes for AI context based on a search query.
 * Keeps token usage low by fetching only the top 3-6 relevant recipes.
 */
export async function retrieveRecipesForAi(
  query: string,
  userId: string,
  limit: number = 5
): Promise<{ recipes: RetrievedRecipeContext[]; references: GroundedRecipeReference[] }> {
  const supabase = await createClient()

  // Clean query tokens for matching
  const cleaned = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const tokens = cleaned
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .filter(
      (t) =>
        !['what', 'can', 'make', 'with', 'show', 'recipes', 'recipe', 'cook', 'have', 'some', 'about'].includes(
          t
        )
    )

  // Look for time hints (e.g. "under 30 minutes", "quick")
  let maxTime: number | null = null
  const timeMatch = query.match(/(?:under|less than|within|\b)(\d+)\s*(?:mins?|minutes?)/i)
  if (timeMatch) {
    maxTime = parseInt(timeMatch[1], 10)
  }

  // Base query strictly scoped to current user
  let recipeQuery = supabase
    .from('recipes')
    .select(`
      id,
      title,
      description,
      image_url,
      cook_time,
      difficulty,
      cuisine,
      category,
      recipe_ingredients(name)
    `)
    .eq('user_id', userId)

  if (maxTime && maxTime > 0) {
    recipeQuery = recipeQuery.lte('cook_time', maxTime)
  }

  // If we have search tokens, search by title or cuisine or category
  if (tokens.length > 0) {
    const orConditions = tokens
      .slice(0, 4)
      .map((tok) => `title.ilike.%${tok}%,description.ilike.%${tok}%,cuisine.ilike.%${tok}%,category.ilike.%${tok}%`)
      .join(',')
    recipeQuery = recipeQuery.or(orConditions)
  }

  const { data, error } = await recipeQuery.limit(limit)

  if (error) {
    console.error('Failed to retrieve recipes for AI:', error)
    return { recipes: [], references: [] }
  }

  type RecipeRow = {
    id: string
    title: string
    description: string | null
    image_url: string | null
    cook_time: number | null
    difficulty: string | null
    cuisine: string | null
    category: string | null
    recipe_ingredients?: { name: string }[]
  }

  const rows = (data ?? []) as unknown as RecipeRow[]

  const recipes: RetrievedRecipeContext[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    cuisine: r.cuisine,
    category: r.category,
    cookTime: r.cook_time,
    difficulty: r.difficulty,
    ingredientSummary: (r.recipe_ingredients ?? []).map((i) => i.name).slice(0, 8).join(', '),
  }))

  const references: GroundedRecipeReference[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    imageUrl: r.image_url,
    cookTime: r.cook_time,
    difficulty: r.difficulty,
    cuisine: r.cuisine,
    category: r.category,
  }))

  return { recipes, references }
}

/**
 * Fetch detailed recipe context for focused conversations.
 */
export async function getFocusedRecipeContext(
  recipeId: string,
  userId: string
): Promise<{
  id: string
  title: string
  cuisine: string | null
  category: string | null
  cookTime: number | null
  servings: number | null
  ingredients: string[]
  instructions: string[]
  notes: string | null
  reference: GroundedRecipeReference
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients(*),
      recipe_instructions(*)
    `)
    .eq('id', recipeId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  const recipe = data as unknown as RecipeWithDetails

  const sortedInstructions = (recipe.recipe_instructions ?? []).sort(
    (a, b) => a.step_number - b.step_number
  )

  return {
    id: recipe.id,
    title: recipe.title,
    cuisine: recipe.cuisine,
    category: recipe.category,
    cookTime: recipe.cook_time,
    servings: recipe.servings,
    ingredients: (recipe.recipe_ingredients ?? []).map(
      (i) => `${i.quantity ? `${i.quantity} ` : ''}${i.unit ? `${i.unit} ` : ''}${i.name}${i.preparation_note ? ` (${i.preparation_note})` : ''}`
    ),
    instructions: sortedInstructions.map((inst) => inst.instruction),
    notes: recipe.notes,
    reference: {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      imageUrl: recipe.image_url,
      cookTime: recipe.cook_time,
      difficulty: recipe.difficulty,
      cuisine: recipe.cuisine,
      category: recipe.category,
    },
  }
}
