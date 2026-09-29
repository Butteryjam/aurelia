import { test, expect } from '@playwright/test'
import path from 'path'
import {
  TEST_USER_A,
  loginViaUI,
  generateRunId,
  getAuthenticatedTestClient,
} from '../fixtures/test-helpers'

const ARTIFACT_DIR = path.resolve(
  'C:/Users/svish/.gemini/antigravity-ide/brain/5a25f97c-7cdc-4fb8-ab31-907e287199d9'
)

test.describe('Screen 12: Recipe Creation & Editing Refinement E2E & Visual Verification', () => {
  const RUN_ID = generateRunId('screen12_e2e')
  const createdRecipeIds: string[] = []

  test.afterAll(async () => {
    if (createdRecipeIds.length > 0) {
      const { client } = await getAuthenticatedTestClient(TEST_USER_A)
      for (const id of createdRecipeIds) {
        await client.from('recipe_instructions').delete().eq('recipe_id', id)
        await client.from('recipe_ingredients').delete().eq('recipe_id', id)
        await client.from('recipe_tags').delete().eq('recipe_id', id)
        await client.from('recipes').delete().eq('id', id)
      }
    }
  })

  test('1. Initial Create Recipe state across viewports, dark mode, and zero horizontal overflow', async ({
    page,
  }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)

    // Desktop 1280px Light
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/recipes/new')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('h1', { hasText: 'Create New Recipe' })).toBeVisible()
    await expect(page.locator('text=The Essentials')).toBeVisible()
    await expect(page.locator('text=Timing, Yield & Taxonomy')).toBeVisible()
    await expect(page.locator('text=Ingredients Archive')).toBeVisible()
    await expect(page.locator('text=Method & Timers')).toBeVisible()
    await expect(page.locator("text=Chef's Notes & Culinary Tags")).toBeVisible()

    // Assert zero horizontal overflow
    const overflowDesktop = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(overflowDesktop).toBe(true)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen12-create-1280-light.png'),
      fullPage: true,
    })

    // Desktop 1280px Dark
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen12-create-1280-dark.png'),
      fullPage: true,
    })
    await page.emulateMedia({ colorScheme: 'light' })

    // Tablet 768px
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(300)
    const overflowTablet = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(overflowTablet).toBe(true)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen12-create-768-tablet.png'),
      fullPage: true,
    })

    // Mobile 375px Light
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(300)
    const overflowMobile = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
    expect(overflowMobile).toBe(true)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen12-create-375-mobile-light.png'),
      fullPage: true,
    })

    // Mobile 375px Dark
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen12-create-375-mobile-dark.png'),
      fullPage: true,
    })
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('2. Populated form interaction: sections, inputs, timing calculation, and tag suggestion pills', async ({
    page,
  }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/recipes/new')
    await page.waitForLoadState('domcontentloaded')

    // Fill Title and Description
    const recipeTitle = `[${RUN_ID}] Roasted Duck Breast with Fig Glaze`
    await page.fill('input#title', recipeTitle)
    await page.fill(
      'textarea#description',
      'Crispy skin duck breast basted in thyme butter with a rich mission fig port reduction.'
    )

    // Fill Timing & Yield
    await page.fill('input#prepTime', '15')
    await page.fill('input#cookTime', '25')
    await page.fill('input#servings', '2')
    await page.selectOption('select#difficulty', 'medium')
    await page.fill('input#cuisine', 'French')
    await page.fill('input#category', 'Dinner')

    // Verify computed total time display
    await expect(page.locator('text=40 minutes')).toBeVisible()

    // Add 3rd ingredient row
    await page.click('button:has-text("Add Ingredient")')
    const ingInputs = page.locator('input[placeholder*="Ingredient name"]')
    await expect(ingInputs).toHaveCount(3)

    // Fill ingredients
    await ingInputs.nth(0).fill('Duck breasts')
    await page.locator('input[placeholder*="Qty"]').nth(0).fill('2')
    await page.locator('input[placeholder*="Unit"]').nth(0).fill('breasts')
    await page.locator('input[placeholder*="Prep"]').nth(0).fill('skin scored')

    await ingInputs.nth(1).fill('Fresh mission figs')
    await page.locator('input[placeholder*="Qty"]').nth(1).fill('8')
    await page.locator('input[placeholder*="Prep"]').nth(1).fill('quartered')

    await ingInputs.nth(2).fill('Ruby port wine')
    await page.locator('input[placeholder*="Qty"]').nth(2).fill('1/2')
    await page.locator('input[placeholder*="Unit"]').nth(2).fill('cup')

    // Add 3rd instruction step
    await page.click('button:has-text("Add Step")')
    const stepTextareas = page.locator('textarea[placeholder*="Describe step"]')
    await expect(stepTextareas).toHaveCount(3)

    await stepTextareas.nth(0).fill('Score duck skin in a diamond pattern and season generously with sea salt.')
    await stepTextareas.nth(1).fill('Place duck skin-side down in a cold cast iron skillet over medium-low heat to slowly render fat.')
    await page.locator('input[placeholder*="Timer duration"]').nth(1).fill('12')

    await stepTextareas.nth(2).fill('Flip duck and baste with rendered fat, then rest on cutting board before slicing.')
    await page.locator('input[placeholder*="Timer duration"]').nth(2).fill('6')

    // Fill Chef Notes
    await page.fill('textarea#notes', 'Pair with a bold Pinot Noir or aged Syrah.')

    // Click tag suggestion pills
    await page.click('button:has-text("+ Weeknight")')
    await page.click('button:has-text("+ Comfort Food")')

    // Add custom tag
    await page.fill('input[placeholder*="custom tag"]', 'Artisanal')
    await page.click('button:has-text("Add Tag")')

    await expect(page.locator('button[aria-label="Remove Weeknight"]')).toBeVisible()
    await expect(page.locator('button[aria-label="Remove Comfort Food"]')).toBeVisible()
    await expect(page.locator('button[aria-label="Remove Artisanal"]')).toBeVisible()

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen12-create-populated.png'),
      fullPage: true,
    })

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen12-tag-suggestions.png'),
      fullPage: false,
    })
  })

  test('3. Discard confirmation dialog triggers when cancel is clicked on dirty form', async ({
    page,
  }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
    await page.goto('/recipes/new')
    await page.waitForLoadState('domcontentloaded')

    // Modify form
    await page.fill('input#title', 'Unsaved Souffle Draft')

    // Click Cancel
    await page.locator('button:has-text("Cancel")').first().click()

    // Discard modal should appear
    await expect(page.locator('h2', { hasText: 'Discard Unsaved Changes?' })).toBeVisible()
    await expect(
      page.locator('text=Leaving now will discard your current modifications.')
    ).toBeVisible()

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen12-discard-dialog.png'),
    })

    // Click "Keep Editing" - modal closes and stays on form
    await page.click('button:has-text("Keep Editing")')
    await expect(page.locator('h2', { hasText: 'Discard Unsaved Changes?' })).not.toBeVisible()
    expect(page.url()).toContain('/recipes/new')
  })

  test('4. Validation error alert displays calm accessible message when required fields are missing', async ({
    page,
  }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
    await page.goto('/recipes/new')
    await page.waitForLoadState('domcontentloaded')

    // Title left blank, attempt submit
    await page.locator('button[type="submit"]:has-text("Save Recipe")').first().click()

    // Assert error alert banner
    const alert = page.locator('div[role="alert"]:not(#__next-route-announcer__)')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText('Recipe title is required.')

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen12-validation-error.png'),
    })
  })

  test('5. End-to-end recipe creation saves to database, cleans draft, and redirects to Recipe Detail', async ({
    page,
  }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/recipes/new')
    await page.waitForLoadState('domcontentloaded')

    const newTitle = `[${RUN_ID}] Heirloom Tomato Galette`
    await page.fill('input#title', newTitle)
    await page.fill(
      'textarea#description',
      'Flaky crust folded around ripe heirloom tomatoes, goat cheese, and fresh basil.'
    )
    await page.fill('input#prepTime', '20')
    await page.fill('input#cookTime', '35')
    await page.fill('input#servings', '6')

    // Fill ingredients
    const ingInputs = page.locator('input[placeholder*="Ingredient name"]')
    await ingInputs.nth(0).fill('Puff pastry dough')
    await page.locator('input[placeholder*="Qty"]').nth(0).fill('1')
    await page.locator('input[placeholder*="Unit"]').nth(0).fill('sheet')

    await ingInputs.nth(1).fill('Heirloom tomatoes')
    await page.locator('input[placeholder*="Qty"]').nth(1).fill('3')
    await page.locator('input[placeholder*="Prep"]').nth(1).fill('sliced thick')

    // Fill instructions
    const insInputs = page.locator('textarea[placeholder*="Describe step"]')
    await insInputs.nth(0).fill('Roll out pastry dough and spread goat cheese leaving a 2-inch border.')
    await insInputs.nth(1).fill('Arrange sliced tomatoes and fold the dough edges over before baking.')
    await page.locator('input[placeholder*="Timer duration"]').nth(1).fill('35')

    // Submit recipe
    await page.locator('button[type="submit"]:has-text("Save Recipe")').first().click()

    // Wait for redirect to recipe detail
    await page.waitForURL(
      (url) => url.pathname.startsWith('/recipes/') && !url.pathname.includes('/new') && !url.pathname.includes('/import'),
      { timeout: 15000 }
    )

    const recipeId = page.url().split('/recipes/')[1]?.split('?')[0]?.split('/')[0] ?? null
    expect(recipeId).toBeTruthy()
    if (recipeId) createdRecipeIds.push(recipeId)

    // Verify detail page has title
    await expect(page.locator('h1', { hasText: newTitle })).toBeVisible()

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen12-saved-detail.png'),
      fullPage: true,
    })

    // Now test Edit mode for this recipe
    await page.goto(`/recipes/${recipeId}/edit`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('h1', { hasText: 'Edit Recipe' })).toBeVisible()
    await expect(page.locator('input#title')).toHaveValue(newTitle)
    await expect(page.locator('input#prepTime')).toHaveValue('20')
    await expect(page.locator('input#cookTime')).toHaveValue('35')

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen12-edit-1280-light.png'),
      fullPage: true,
    })
  })
})
