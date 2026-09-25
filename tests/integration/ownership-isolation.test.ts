import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

describe('Row Level Security (RLS) & Multi-Account Isolation Integration Tests', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const emailA = process.env.TEST_USER_A_EMAIL ?? 'user_a_test@recipevault.test'
  const passwordA = process.env.TEST_USER_A_PASSWORD ?? 'TestPassword123!'
  const emailB = process.env.TEST_USER_B_EMAIL ?? 'user_b_test@recipevault.test'
  const passwordB = process.env.TEST_USER_B_PASSWORD ?? 'TestPassword123!'

  let clientA: SupabaseClient
  let clientB: SupabaseClient
  let userAId: string
  let userBId: string

  // Deterministic unique test run identifier
  const RUN_ID = `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  // Track created entities for deterministic namespaced teardown
  const createdRecipeIds: string[] = []
  const createdMealPlanItemIds: string[] = []
  const createdShoppingListIds: string[] = []

  beforeAll(async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables missing in test environment')
    }

    clientA = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    clientB = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: authA, error: errA } = await clientA.auth.signInWithPassword({
      email: emailA,
      password: passwordA,
    })
    if (errA || !authA.user) {
      throw new Error(`Failed to sign in User A: ${errA?.message}`)
    }
    userAId = authA.user.id

    const { data: authB, error: errB } = await clientB.auth.signInWithPassword({
      email: emailB,
      password: passwordB,
    })
    if (errB || !authB.user) {
      throw new Error(`Failed to sign in User B: ${errB?.message}`)
    }
    userBId = authB.user.id

    expect(userAId).not.toBe(userBId)
  })

  afterAll(async () => {
    // Deterministic namespaced cleanup: only delete entities created during this run
    if (clientA) {
      if (createdMealPlanItemIds.length > 0) {
        await clientA.from('meal_plan_items').delete().in('id', createdMealPlanItemIds)
      }
      if (createdShoppingListIds.length > 0) {
        await clientA.from('shopping_lists').delete().in('id', createdShoppingListIds)
      }
      if (createdRecipeIds.length > 0) {
        await clientA.from('favorites').delete().in('recipe_id', createdRecipeIds)
        await clientA.from('recipes').delete().in('id', createdRecipeIds)
      }
    }
  })

  describe('Recipe ownership isolation', () => {
    it('prevents User B from reading, updating, or deleting User A recipe', async () => {
      // 1. User A creates a recipe
      const title = `[${RUN_ID}] Secret Truffle Pasta`
      const { data: recipeA, error: createError } = await clientA
        .from('recipes')
        .insert({
          user_id: userAId,
          title,
          description: 'User A proprietary recipe',
          servings: 4,
          prep_time: 15,
          cook_time: 20,
          difficulty: 'medium',
        })
        .select()
        .single()

      expect(createError).toBeNull()
      expect(recipeA).toBeDefined()
      createdRecipeIds.push(recipeA.id)

      // 2. User B tries to read User A's recipe
      const { data: readByUserB } = await clientB
        .from('recipes')
        .select('*')
        .eq('id', recipeA.id)

      expect(readByUserB).toHaveLength(0)

      // 3. User B attempts UPDATE on User A's recipe
      const { data: updateResult, error: updateError } = await clientB
        .from('recipes')
        .update({ title: `[${RUN_ID}] Hacked By User B` })
        .eq('id', recipeA.id)
        .select()

      expect(updateError).toBeNull()
      expect(updateResult ?? []).toHaveLength(0) // 0 rows affected

      // 4. Re-query as User A: verify title remains unchanged and intact
      const { data: verifiedRecipeA } = await clientA
        .from('recipes')
        .select('*')
        .eq('id', recipeA.id)
        .single()

      expect(verifiedRecipeA.title).toBe(title)

      // 5. User B attempts DELETE on User A's recipe
      const { data: deleteResult, error: deleteError } = await clientB
        .from('recipes')
        .delete()
        .eq('id', recipeA.id)
        .select()

      expect(deleteError).toBeNull()
      expect(deleteResult ?? []).toHaveLength(0) // 0 rows affected

      // 6. Re-query as User A: verify recipe still exists
      const { data: stillExists } = await clientA
        .from('recipes')
        .select('id')
        .eq('id', recipeA.id)
        .single()

      expect(stillExists?.id).toBe(recipeA.id)
    })
  })

  describe('Favorite ownership isolation', () => {
    it('prevents User B from seeing or deleting User A favorites', async () => {
      // 1. User A creates and favorites a recipe
      const { data: recipeA } = await clientA
        .from('recipes')
        .insert({
          user_id: userAId,
          title: `[${RUN_ID}] User A Favorite Dish`,
          servings: 2,
        })
        .select()
        .single()

      createdRecipeIds.push(recipeA.id)

      const { data: favA, error: favError } = await clientA
        .from('favorites')
        .insert({
          user_id: userAId,
          recipe_id: recipeA.id,
        })
        .select()
        .single()

      expect(favError).toBeNull()
      expect(favA).toBeDefined()

      // 2. User B queries favorites for this recipe
      const { data: favByUserB } = await clientB
        .from('favorites')
        .select('*')
        .eq('recipe_id', recipeA.id)

      expect(favByUserB).toHaveLength(0)

      // 3. User B attempts DELETE on User A's favorite
      const { data: deleteFavB } = await clientB
        .from('favorites')
        .delete()
        .eq('recipe_id', recipeA.id)
        .select()

      expect(deleteFavB ?? []).toHaveLength(0)

      // 4. User A re-queries favorite: confirms still exists
      const { data: verifiedFavA } = await clientA
        .from('favorites')
        .select('*')
        .eq('recipe_id', recipeA.id)
        .eq('user_id', userAId)
        .single()

      expect(verifiedFavA).toBeDefined()
      expect(verifiedFavA.recipe_id).toBe(recipeA.id)
      expect(verifiedFavA.user_id).toBe(userAId)
    })
  })

  describe('Meal plan ownership isolation', () => {
    it('prevents User B from accessing, modifying, or deleting User A planned meals', async () => {
      const todayISO = new Date().toISOString().split('T')[0]

      // 1. User A plans a meal
      const { data: mealItemA, error: mealError } = await clientA
        .from('meal_plan_items')
        .insert({
          user_id: userAId,
          title: `[${RUN_ID}] Planned Risotto`,
          date: todayISO,
          meal_type: 'dinner',
          servings: 4,
        })
        .select()
        .single()

      expect(mealError).toBeNull()
      expect(mealItemA).toBeDefined()
      createdMealPlanItemIds.push(mealItemA.id)

      // 2. User B tries to read User A's meal item
      const { data: readMealB } = await clientB
        .from('meal_plan_items')
        .select('*')
        .eq('id', mealItemA.id)

      expect(readMealB).toHaveLength(0)

      // 3. User B attempts UPDATE on User A's meal item
      const { data: updateMealB } = await clientB
        .from('meal_plan_items')
        .update({ servings: 99 })
        .eq('id', mealItemA.id)
        .select()

      expect(updateMealB ?? []).toHaveLength(0)

      // 4. User A re-queries: confirms servings still 4
      const { data: verifiedMealA } = await clientA
        .from('meal_plan_items')
        .select('*')
        .eq('id', mealItemA.id)
        .single()

      expect(verifiedMealA.servings).toBe(4)

      // 5. User B attempts DELETE on User A's meal item
      const { data: deleteMealB } = await clientB
        .from('meal_plan_items')
        .delete()
        .eq('id', mealItemA.id)
        .select()

      expect(deleteMealB ?? []).toHaveLength(0)

      // 6. User A confirms meal still exists
      const { data: stillExists } = await clientA
        .from('meal_plan_items')
        .select('id')
        .eq('id', mealItemA.id)
        .single()

      expect(stillExists?.id).toBe(mealItemA.id)
    })
  })

  describe('Shopping list ownership isolation', () => {
    it('prevents User B from accessing, modifying, or deleting User A shopping list', async () => {
      // 1. User A creates a shopping list
      const listName = `[${RUN_ID}] Weekend Groceries`
      const { data: listA, error: listError } = await clientA
        .from('shopping_lists')
        .insert({
          user_id: userAId,
          name: listName,
          status: 'active',
        })
        .select()
        .single()

      expect(listError).toBeNull()
      expect(listA).toBeDefined()
      createdShoppingListIds.push(listA.id)

      // 2. User B attempts to read User A's shopping list
      const { data: readListB } = await clientB
        .from('shopping_lists')
        .select('*')
        .eq('id', listA.id)

      expect(readListB).toHaveLength(0)

      // 3. User B attempts UPDATE on User A's shopping list
      const { data: updateListB } = await clientB
        .from('shopping_lists')
        .update({ name: `[${RUN_ID}] Compromised Name` })
        .eq('id', listA.id)
        .select()

      expect(updateListB ?? []).toHaveLength(0)

      // 4. User A re-queries: confirms name unchanged
      const { data: verifiedListA } = await clientA
        .from('shopping_lists')
        .select('*')
        .eq('id', listA.id)
        .single()

      expect(verifiedListA.name).toBe(listName)

      // 5. User B attempts DELETE on User A's shopping list
      const { data: deleteListB } = await clientB
        .from('shopping_lists')
        .delete()
        .eq('id', listA.id)
        .select()

      expect(deleteListB ?? []).toHaveLength(0)

      // 6. User A confirms list still exists
      const { data: stillExists } = await clientA
        .from('shopping_lists')
        .select('id')
        .eq('id', listA.id)
        .single()

      expect(stillExists?.id).toBe(listA.id)
    })
  })
})
