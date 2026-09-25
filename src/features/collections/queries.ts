import { createClient } from '@/lib/supabase/server'
import type { Collection, Recipe } from '@/types/database'

export interface CollectionWithRecipes extends Collection {
  recipes?: Recipe[]
  recipe_count?: number
}

/**
 * Fetch all collections belonging to the current user with recipe count.
 */
export async function getCollections(): Promise<CollectionWithRecipes[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data: collections, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  if (error || !collections) {
    console.error('Error fetching collections:', error)
    return []
  }

  const { data: colRecipes } = await supabase
    .from('collection_recipes')
    .select('collection_id')

  const countMap = new Map<string, number>()
  colRecipes?.forEach((cr) => {
    countMap.set(cr.collection_id, (countMap.get(cr.collection_id) ?? 0) + 1)
  })

  return collections.map((col) => ({
    ...col,
    recipe_count: countMap.get(col.id) ?? 0,
  }))
}

/**
 * Fetch a single collection with its associated recipes.
 */
export async function getCollectionWithRecipes(
  collectionId: string
): Promise<CollectionWithRecipes | null> {
  const supabase = await createClient()

  const { data: collection, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', collectionId)
    .single()

  if (error || !collection) {
    return null
  }

  const { data: links } = await supabase
    .from('collection_recipes')
    .select('recipe_id')
    .eq('collection_id', collectionId)

  const recipeIds = links?.map((l) => l.recipe_id) ?? []
  let recipes: Recipe[] = []
  if (recipeIds.length > 0) {
    const { data: fetchedRecipes } = await supabase
      .from('recipes')
      .select('*')
      .in('id', recipeIds)
    recipes = fetchedRecipes ?? []
  }

  return {
    ...collection,
    recipes,
    recipe_count: recipes.length,
  }
}
