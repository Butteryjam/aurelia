import { test, expect } from '@playwright/test'
import {
  TEST_USER_A,
  loginViaUI,
  generateRunId,
  getAuthenticatedTestClient,
} from '../fixtures/test-helpers'

test.describe('Meal Planner & Shopping List E2E', () => {
  const RUN_ID = generateRunId('plan_e2e')
  let createdRecipeId: string | null = null

  let createdShoppingListId: string | null = null

  test.beforeAll(async () => {
    // Seed recipe with ingredients using authenticated test client
    const { client, userId } = await getAuthenticatedTestClient(TEST_USER_A)

    const { data: recipe } = await client
      .from('recipes')
      .insert({
        user_id: userId,
        title: `[${RUN_ID}] Roasted Salmon`,
        description: 'Pan roasted wild salmon with lemon and asparagus',
        servings: 2,
        difficulty: 'easy',
      })
      .select()
      .single()

    createdRecipeId = recipe?.id ?? null

    if (createdRecipeId) {
      await client.from('recipe_ingredients').insert([
        {
          recipe_id: createdRecipeId,
          name: 'Salmon Fillet',
          quantity: '2',
          unit: 'piece',
          order_index: 0,
        },
        {
          recipe_id: createdRecipeId,
          name: 'Asparagus',
          quantity: '1',
          unit: 'lb',
          order_index: 1,
        },
      ])
    }

    // Seed shopping list for deterministic shopping test
    const { data: sList } = await client
      .from('shopping_lists')
      .insert({
        user_id: userId,
        name: `[${RUN_ID}] Weekly Groceries`,
      })
      .select()
      .single()

    createdShoppingListId = sList?.id ?? null
  })

  test.afterAll(async () => {
    // Namespaced deterministic cleanup
    const { client } = await getAuthenticatedTestClient(TEST_USER_A)
    if (createdShoppingListId) {
      await client.from('shopping_items').delete().eq('list_id', createdShoppingListId)
      await client.from('shopping_lists').delete().eq('id', createdShoppingListId)
    }
    if (createdRecipeId) {
      await client.from('meal_plan_items').delete().eq('recipe_id', createdRecipeId)
      await client.from('recipe_ingredients').delete().eq('recipe_id', createdRecipeId)
      await client.from('recipes').delete().eq('id', createdRecipeId)
    }
  })

  test('Add recipe to meal plan and interact with shopping lists', async ({ page }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)

    // 1. Navigate to seeded recipe detail page
    expect(createdRecipeId).toBeTruthy()
    await page.goto(`/recipes/${createdRecipeId}`)
    await page.waitForLoadState('domcontentloaded')

    // 2. Click "Plan Meal" trigger button
    const planMealBtn = page.locator('button:has-text("Plan Meal")').first()
    await expect(planMealBtn).toBeVisible({ timeout: 10000 })
    await planMealBtn.click()

    // Dialog opens: submit to plan
    const confirmAddBtn = page.locator('button[type="submit"]:has-text("Plan Meal")')
    await expect(confirmAddBtn).toBeVisible({ timeout: 5000 })
    await confirmAddBtn.click()

    // Confirm success message/state
    await expect(page.locator('text=Scheduled to Meal Plan!')).toBeVisible({ timeout: 8000 })
    await page.keyboard.press('Escape')

    // 3. Navigate to /meal-planner
    await page.goto('/meal-planner')
    await page.waitForLoadState('domcontentloaded')

    // 4. Verify planned recipe appears in the meal plan schedule (filter for visible desktop grid element)
    const plannedCard = page.locator(`text=[${RUN_ID}] Roasted Salmon`).locator('visible=true').first()
    await expect(plannedCard).toBeVisible({ timeout: 10000 })

    // 5. Navigate to /shopping with active list query parameter
    expect(createdShoppingListId).toBeTruthy()
    await page.goto(`/shopping?list=${createdShoppingListId}`)
    await page.waitForLoadState('domcontentloaded')

    // 6. Test manual item addition in shopping list
    const manualInput = page.locator('input[aria-label="Add manual shopping item"]').first()
    await expect(manualInput).toBeVisible({ timeout: 8000 })

    const groceryItem = `[${RUN_ID}] Organic Lemons`
    await manualInput.fill(groceryItem)
    await page.click('button[aria-label="Add item"]')

    // Verify item appears in shopping list
    await expect(page.locator(`text=${groceryItem}`)).toBeVisible({ timeout: 8000 })
  })
})
