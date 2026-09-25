'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/features/recipes/actions'
import { consolidateItems, parseManualItem, type ShoppingItem } from '@/lib/utils/shopping-consolidator'
import { scaleQuantity } from '@/lib/utils/quantity-scaler'

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Create a new shopping list for the authenticated user.
 */
export async function createShoppingList(
  name: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'List name is required.' }

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({ user_id: user.id, name: trimmed, status: 'active' })
    .select('id')
    .single()

  if (error || !data) {
    console.error('createShoppingList error:', error)
    return { error: 'Could not create shopping list.' }
  }

  revalidatePath('/shopping')
  return { data: { id: data.id } }
}

// ─── Add recipe to list ───────────────────────────────────────────────────────

/**
 * Adds all ingredients from a recipe (scaled to the given servings) to an
 * existing shopping list. Consolidates items with the same name + compatible
 * unit against EXISTING list items, then inserts the result.
 *
 * Recipe attribution is stored via recipe_id on each item.
 */
export async function addRecipeToShoppingList(
  listId: string,
  recipeId: string,
  targetServings: number
): Promise<ActionResult<{ added: number }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  // Verify list ownership
  const { data: list } = await supabase
    .from('shopping_lists')
    .select('id, user_id')
    .eq('id', listId)
    .eq('user_id', user.id)
    .single()

  if (!list) return { error: 'Shopping list not found.' }

  // Fetch recipe with ingredients
  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, title, servings')
    .eq('id', recipeId)
    .maybeSingle()

  if (!recipe) return { error: 'Recipe not found.' }

  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('name, quantity, unit, ingredient_id')
    .eq('recipe_id', recipeId)
    .order('order_index')

  if (!ingredients || ingredients.length === 0) {
    return { error: 'This recipe has no ingredients.' }
  }

  const baseServings = recipe.servings ?? null

  // Scale ingredient quantities
  const scaledIngredients: ShoppingItem[] = ingredients.map((ing) => ({
    name: ing.name,
    quantity: targetServings !== baseServings
      ? scaleQuantity(ing.quantity, baseServings, targetServings)
      : (ing.quantity ?? null),
    unit: ing.unit ?? null,
    category: null,
    recipeId: recipe.id,
    recipeTitle: recipe.title,
  }))

  // Fetch existing items in this list to check for possible consolidation
  const { data: existingItems } = await supabase
    .from('shopping_list_items')
    .select('id, name, quantity, unit, recipe_id')
    .eq('shopping_list_id', listId)
    .eq('is_checked', false)

  // Build consolidated list from NEW items + EXISTING un-checked items
  const existingAsShoppingItems: ShoppingItem[] = (existingItems ?? []).map((e) => ({
    name: e.name,
    quantity: e.quantity,
    unit: e.unit,
    category: null,
    recipeId: e.recipe_id,
  }))

  const allItems = [...existingAsShoppingItems, ...scaledIngredients]
  const consolidated = consolidateItems(allItems)

  // Delete existing un-checked items that will be re-inserted as consolidated
  const existingIds = (existingItems ?? []).map((e) => e.id)
  if (existingIds.length > 0) {
    await supabase
      .from('shopping_list_items')
      .delete()
      .in('id', existingIds)
  }

  // Insert consolidated items
  const toInsert = consolidated.map((item) => ({
    shopping_list_id: listId,
    name: item.name,
    quantity: item.quantity || null,
    unit: item.unit || null,
    category: item.category || null,
    is_checked: false,
    // Use the first contributing recipe for attribution (others are in recipeAttributions)
    recipe_id: item.recipeIds[0] ?? null,
  }))

  const { error: insertError } = await supabase
    .from('shopping_list_items')
    .insert(toInsert)

  if (insertError) {
    console.error('addRecipeToShoppingList insert error:', insertError)
    return { error: 'Could not add ingredients to list.' }
  }

  revalidatePath('/shopping')
  return { data: { added: scaledIngredients.length } }
}

