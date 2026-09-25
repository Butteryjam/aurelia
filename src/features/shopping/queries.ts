import { createClient } from '@/lib/supabase/server'
import type { ShoppingList, ShoppingListItem } from '@/types/database'

export interface ShoppingListWithItems extends ShoppingList {
  items: ShoppingListItemWithRecipe[]
}

export interface ShoppingListItemWithRecipe extends ShoppingListItem {
  recipe_title?: string | null
}

/**
 * Fetch all shopping lists for the current user, newest first.
 */
export async function getShoppingLists(): Promise<ShoppingList[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching shopping lists:', error)
    return []
  }

  return data ?? []
}

/**
 * Fetch the first active shopping list for the current user, or null.
 */
export async function getActiveShoppingList(): Promise<ShoppingList | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
}

/**
 * Fetch a shopping list with its items and recipe titles for attribution.
 */
export async function getShoppingListWithItems(
  listId: string
): Promise<ShoppingListWithItems | null> {
  const supabase = await createClient()

  const { data: list, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('id', listId)
    .single()

  if (error || !list) return null

  const { data: items } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('shopping_list_id', listId)
    .order('created_at', { ascending: true })

  const rawItems: ShoppingListItem[] = items ?? []

  // Batch-fetch recipe titles for attribution
  const recipeIds = Array.from(
    new Set(rawItems.map((i) => i.recipe_id).filter(Boolean) as string[])
  )

  const recipeMap: Map<string, string> = new Map()
  if (recipeIds.length > 0) {
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, title')
      .in('id', recipeIds)

    recipes?.forEach((r) => recipeMap.set(r.id, r.title))
  }

  const enrichedItems: ShoppingListItemWithRecipe[] = rawItems.map((item) => ({
    ...item,
    recipe_title: item.recipe_id ? (recipeMap.get(item.recipe_id) ?? null) : null,
  }))

  return { ...list, items: enrichedItems }
}
