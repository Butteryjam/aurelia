import { test, expect } from '@playwright/test'
import {
  TEST_USER_A,
  loginViaUI,
  generateRunId,
  getAuthenticatedTestClient,
} from '../fixtures/test-helpers'

test.describe('Recipe Lifecycle E2E (Create, Edit, Search, Favorite)', () => {
  const RUN_ID = generateRunId('recipe_e2e')
  const createdRecipeIds: string[] = []

  test.afterAll(async () => {
    // Deterministic namespaced teardown
    if (createdRecipeIds.length > 0) {
      const { client } = await getAuthenticatedTestClient(TEST_USER_A)
      for (const id of createdRecipeIds) {
        await client.from('favorites').delete().eq('recipe_id', id)
        await client.from('recipes').delete().eq('id', id)
      }
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
      timeout: 30000,
    })

    const urlParts = page.url().split('/recipes/')
    const createdRecipeId = urlParts[1]?.split('?')[0]?.split('/')[0] ?? null
    expect(createdRecipeId).toBeTruthy()
    if (createdRecipeId) createdRecipeIds.push(createdRecipeId)

    // Verify detail page shows recipe title
    await expect(page.locator('h1', { hasText: initialTitle })).toBeVisible()

    // 3. Edit recipe
    await page.click('a:has-text("Edit")')
    await page.waitForURL((url) => url.pathname.includes('/edit'), { timeout: 10000 })

    const updatedTitle = `[${RUN_ID}] Saffron Risotto (Updated)`
    await page.fill('input#title', updatedTitle)
    await page.locator('button[type="submit"]:has-text("Save Changes"), button[type="submit"]:has-text("Update Recipe")').first().click()

    // Wait for redirect back to detail view
    await page.waitForURL((url) => !url.pathname.includes('/edit'), { timeout: 30000 })
    await expect(page.locator('h1', { hasText: updatedTitle })).toBeVisible()

    // 4. Search recipe on /recipes
    await page.goto('/recipes')
    await page.waitForLoadState('domcontentloaded')

    const searchInput = page.locator('input[placeholder*="Search recipes"]').first()
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

  test('/favorites route cleanly redirects to /recipes?favorite=true', async ({ page }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
    await page.goto('/favorites')
    await page.waitForURL((url) => url.pathname === '/recipes' && url.searchParams.get('favorite') === 'true', {
      timeout: 15000,
    })
    expect(page.url()).toContain('/recipes?favorite=true')
    await expect(page.locator('h1', { hasText: 'Recipes' }).first()).toBeVisible()
  })

  test('untouched empty ingredient and instruction rows are pruned automatically on submit', async ({ page }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
    await page.goto('/recipes/new')
    await page.waitForLoadState('domcontentloaded')

    const pruneTitle = `[${RUN_ID}] Prune Test Risotto`
    await page.fill('input#title', pruneTitle)
    await page.fill('textarea#description', 'Testing automated pruning of untouched blank rows')

    // Initial form loads with 2 ingredient rows and 2 instruction rows.
    // Fill only the FIRST ingredient row; leave the second row untouched/blank.
    const ingNameInputs = page.locator('input[placeholder*="Ingredient name"]')
    await ingNameInputs.first().fill('Arborio rice')

    // Fill only the FIRST instruction step; leave the second step untouched/blank.
    const insInputs = page.locator('textarea[placeholder*="Describe step"]')
    await insInputs.first().fill('Toast rice gently in butter.')

    // Submit form - untouched empty 2nd rows must NOT trigger validation or block submission
    await page.locator('button[type="submit"]:has-text("Save Recipe")').first().click()

    // Redirect to detail page
    await page.waitForURL((url) => url.pathname.startsWith('/recipes/') && !url.pathname.includes('/new'), {
      timeout: 30000,
    })

    const urlParts = page.url().split('/recipes/')
    const newRecipeId = urlParts[1]?.split('?')[0]?.split('/')[0] ?? null
    expect(newRecipeId).toBeTruthy()
    if (newRecipeId) createdRecipeIds.push(newRecipeId)

    // Verify detail page shows recipe title
    await expect(page.locator('h1', { hasText: pruneTitle })).toBeVisible()

    // Verify only the filled ingredient and instruction are present
    await expect(page.locator('text=Arborio rice')).toBeVisible()
    await expect(page.locator('text=Toast rice gently in butter.')).toBeVisible()
  })

  test('partially filled ingredient and instruction rows are preserved and block submission', async ({ page }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
    await page.goto('/recipes/new')
    await page.waitForLoadState('domcontentloaded')

    // Discard any draft if present so we start clean
    const discardBtn = page.locator('button:has-text("Discard")')
    if (await discardBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await discardBtn.click()
    }

    const partialTitle = `[${RUN_ID}] Partial Rows Test`
    await page.fill('input#title', partialTitle)

    // Fill partially: quantity provided, but ingredient name left empty!
    const qtyInputs = page.locator('input[placeholder*="Qty"]')
    await qtyInputs.first().fill('2')

    // Fill valid instruction step 1
    const insInputs = page.locator('textarea[placeholder*="Describe step"]')
    await insInputs.first().fill('Valid step instruction')

    // The ingredient name input must be required (validation intact for non-empty row)
    const ingNameInputs = page.locator('input[placeholder*="Ingredient name"]')
    await expect(ingNameInputs.first()).toHaveAttribute('required', '')
    const isIngInvalid = await ingNameInputs.first().evaluate((el: HTMLInputElement) => !el.checkValidity())
    expect(isIngInvalid).toBe(true)

    // Attempt submission - validation blocks submission and prevents navigation
    await page.locator('button[type="submit"]:has-text("Save Recipe")').first().click()
    expect(page.url()).toContain('/recipes/new')

    // User input was strictly preserved (quantity still has "2")
    await expect(qtyInputs.first()).toHaveValue('2')

    // Now fill the ingredient name
    await ingNameInputs.first().fill('Pecorino Romano')

    // Now partially fill instruction: timer set to 15, but instruction step 2 left empty
    const timerInputs = page.locator('input[placeholder*="Timer"]')
    await timerInputs.nth(1).fill('15')

    // Instruction step 2 textarea must be required because row is partially filled
    await expect(insInputs.nth(1)).toHaveAttribute('required', '')
    const isInsInvalid = await insInputs.nth(1).evaluate((el: HTMLTextAreaElement) => !el.checkValidity())
    expect(isInsInvalid).toBe(true)

    // Attempt submission - validation blocks submission and prevents navigation
    await page.locator('button[type="submit"]:has-text("Save Recipe")').first().click()
    expect(page.url()).toContain('/recipes/new')

    // User inputs were strictly preserved (timer still has "15", quantity has "2", name has "Pecorino Romano")
    await expect(timerInputs.nth(1)).toHaveValue('15')
    await expect(qtyInputs.first()).toHaveValue('2')
    await expect(ingNameInputs.first()).toHaveValue('Pecorino Romano')
  })
})
