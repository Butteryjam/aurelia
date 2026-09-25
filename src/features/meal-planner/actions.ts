'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/features/recipes/actions'
import type { Database } from '@/types/database'
import type { MealType } from './types'
import { scaleQuantity } from '@/lib/utils/quantity-scaler'
import { consolidateItems, type ShoppingItem } from '@/lib/utils/shopping-consolidator'

export interface AddMealPlanItemInput {
  date: string
  mealType: MealType
  recipeId?: string | null
  customTitle?: string | null
  servings?: number
  notes?: string | null
}

export interface UpdateMealPlanItemInput {
  date?: string
  mealType?: MealType
  servings?: number
  notes?: string | null
  isCooked?: boolean
}

/**
 * Add a new planned meal entry (recipe-based or custom)
 */
export async function addMealPlanItem(
  input: AddMealPlanItemInput
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  if (!input.recipeId && (!input.customTitle || !input.customTitle.trim())) {
    return { error: 'Please choose a recipe or enter a meal name.' }
  }

  let title = input.customTitle?.trim() || ''
  let imageSnapshot: string | null = null
  let defaultServings = input.servings && input.servings > 0 ? input.servings : 2

  if (input.recipeId) {
    const { data: recipe } = await supabase
      .from('recipes')
      .select('title, image_url, servings')
      .eq('id', input.recipeId)
      .maybeSingle()

    if (recipe) {
      title = recipe.title
      imageSnapshot = recipe.image_url ?? null
      if (!input.servings && recipe.servings) {
        defaultServings = recipe.servings
      }
    }
  }

  // 1. Try primary relational insert
  const insertPayload: Database['public']['Tables']['meal_plan_items']['Insert'] = {
    user_id: user.id,
    meal_plan_id: null,
    recipe_id: input.recipeId ?? null,
    title,
    recipe_image_url_snapshot: imageSnapshot,
    date: input.date,
    meal_type: input.mealType,
    servings: defaultServings,
    notes: input.notes?.trim() || null,
    order_index: 0,
    is_cooked: false,
    cooking_session_id: null,
  }

  const { data: inserted, error: dbError } = await supabase
    .from('meal_plan_items')
    .insert(insertPayload)
    .select('id')
    .single()

  if (dbError || !inserted) {
    console.error('addMealPlanItem error:', dbError)
    return { error: 'Could not add meal to plan.' }
  }

  revalidatePath('/meal-planner')
  return { data: { id: inserted.id } }
}

/**
 * Update an existing planned meal entry (servings, notes, date, slot, completion)
 */
export async function updateMealPlanItem(
  id: string,
  updates: UpdateMealPlanItemInput
): Promise<ActionResult<{ success: true }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const payload: Database['public']['Tables']['meal_plan_items']['Update'] = {}
  if (updates.date !== undefined) payload.date = updates.date
  if (updates.mealType !== undefined) payload.meal_type = updates.mealType
  if (updates.servings !== undefined) payload.servings = updates.servings
  if (updates.notes !== undefined) payload.notes = updates.notes?.trim() || null
  if (updates.isCooked !== undefined) payload.is_cooked = updates.isCooked

  // 1. Relational table update
  const { error: dbError } = await supabase
    .from('meal_plan_items')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (dbError) {
    console.error('updateMealPlanItem error:', dbError)
    return { error: 'Could not update planned meal.' }
  }

  revalidatePath('/meal-planner')
  return { data: { success: true } }
}

/**
 * Remove a meal entry from the plan
 */
export async function deleteMealPlanItem(id: string): Promise<ActionResult<{ success: true }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  // 1. Relational table delete
  const { error: dbError } = await supabase
    .from('meal_plan_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (dbError) {
    console.error('deleteMealPlanItem error:', dbError)
    return { error: 'Could not delete planned meal.' }
  }

  revalidatePath('/meal-planner')
  return { data: { success: true } }
}

/**
 * Clear all planned meals for a specified week
 */
export async function clearWeekMealPlan(
  startDate: string,
  endDate: string
): Promise<ActionResult<{ success: true }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  // 1. Relational table clear
  const { error: dbError } = await supabase
    .from('meal_plan_items')
    .delete()
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)

  if (dbError) {
    console.error('clearWeekMealPlan error:', dbError)
    return { error: 'Could not clear week.' }
  }

  revalidatePath('/meal-planner')
  return { data: { success: true } }
}

