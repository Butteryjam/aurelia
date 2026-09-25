import { test, expect } from '@playwright/test'
import {
  TEST_USER_A,
  loginViaUI,
  generateRunId,
  getAuthenticatedTestClient,
} from '../fixtures/test-helpers'

test.describe('Cook Mode E2E (Interactive Steps & Session Completion)', () => {
  const RUN_ID = generateRunId('cook_e2e')
  let createdRecipeId: string | null = null

  test.beforeAll(async () => {
    // Seed recipe with instructions using authenticated test client
    const { client, userId } = await getAuthenticatedTestClient(TEST_USER_A)

    const { data: recipe } = await client
      .from('recipes')
      .insert({
        user_id: userId,
        title: `[${RUN_ID}] Classic Carbonara`,
        description: 'Traditional Roman carbonara with guanciale and pecorino',
        servings: 2,
        difficulty: 'medium',
      })
      .select()
      .single()

    createdRecipeId = recipe?.id ?? null

    if (createdRecipeId) {
      await client.from('recipe_instructions').insert([
        {
          recipe_id: createdRecipeId,
          step_number: 1,
          instruction: 'Boil pasta in salted water until al dente.',
        },
        {
          recipe_id: createdRecipeId,
          step_number: 2,
          instruction: 'Crisp guanciale in a skillet and mix eggs with grated pecorino.',
        },
      ])
    }
  })

  test.afterAll(async () => {
    // Namespaced teardown
    if (createdRecipeId) {
      const { client } = await getAuthenticatedTestClient(TEST_USER_A)
      await client.from('cooking_sessions').delete().eq('recipe_id', createdRecipeId)
      await client.from('recipe_instructions').delete().eq('recipe_id', createdRecipeId)
      await client.from('recipes').delete().eq('id', createdRecipeId)
    }
  })

  test('Enter Cook Mode, navigate steps, complete session and verify on dashboard', async ({ page }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)

    // 1. Navigate to recipe Cook Mode
    expect(createdRecipeId).toBeTruthy()
    await page.goto(`/recipes/${createdRecipeId}/cook`)
    await page.waitForLoadState('domcontentloaded')

    // 2. Verify step 1 instruction is displayed
    await expect(page.locator('text=Boil pasta in salted water')).toBeVisible({ timeout: 10000 })

    // Advance to next step
    const nextBtn = page.locator('button[aria-label="Mark step done and go to next step"], button:has-text("Next")').first()
    await expect(nextBtn).toBeVisible({ timeout: 5000 })
    await nextBtn.click()

    // Step 2 instruction
    await expect(page.locator('text=Crisp guanciale in a skillet')).toBeVisible({ timeout: 10000 })

    // 3. Click "Finish Cooking" button to open finish dialog
    const finishBtn = page.locator('button:has-text("Finish Cooking")').first()
    await expect(finishBtn).toBeVisible({ timeout: 8000 })
    await finishBtn.click()

    // 4. Rate 5 stars and add notes
    const fiveStarBtn = page.locator('button[aria-label="5 stars"]')
    await expect(fiveStarBtn).toBeVisible({ timeout: 5000 })
    await fiveStarBtn.click()

    const notesInput = page.locator('textarea#cook-notes')
    const tastingNote = `[${RUN_ID}] Perfectly creamy without clumping`
    await notesInput.fill(tastingNote)

    // 5. Save & finish
    await page.click('button:has-text("Save & Finish")')
    await expect(page.locator('text=Session saved!')).toBeVisible({ timeout: 10000 })

    // 6. Navigate to Dashboard and verify recent cooking activity displays this session
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Verify recent cooking session is visible with the recipe title and notes
    const recentActivity = page.locator(`text=[${RUN_ID}] Classic Carbonara`).first()
    await expect(recentActivity).toBeVisible({ timeout: 10000 })
    await expect(page.locator(`text=${tastingNote}`).first()).toBeVisible({ timeout: 5000 })
  })
})
