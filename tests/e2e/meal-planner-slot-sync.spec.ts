import { test, expect } from '@playwright/test'
import {
  TEST_USER_A,
  loginViaUI,
  generateRunId,
  getAuthenticatedTestClient,
} from '../fixtures/test-helpers'

test.describe('Meal Planner Slot Context Sync Regression', () => {
  const RUN_ID = generateRunId('slot_sync')

  test.afterAll(async () => {
    // Teardown created custom meal
    const { client, userId } = await getAuthenticatedTestClient(TEST_USER_A)
    await client
      .from('meal_plan_items')
      .delete()
      .eq('user_id', userId)
      .ilike('title', `%${RUN_ID}%`)
  })

  test('calendar slot click explicitly populates date and meal_type in AddMealDialog', async ({ page }) => {
    // 1. Log in and navigate to Meal Planner
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
    await page.goto('/meal-planner')
    await page.waitForLoadState('domcontentloaded')

    // Ensure desktop 7-day grid is rendered
    const friColumn = page.locator('[data-day-short="Fri"]').locator('visible=true').first()
    await expect(friColumn).toBeVisible({ timeout: 15000 })
    const friDate = await friColumn.getAttribute('data-date')
    expect(friDate).toBeTruthy()

    // 2. Open Friday -> Breakfast slot
    const friBreakfastBtn = friColumn.locator('[data-slot="breakfast"] button').first()
    await friBreakfastBtn.click()

    // Dialog must open with Friday's date and Breakfast slot
    const dialog = page.locator('div[role="dialog"]').first()
    await expect(dialog).toBeVisible({ timeout: 10000 })
    await expect(page.locator('#add-meal-date')).toHaveValue(friDate!)
    await expect(page.locator('#add-meal-slot')).toHaveValue('breakfast')

    // 3. Close dialog without saving
    await page.locator('button:has-text("Cancel")').click()
    await expect(dialog).not.toBeVisible()

    // 4. Open Sunday -> Dinner slot
    const sunColumn = page.locator('[data-day-short="Sun"]').locator('visible=true').first()
    await expect(sunColumn).toBeVisible()
    const sunDate = await sunColumn.getAttribute('data-date')
    expect(sunDate).toBeTruthy()
    expect(sunDate).not.toBe(friDate)

    const sunDinnerBtn = sunColumn.locator('[data-slot="dinner"] button').first()
    await sunDinnerBtn.click()

    // Dialog must open with Sunday's date and Dinner slot (must not retain Friday Breakfast!)
    await expect(dialog).toBeVisible({ timeout: 10000 })
    await expect(page.locator('#add-meal-date')).toHaveValue(sunDate!)
    await expect(page.locator('#add-meal-slot')).toHaveValue('dinner')

    // 5. Switch to Custom Meal tab inside dialog and verify date/slot remains intact
    await page.locator('button:has-text("Custom Meal")').click()
    await expect(page.locator('#add-meal-date')).toHaveValue(sunDate!)
    await expect(page.locator('#add-meal-slot')).toHaveValue('dinner')

    // 6. Enter custom meal and submit
    const customMealTitle = `[${RUN_ID}] Sunday Slow Braise`
    await page.locator('#add-meal-custom-title').fill(customMealTitle)
    await page.locator('button[type="submit"]:has-text("Add to Plan")').click()

    // 7. Verify dialog closes and meal appears in Sunday Dinner slot
    await expect(dialog).not.toBeVisible({ timeout: 12000 })
    const scheduledMealCard = sunColumn.locator('[data-slot="dinner"]').locator(`text=${customMealTitle}`)
    await expect(scheduledMealCard).toBeVisible({ timeout: 12000 })
  })
})
