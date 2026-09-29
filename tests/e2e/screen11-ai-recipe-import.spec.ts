import { test, expect } from '@playwright/test'
import path from 'path'
import { TEST_USER_A, loginViaUI } from '../fixtures/test-helpers'

const ARTIFACTS_DIR = 'C:/Users/svish/.gemini/antigravity-ide/brain/5a25f97c-7cdc-4fb8-ab31-907e287199d9'

test.describe('Screen 11: AI Recipe Import Refinement E2E & Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate test user
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
  })

  test('1. Initial import state across viewports, dark mode, and zero horizontal overflow', async ({ page }) => {
    await page.goto('/recipes/import')
    await page.waitForLoadState('domcontentloaded')

    // 1. Verify Page Header and Editorial copy
    await expect(page.locator('h1:has-text("Import Recipe")')).toBeVisible()
    await expect(page.locator('text=Private & Editable')).toBeVisible()
    await expect(page.locator('text=Back to recipes')).toBeVisible()

    // 2. Verify Tablist
    const tablist = page.locator('div[role="tablist"]')
    await expect(tablist).toBeVisible()
    const textTab = page.locator('#tab-text')
    const imageTab = page.locator('#tab-image')
    await expect(textTab).toBeVisible()
    await expect(imageTab).toBeVisible()
    await expect(textTab).toHaveAttribute('aria-selected', 'true')

    // 3. Desktop 1280 Light Screenshot
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.waitForTimeout(300)
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screen11-import-1280-light.png'),
      fullPage: true,
    })

    // 4. Desktop 1280 Dark Mode
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(300)
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screen11-import-1280-dark.png'),
      fullPage: true,
    })

    // 5. Tablet 768px
    await page.emulateMedia({ colorScheme: 'light' })
    await page.evaluate(() => document.documentElement.classList.remove('dark'))
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(300)

    const tabletOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
    expect(tabletOverflow).toBe(false)

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screen11-import-768-tablet.png'),
      fullPage: true,
    })

    // 6. Mobile 375px Light
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(300)

    const mobileOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
    expect(mobileOverflow).toBe(false)

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screen11-import-375-mobile-light.png'),
      fullPage: true,
    })

    // 7. Mobile 375px Dark
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(300)

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screen11-import-375-mobile-dark.png'),
      fullPage: true,
    })
  })

  test('2. Text import interaction: sample text, character count, clear button, and accessible controls', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/recipes/import')
    await page.waitForLoadState('domcontentloaded')

    const textarea = page.locator('#recipe-text-input')
    const extractBtn = page.locator('button:has-text("Extract Recipe")')

    // Initially empty and extract button is disabled
    await expect(textarea).toBeEmpty()
    await expect(extractBtn).toBeDisabled()

    // Click "Try sample recipe"
    const sampleBtn = page.locator('button:has-text("Try sample recipe")')
    await sampleBtn.click()

    // Verify textarea populated with sample recipe text
    await expect(textarea).not.toBeEmpty()
    await expect(page.locator('text=Tuscan White Bean')).toBeVisible()

    // Character count displayed
    await expect(page.locator('text=characters')).toBeVisible()

    // Clear button visible
    const clearBtn = page.locator('button:has-text("Clear")')
    await expect(clearBtn).toBeVisible()

    // Extract button now enabled
    await expect(extractBtn).toBeEnabled()

    // Capture screenshot of populated text import
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screen11-text-import-populated.png'),
      fullPage: false,
    })

    // Click clear button and verify reset
    await clearBtn.click()
    await expect(textarea).toBeEmpty()
    await expect(extractBtn).toBeDisabled()
  })

  test('3. Image upload dropzone, format badges, and image selection preview state', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/recipes/import')
    await page.waitForLoadState('domcontentloaded')

    // Switch to Upload Photo tab
    const imageTab = page.locator('#tab-image')
    await imageTab.click()
    await expect(imageTab).toHaveAttribute('aria-selected', 'true')

    // Verify dropzone and format badges
    await expect(page.locator('text=Drop your recipe photo here or browse')).toBeVisible()
    await expect(page.locator('text=JPEG')).toBeVisible()
    await expect(page.locator('text=PNG')).toBeVisible()
    await expect(page.locator('text=WebP')).toBeVisible()
    await expect(page.locator('text=Up to 8 MB')).toBeVisible()

    // Capture image dropzone state
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screen11-image-upload-zone.png'),
      fullPage: false,
    })

    // Set an image file into the hidden input
    const fileInput = page.locator('#recipe-image-file-input')
    const sampleBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
    await fileInput.setInputFiles({
      name: 'grandmas-recipe-card.png',
      mimeType: 'image/png',
      buffer: sampleBuffer,
    })

    // Verify preview card appears
    await expect(page.locator('text=grandmas-recipe-card.png')).toBeVisible()
    await expect(page.locator('button:has-text("Change Photo")')).toBeVisible()
    await expect(page.locator('button:has-text("Extract Recipe")')).toBeVisible()

    // Capture image selected state
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screen11-image-selected-state.png'),
      fullPage: false,
    })
  })

  test('4. Structured recipe preview: unsaved draft badge, basic info, ingredients, instructions, tags, and cross-reference photo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/recipes/import?preview=demo')
    await page.waitForLoadState('domcontentloaded')

    // 1. Verify Unsaved Preview Badge & Editorial Title
    await expect(page.getByText('Unsaved Preview', { exact: true })).toBeVisible()
    await expect(page.locator('text=AI Imported')).toBeVisible()
    await expect(page.locator('h2:has-text("Recipe Preview")')).toBeVisible()

    // 2. Verify Original Photo Reference
    await expect(page.locator('text=Original Photo Reference')).toBeVisible()
    const togglePhotoBtn = page.locator('button:has-text("Hide Photo")')
    await expect(togglePhotoBtn).toBeVisible()

    // 3. Verify Basic Information fields
    const titleInput = page.locator('#preview-title')
    await expect(titleInput).toHaveValue("Grandma's Rustic Tuscan White Bean Soup")
    await expect(page.locator('#preview-prep')).toHaveValue('15')
    await expect(page.locator('#preview-cook')).toHaveValue('30')
    await expect(page.locator('#preview-servings')).toHaveValue('4')
    await expect(page.locator('#preview-cuisine')).toHaveValue('Tuscan')
    await expect(page.locator('#preview-category')).toHaveValue('Soup')

    // 4. Verify Ingredients section
    await expect(page.locator('text=Ingredients (8)')).toBeVisible()
    await expect(page.locator('input[value="cannellini beans"]').first()).toBeVisible()
    await expect(page.locator('input[value="yellow onion"]').first()).toBeVisible()
    await expect(page.locator('button:has-text("Add Ingredient")')).toBeVisible()

    // 5. Verify Instructions section
    await expect(page.locator('text=Cooking Instructions (5 steps)')).toBeVisible()
    await expect(page.locator('textarea:has-text("Warm olive oil in a heavy Dutch oven")')).toBeVisible()
    await expect(page.locator('button:has-text("Add Step")')).toBeVisible()

    // 6. Verify Tags section
    await expect(page.locator('text=#tuscan')).toBeVisible()
    await expect(page.locator('text=#beans')).toBeVisible()

    // 7. Verify Sticky Bottom Bar
    await expect(page.locator('text=Unsaved preview — changes will not persist until saved')).toBeVisible()
    await expect(page.locator('button:has-text("Save to Cookbook")').first()).toBeVisible()

    // Capture desktop structured preview screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screen11-extraction-preview-1280.png'),
      fullPage: true,
    })

    // Test Mobile 375px for Structured Preview
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(300)

    const mobilePreviewOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth)
    expect(mobilePreviewOverflow).toBe(false)

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screen11-preview-375-mobile.png'),
      fullPage: true,
    })
  })

  test('5. Discard confirmation dialog and return to clean import workspace', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/recipes/import?preview=demo')
    await page.waitForLoadState('domcontentloaded')

    // Click Discard in header
    const discardBtn = page.locator('button:has-text("Discard")').first()
    await discardBtn.click()

    // Verify Discard Dialog opens
    await expect(page.locator('text=Discard extracted recipe?')).toBeVisible()
    await expect(
      page.locator('text=Any adjustments or additions you made to this extracted recipe will be lost.')
    ).toBeVisible()
    await expect(page.locator('button:has-text("Keep Editing")')).toBeVisible()
    await expect(page.locator('button:has-text("Discard Recipe")')).toBeVisible()

    // Capture Discard Dialog screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screen11-discard-dialog.png'),
      fullPage: false,
    })

    // Click Discard Recipe
    await page.locator('button:has-text("Discard Recipe")').click()

    // Verify returned to Recipe Importer
    await expect(page.locator('h1:has-text("Import Recipe")')).toBeVisible()
    await expect(page.locator('#tab-text')).toBeVisible()
  })

  test('6. Extraction loading and error handling displays calm, accessible status and alert notices', async ({ page }) => {
    test.setTimeout(75000)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/recipes/import')
    await page.waitForLoadState('domcontentloaded')

    // Simulate entering recipe text
    const textarea = page.locator('#recipe-text-input')
    await textarea.fill('Non-recipe random text string that will trigger extraction')

    // Click extract button
    const extractBtn = page.locator('button:has-text("Extract Recipe")')
    await extractBtn.click()

    // 1. Capture extraction loading state
    const loadingStatus = page.locator('div[role="status"]')
    try {
      await expect(loadingStatus).toBeVisible({ timeout: 4000 })
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'screen11-extraction-loading.png'),
        fullPage: false,
      })
    } catch {
      // If server responded very fast or offline, continue
    }

    // 2. Wait for error alert to appear (allow candidate failover budget of 2x24s to complete)
    const alert = page.locator('div[role="alert"]:not(#__next-route-announcer__)')
    await expect(alert).toBeVisible({ timeout: 60000 })
    await expect(alert).toContainText('Unable to Extract Recipe')

    // Capture error state screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screen11-error-state.png'),
      fullPage: false,
    })
  })

  test('7. Save extracted recipe end-to-end creates recipe and redirects to recipe detail', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/recipes/import?preview=demo')
    await page.waitForLoadState('domcontentloaded')

    // Customize the title with a timestamp to verify persistence
    const uniqueTitle = `[E2E Import ${Date.now()}] Tuscan White Bean Soup`
    const titleInput = page.locator('#preview-title')
    await titleInput.fill(uniqueTitle)

    // Click Save to Cookbook
    const saveBtn = page.locator('button:has-text("Save to Cookbook")').first()
    await saveBtn.click()

    // Verify redirect to /recipes/[id] (not /recipes/import)
    await page.waitForURL((url) => url.pathname.startsWith('/recipes/') && !url.pathname.includes('/import'), {
      timeout: 20000,
    })
    expect(page.url()).not.toContain('/recipes/import')

    // Verify recipe detail page displays the saved recipe h1
    await expect(page.locator(`h1:has-text("${uniqueTitle}")`)).toBeVisible({ timeout: 15000 })

    // Capture save confirmation screenshot on recipe detail page
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'screen11-save-confirmation.png'),
      fullPage: false,
    })
  })
})