// ─── Toggle item checked ──────────────────────────────────────────────────────

/**
 * Toggle the checked state of a shopping list item.
 * Verifies ownership through the shopping_list → user_id chain.
 */
export async function toggleShoppingItem(
  itemId: string
): Promise<ActionResult<{ is_checked: boolean }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  // Verify ownership via RLS-enforced policy (item → list → user)
  const { data: item } = await supabase
    .from('shopping_list_items')
    .select('id, is_checked')
    .eq('id', itemId)
    .single()

  if (!item) return { error: 'Item not found.' }

  const nextChecked = !item.is_checked

  const { error } = await supabase
    .from('shopping_list_items')
    .update({ is_checked: nextChecked })
    .eq('id', itemId)

  if (error) {
    return { error: 'Could not update item.' }
  }

  revalidatePath('/shopping')
  return { data: { is_checked: nextChecked } }
}

// ─── Delete item ──────────────────────────────────────────────────────────────

export async function deleteShoppingItem(
  itemId: string
): Promise<ActionResult<{ success: true }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    return { error: 'Could not delete item.' }
  }

  revalidatePath('/shopping')
  return { data: { success: true } }
}

// ─── Add manual item ─────────────────────────────────────────────────────────

/**
 * Add a manually typed item to a shopping list.
 * Uses conservative natural-language parsing from shopping-consolidator.ts.
 * If parsing is ambiguous, preserves the user's text as the item name.
 */
export async function addManualItem(
  listId: string,
  rawText: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const trimmed = rawText.trim()
  if (!trimmed) return { error: 'Item text is required.' }

  // Verify list ownership (RLS will also enforce this at DB level)
  const { data: list } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', user.id)
    .single()

  if (!list) return { error: 'Shopping list not found.' }

  const parsed = parseManualItem(trimmed)

  const { data, error } = await supabase
    .from('shopping_list_items')
    .insert({
      shopping_list_id: listId,
      name: parsed.name,
      quantity: parsed.quantity,
      unit: parsed.unit,
      is_checked: false,
      recipe_id: null, // manual items have no recipe attribution
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('addManualItem error:', error)
    return { error: 'Could not add item.' }
  }

  revalidatePath('/shopping')
  return { data: { id: data.id } }
}

// ─── Clear checked items ──────────────────────────────────────────────────────

export async function clearCheckedItems(
  listId: string
): Promise<ActionResult<{ removed: number }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  // Verify ownership
  const { data: list } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', user.id)
    .single()

  if (!list) return { error: 'Shopping list not found.' }

  const { data: checkedItems } = await supabase
    .from('shopping_list_items')
    .select('id')
    .eq('shopping_list_id', listId)
    .eq('is_checked', true)

  if (!checkedItems || checkedItems.length === 0) {
    return { data: { removed: 0 } }
  }

  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .in('id', checkedItems.map((i) => i.id))

  if (error) {
    return { error: 'Could not clear checked items.' }
  }

  revalidatePath('/shopping')
  return { data: { removed: checkedItems.length } }
}

// ─── Delete list ──────────────────────────────────────────────────────────────

export async function deleteShoppingList(
  listId: string
): Promise<ActionResult<{ success: true }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const { error } = await supabase
    .from('shopping_lists')
    .delete()
    .eq('id', listId)
    .eq('user_id', user.id)

  if (error) {
    return { error: 'Could not delete shopping list.' }
  }

  revalidatePath('/shopping')
  return { data: { success: true } }
}

// ─── Rename list ──────────────────────────────────────────────────────────────

export async function renameShoppingList(
  listId: string,
  name: string
): Promise<ActionResult<{ success: true }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name is required.' }

  const { error } = await supabase
    .from('shopping_lists')
    .update({ name: trimmed })
    .eq('id', listId)
    .eq('user_id', user.id)

  if (error) {
    return { error: 'Could not rename list.' }
  }

  revalidatePath('/shopping')
  return { data: { success: true } }
}