/**
 * Generate/Export ingredients from selected planned meals directly into a Smart Shopping List.
 * Reuses scaleQuantity() and consolidateItems() without duplicating logic.
 */
export async function generateShoppingListFromMealPlan(
  listId: string,
  plannedItemIds: string[]
): Promise<ActionResult<{ added: number }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }
  if (!plannedItemIds || plannedItemIds.length === 0) {
    return { error: 'No planned meals selected.' }
  }

  // 1. Verify shopping list ownership
  const { data: list } = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', user.id)
    .single()

  if (!list) return { error: 'Shopping list not found.' }

  // 2. Fetch planned meals exclusively from meal_plan_items
  const { data: dbItems, error: dbError } = await supabase
    .from('meal_plan_items')
    .select('recipe_id, servings')
    .eq('user_id', user.id)
    .in('id', plannedItemIds)

  if (dbError || !dbItems) {
    console.error('generateShoppingListFromMealPlan query error:', dbError)
    return { error: 'Could not fetch planned meals for shopping list generation.' }
  }

  const plannedItems = dbItems

  // Filter items that have a recipe reference
  const recipeMeals = plannedItems.filter((m) => Boolean(m.recipe_id))
  if (recipeMeals.length === 0) {
    return { error: 'None of the selected meals have recipe ingredients to export.' }
  }

  // 3. Fetch recipe details & ingredients
  const uniqueRecipeIds = Array.from(new Set(recipeMeals.map((m) => m.recipe_id!)))

  const [recipesRes, ingredientsRes] = await Promise.all([
    supabase.from('recipes').select('id, title, servings').in('id', uniqueRecipeIds),
    supabase
      .from('recipe_ingredients')
      .select('recipe_id, name, quantity, unit')
      .in('recipe_id', uniqueRecipeIds)
      .order('order_index'),
  ])

  const recipes = recipesRes.data ?? []
  const ingredients = ingredientsRes.data ?? []

  const recipeMetaMap = new Map(recipes.map((r) => [r.id, r]))

  // 4. Scale ingredients for each planned meal
  const allScaledShoppingItems: ShoppingItem[] = []

  for (const meal of recipeMeals) {
    const meta = recipeMetaMap.get(meal.recipe_id!)
    if (!meta) continue

    const baseServings = meta.servings && meta.servings > 0 ? meta.servings : 2
    const mealServings = meal.servings

    const mealIngredients = ingredients.filter((ing) => ing.recipe_id === meal.recipe_id)

    for (const ing of mealIngredients) {
      allScaledShoppingItems.push({
        name: ing.name,
        quantity:
          mealServings !== baseServings
            ? scaleQuantity(ing.quantity, baseServings, mealServings)
            : (ing.quantity ?? null),
        unit: ing.unit ?? null,
        category: null,
        recipeId: meta.id,
        recipeTitle: meta.title,
      })
    }
  }

  // 5. Fetch existing unchecked items in target shopping list to consolidate
  const { data: existingItems } = await supabase
    .from('shopping_list_items')
    .select('id, name, quantity, unit, recipe_id')
    .eq('shopping_list_id', listId)
    .eq('is_checked', false)

  const existingAsShoppingItems: ShoppingItem[] = (existingItems ?? []).map((e) => ({
    name: e.name,
    quantity: e.quantity,
    unit: e.unit,
    category: null,
    recipeId: e.recipe_id,
  }))

  // 6. Safe consolidation using existing consolidator logic
  const combined = [...existingAsShoppingItems, ...allScaledShoppingItems]
  const consolidated = consolidateItems(combined)

  // 7. Delete existing unchecked items and insert consolidated result
  const existingIds = (existingItems ?? []).map((e) => e.id)
  if (existingIds.length > 0) {
    await supabase.from('shopping_list_items').delete().in('id', existingIds)
  }

  const toInsert = consolidated.map((item) => ({
    shopping_list_id: listId,
    name: item.name,
    quantity: item.quantity || null,
    unit: item.unit || null,
    category: item.category || null,
    is_checked: false,
    recipe_id: item.recipeIds[0] ?? null,
  }))

  const { error: insertError } = await supabase.from('shopping_list_items').insert(toInsert)

  if (insertError) {
    console.error('generateShoppingListFromMealPlan insert error:', insertError)
    return { error: 'Could not export ingredients to shopping list.' }
  }

  revalidatePath('/shopping')
  revalidatePath('/meal-planner')
  return { data: { added: allScaledShoppingItems.length } }
}
