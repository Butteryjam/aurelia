import { test, expect } from '@playwright/test'
import {
  TEST_USER_A,
  loginViaUI,
  generateRunId,
  getAuthenticatedTestClient,
} from '../fixtures/test-helpers'

test.describe('AI Chef E2E (Recipe Focus & Interactive Chat Interface)', () => {
  const RUN_ID = generateRunId('ai_e2e')
  let createdRecipeId: string | null = null
  let createdConvId: string | null = null
  const recipeTitle = `[${RUN_ID}] Homemade Gnocchi`

  test.beforeAll(async () => {
    // Seed recipe using authenticated test client
    const { client, userId } = await getAuthenticatedTestClient(TEST_USER_A)

    const { data: recipe } = await client
      .from('recipes')
      .insert({
        user_id: userId,
        title: recipeTitle,
        description: 'Pillow-soft potato gnocchi with sage butter sauce',
        servings: 4,
        difficulty: 'medium',
      })
      .select()
      .single()

    createdRecipeId = recipe?.id ?? null

    // Seed conversation with structured Markdown response to verify end-to-end rendering
    const { data: conv } = await client
      .from('ai_conversations')
      .insert({
        user_id: userId,
        title: `[${RUN_ID}] Fried Chicken Chat`,
        recipe_id: createdRecipeId,
      })
      .select()
      .single()

    createdConvId = conv?.id ?? null

    if (createdConvId) {
      await client.from('ai_messages').insert([
        {
          conversation_id: createdConvId,
          role: 'user',
          content: 'How do I make buttermilk fried chicken?',
        },
        {
          conversation_id: createdConvId,
          role: 'assistant',
          content: `# Recipe\n\n**Prep time:** 30 mins\n\n## Ingredients\n\n- 3 lbs chicken\n- 2 cups buttermilk\n\n### Instructions\n\n1. Marinate the chicken.\n2. Prepare the coating.`,
        },
      ])
    }
  })

  test.afterAll(async () => {
    // Namespaced teardown
    const { client } = await getAuthenticatedTestClient(TEST_USER_A)
    if (createdConvId) {
      await client.from('ai_messages').delete().eq('conversation_id', createdConvId)
      await client.from('ai_conversations').delete().eq('id', createdConvId)
    }
    if (createdRecipeId) {
      await client.from('recipes').delete().eq('id', createdRecipeId)
    }
  })

  test('Ask Chef about a saved recipe displays focused recipe context banner and active chat input', async ({
    page,
  }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)

    // 1. Visit recipe detail page
    expect(createdRecipeId).toBeTruthy()
    await page.goto(`/recipes/${createdRecipeId}`)
    await page.waitForLoadState('domcontentloaded')

    // 2. Click "Ask Chef" button
    const askChefBtn = page.locator('a:has-text("Ask Chef"), button:has-text("Ask Chef")').first()
    await expect(askChefBtn).toBeVisible({ timeout: 10000 })
    await askChefBtn.click()

    // 3. Verifies redirect to /ai-chef?recipeId=...
    await page.waitForURL((url) => url.pathname.includes('/ai-chef'), { timeout: 15000 })
    expect(page.url()).toContain(`recipeId=${createdRecipeId}`)

    // 4. Verifies focused recipe banner appears with the recipe title
    const focusBanner = page.locator(`text=Focus: ${recipeTitle}`).first()
    await expect(focusBanner).toBeVisible({ timeout: 10000 })

    // 5. Verifies chat input textarea is present and enabled
    const chatInput = page.locator('textarea[placeholder*="Ask Chef"]').first()
    await expect(chatInput).toBeVisible()
    await expect(chatInput).toBeEnabled()
  })

  test('AI Chef renders formatted Markdown responses (headings, lists, bold) without raw syntax characters and with zero hydration errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (text.includes('Hydration') || text.includes('hydrating') || text.includes('did not match')) {
          consoleErrors.push(text)
        }
      }
    })

    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
    expect(createdConvId).toBeTruthy()

    await page.goto(`/ai-chef?c=${createdConvId}`)
    await page.waitForLoadState('domcontentloaded')

    // 1. Verify semantic heading elements exist and render formatted text
    const h1 = page.locator('h1', { hasText: 'Recipe' }).first()
    await expect(h1).toBeVisible({ timeout: 10000 })

    const h2 = page.locator('h2', { hasText: 'Ingredients' }).first()
    await expect(h2).toBeVisible({ timeout: 10000 })

    const h3 = page.locator('h3', { hasText: 'Instructions' }).first()
    await expect(h3).toBeVisible({ timeout: 10000 })

    // 2. Verify bold formatting
    const boldPrep = page.locator('strong', { hasText: 'Prep time:' }).first()
    await expect(boldPrep).toBeVisible({ timeout: 10000 })

    // 3. Verify unordered list items
    const chickenLi = page.locator('ul li', { hasText: '3 lbs chicken' }).first()
    await expect(chickenLi).toBeVisible({ timeout: 10000 })
    const buttermilkLi = page.locator('ul li', { hasText: '2 cups buttermilk' }).first()
    await expect(buttermilkLi).toBeVisible({ timeout: 10000 })

    // 4. Verify ordered list items
    const marinateLi = page.locator('ol li', { hasText: 'Marinate the chicken.' }).first()
    await expect(marinateLi).toBeVisible({ timeout: 10000 })
    const coatLi = page.locator('ol li', { hasText: 'Prepare the coating.' }).first()
    await expect(coatLi).toBeVisible({ timeout: 10000 })

    // 5. Verify raw markdown delimiter strings are NOT visible as raw text
    const rawH1 = page.locator('text="# Recipe"')
    await expect(rawH1).toHaveCount(0)

    const rawBold = page.locator('text="**Prep time:**"')
    await expect(rawBold).toHaveCount(0)

    const rawLi = page.locator('text="- 3 lbs chicken"')
    await expect(rawLi).toHaveCount(0)

    // 6. Confirm no hydration errors occurred
    expect(consoleErrors).toHaveLength(0)
  })
})
