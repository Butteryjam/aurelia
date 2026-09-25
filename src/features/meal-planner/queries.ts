import { createClient } from '@/lib/supabase/server'
import type { MealPlanItem, MealPlanItemWithRecipe, DayMeals, MealPlanRecipeSummary } from './types'
import { getRecipes } from '@/features/recipes/queries'
import { formatDateToISO, getWeekRange, calculateDayNutrition } from './utils'

export { formatDateToISO, getWeekRange, calculateDayNutrition }

/**
 * Fetch all planned meal entries for a date range (e.g. active week),
 * joined with recipe metadata, and grouped into day slots.
 */
export async function getMealPlanForWeek(startDate: string, endDate: string): Promise<DayMeals[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  let rawItems: MealPlanItem[] = []

  // 1. Query authoritative relational meal_plan_items table
  const { data: dbItems, error: dbError } = await supabase
    .from('meal_plan_items')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('order_index', { ascending: true })

  if (dbError) {
    console.error('getMealPlanForWeek error:', dbError)
    return []
  }

  rawItems = (dbItems ?? []) as MealPlanItem[]

  // 2. Fetch live recipe metadata for all referenced recipes
  const recipeIds = Array.from(new Set(rawItems.map((i) => i.recipe_id).filter(Boolean))) as string[]
  const recipeMap = new Map<string, MealPlanRecipeSummary>()

  if (recipeIds.length > 0) {
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, title, image_url, prep_time, cook_time, total_time, servings, difficulty, cuisine, nutrition_facts')
      .in('id', recipeIds)

    if (recipes) {
      recipes.forEach((r) => {
        recipeMap.set(r.id, r as MealPlanRecipeSummary)
      })
    }
  }

  // 3. Build enriched items
  const enrichedItems: MealPlanItemWithRecipe[] = rawItems.map((item) => ({
    ...item,
    recipe: item.recipe_id ? recipeMap.get(item.recipe_id) ?? null : null,
  }))

  // 4. Construct 7 consecutive days (Monday -> Sunday)
  const [startY, startM, startD] = startDate.split('-').map(Number)
  const currentIter = new Date(startY, startM - 1, startD)
  const todayISO = formatDateToISO(new Date())

  const days: DayMeals[] = []

  for (let i = 0; i < 7; i++) {
    const dateISO = formatDateToISO(currentIter)
    const dayItems = enrichedItems.filter((it) => it.date === dateISO)

    days.push({
      date: dateISO,
      dayName: currentIter.toLocaleDateString('en-US', { weekday: 'long' }),
      dayShort: currentIter.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: currentIter.getDate(),
      monthShort: currentIter.toLocaleDateString('en-US', { month: 'short' }),
      isToday: dateISO === todayISO,
      slots: {
        breakfast: dayItems.filter((it) => it.meal_type === 'breakfast').sort((a, b) => a.order_index - b.order_index),
        lunch: dayItems.filter((it) => it.meal_type === 'lunch').sort((a, b) => a.order_index - b.order_index),
        dinner: dayItems.filter((it) => it.meal_type === 'dinner').sort((a, b) => a.order_index - b.order_index),
        snack: dayItems.filter((it) => it.meal_type === 'snack').sort((a, b) => a.order_index - b.order_index),
      },
    })

    currentIter.setDate(currentIter.getDate() + 1)
  }

  return days
}

/**
 * Fetch available recipes for the Add Meal dialog
 */
export async function getRecipesForMealPicker(): Promise<MealPlanRecipeSummary[]> {
  const recipes = await getRecipes({ sort: 'alpha' })
  return recipes.map((r) => ({
    id: r.id,
    title: r.title,
    image_url: r.image_url,
    prep_time: r.prep_time,
    cook_time: r.cook_time,
    total_time: r.total_time,
    servings: r.servings,
    difficulty: r.difficulty,
    cuisine: r.cuisine,
    nutrition_facts: r.nutrition_facts,
  }))
}

/**
 * Fetch upcoming planned meals starting from today, chronologically.
 * Strictly scoped by user_id and batch-joined with recipe metadata.
 */
export async function getUpcomingMeals(limit: number = 4): Promise<MealPlanItemWithRecipe[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const todayISO = formatDateToISO(new Date())

  const { data: rawItems, error } = await supabase
    .from('meal_plan_items')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', todayISO)
    .order('date', { ascending: true })
    .order('order_index', { ascending: true })
    .limit(limit)

  if (error || !rawItems || rawItems.length === 0) return []

  const recipeIds = Array.from(
    new Set(rawItems.map((i) => i.recipe_id).filter(Boolean))
  ) as string[]

  const recipeMap = new Map<string, MealPlanRecipeSummary>()

  if (recipeIds.length > 0) {
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, title, image_url, prep_time, cook_time, total_time, servings, difficulty, cuisine, nutrition_facts')
      .in('id', recipeIds)

    if (recipes) {
      recipes.forEach((r) => {
        recipeMap.set(r.id, r as MealPlanRecipeSummary)
      })
    }
  }

  return rawItems.map((item) => ({
    ...item,
    recipe: item.recipe_id ? recipeMap.get(item.recipe_id) ?? null : null,
  }))
}

