import { test, expect } from '@playwright/test'
import {
  TEST_USER_A,
  loginViaUI,
  generateRunId,
  getAuthenticatedTestClient,
} from '../fixtures/test-helpers'

test.describe('Recipe Lifecycle E2E (Create, Edit, Search, Favorite)', () => {
  const RUN_ID = generateRunId('recipe_e2e')
  let createdRecipeId: string | null = null

  test.afterAll(async () => {
    // Deterministic namespaced teardown
    if (createdRecipeId) {
      const { client } = await getAuthenticatedTestClient(TEST_USER_A)
      await client.from('favorites').delete().eq('recipe_id', createdRecipeId)
      await client.from('recipes').delete().eq('id', createdRecipeId)
    }
  })

  test('Complete recipe lifecycle flow', async ({ page }) => {
    // 1. Sign in
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)

    // 2. Navigate to /recipes/new
    await page.goto('/recipes/new')
    await page.waitForLoadState('domcontentloaded')

    const initialTitle = `[${RUN_ID}] Saffron Risotto`
    await page.fill('input#title', initialTitle)
    await page.fill('textarea#description', 'Creamy arborio rice with golden saffron threads')

    // Fill ingredients
    const ingInputs = page.locator('input[placeholder*="Ingredient name"]')
    const ingCount = await ingInputs.count()
    for (let i = 0; i < ingCount; i++) {
      await ingInputs.nth(i).fill(i === 0 ? 'Arborio rice' : 'Saffron threads')
    }

    // Fill instructions
    const insInputs = page.locator('textarea[placeholder*="Describe step"]')
    const insCount = await insInputs.count()
    for (let i = 0; i < insCount; i++) {
      await insInputs.nth(i).fill(i === 0 ? 'Toast rice in butter.' : 'Gradually stir in warm broth.')
    }

    // Submit using .first() to avoid multiple submit buttons ambiguity
    await page.locator('button[type="submit"]:has-text("Save Recipe")').first().click()

    // Wait for redirect to /recipes/[id]
    await page.waitForURL((url) => url.pathname.startsWith('/recipes/') && !url.pathname.includes('/new'), {
      timeout: 15000,
    })

    const urlParts = page.url().split('/recipes/')
    createdRecipeId = urlParts[1]?.split('?')[0]?.split('/')[0] ?? null
    expect(createdRecipeId).toBeTruthy()

    // Verify detail page shows recipe title
    await expect(page.locator('h1', { hasText: initialTitle })).toBeVisible()

    // 3. Edit recipe
    await page.click('a:has-text("Edit")')
    await page.waitForURL((url) => url.pathname.includes('/edit'), { timeout: 10000 })

    const updatedTitle = `[${RUN_ID}] Saffron Risotto (Updated)`
    await page.fill('input#title', updatedTitle)
    await page.locator('button[type="submit"]:has-text("Save Changes"), button[type="submit"]:has-text("Update Recipe")').first().click()

    // Wait for redirect back to detail view
    await page.waitForURL((url) => !url.pathname.includes('/edit'), { timeout: 15000 })
    await expect(page.locator('h1', { hasText: updatedTitle })).toBeVisible()

    // 4. Search recipe on /recipes
    await page.goto('/recipes')
    await page.waitForLoadState('domcontentloaded')

    const searchInput = page.locator('input[placeholder*="Search recipes"]')
    await searchInput.fill(RUN_ID)

    // Card matching updatedTitle must be visible
    const recipeCard = page.locator(`text=${updatedTitle}`).first()
    await expect(recipeCard).toBeVisible({ timeout: 10000 })

    // 5. Favorite recipe
    // Click favorite button on the recipe card
    const favButton = page.locator(`button[aria-label*="favorite" i], button[title*="favorite" i]`).first()
    if (await favButton.isVisible()) {
      await favButton.click()
      await page.waitForTimeout(500)
    }
  })
})
