import { test, expect } from '@playwright/test'
import {
  TEST_USER_A,
  loginViaUI,
  generateRunId,
  getAuthenticatedTestClient,
} from '../fixtures/test-helpers'

test.describe('Collections E2E (Create Collection & Add Recipe)', () => {
  const RUN_ID = generateRunId('col_e2e')
  let createdRecipeId: string | null = null
  let createdCollectionId: string | null = null

  test.beforeAll(async () => {
    // Seed recipe using authenticated test client under RLS
    const { client, userId } = await getAuthenticatedTestClient(TEST_USER_A)
    const { data: recipe } = await client
      .from('recipes')
      .insert({
        user_id: userId,
        title: `[${RUN_ID}] Penne all'Arrabbiata`,
        description: 'Spicy garlic tomato pasta',
        servings: 2,
        difficulty: 'easy',
      })
      .select()
      .single()

    createdRecipeId = recipe?.id ?? null
  })

  test.afterAll(async () => {
    // Deterministic namespaced teardown
    const { client } = await getAuthenticatedTestClient(TEST_USER_A)
    if (createdCollectionId) {
      await client.from('collection_recipes').delete().eq('collection_id', createdCollectionId)
      await client.from('collections').delete().eq('id', createdCollectionId)
    }
    if (createdRecipeId) {
      await client.from('recipes').delete().eq('id', createdRecipeId)
    }
  })

  test('Create collection and add recipe to it', async ({ page }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)

    // 1. Visit /collections
    await page.goto('/collections')
    await page.waitForLoadState('domcontentloaded')

    // 2. Open Create Collection dialog
    await page.click('button:has-text("New Collection")')

    const collectionName = `[${RUN_ID}] Italian Gems`
    await page.fill('input#col-name', collectionName)
    await page.fill('textarea#col-desc', 'Curated authentic pasta recipes')
    await page.click('button:has-text("Create Collection")')

    // 3. Verify collection appears on /collections
    const collectionCard = page.locator(`text=${collectionName}`).first()
    await expect(collectionCard).toBeVisible({ timeout: 10000 })

    // Find collection ID from link
    const collectionLink = page.locator(`a:has-text("${collectionName}")`).first()
    const href = await collectionLink.getAttribute('href')
    if (href) {
      createdCollectionId = href.split('/collections/')[1]?.split('?')[0] ?? null
    }

    // 4. Navigate to the seeded recipe detail page
    expect(createdRecipeId).toBeTruthy()
    await page.goto(`/recipes/${createdRecipeId}`)
    await page.waitForLoadState('domcontentloaded')

    // 5. Click "Add to Collection" button to open AddToCollectionDialog
    await page.click('button:has-text("Add to Collection")')

    // 6. Select the collection item to toggle assignment
    const collectionOption = page.locator(`button:has-text("${collectionName}")`)
    await expect(collectionOption).toBeVisible({ timeout: 8000 })
    await collectionOption.click()
    await page.waitForTimeout(1000)

    // Close dialog
    await page.keyboard.press('Escape')

    // 7. Navigate into the collection page
    await page.goto(`/collections/${createdCollectionId}`)
    await page.waitForLoadState('domcontentloaded')

    // Verify recipe is listed inside the collection
    await expect(page.locator(`text=[${RUN_ID}] Penne all'Arrabbiata`).first()).toBeVisible({
      timeout: 10000,
    })
  })
})
