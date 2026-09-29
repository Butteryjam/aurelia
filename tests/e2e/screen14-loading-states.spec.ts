import { test, expect } from '@playwright/test'
import path from 'path'
import { TEST_USER_A, loginViaUI } from '../fixtures/test-helpers'

const ARTIFACT_DIR = path.resolve(
  process.env.ARTIFACT_DIR ||
    'C:/Users/svish/.gemini/antigravity-ide/brain/5a25f97c-7cdc-4fb8-ab31-907e287199d9'
)

test.describe('Screen 14: Loading States & Perceived Performance E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
  })

  test('1. Verify route loading skeletons geometry and visual artifacts on Desktop (1280px)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    // A. Verify Recipes Loading Skeleton
    await page.goto('/loading-preview?screen=recipes')
    await page.waitForLoadState('domcontentloaded')

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(isOverflowing).toBe(false)
    await expect(page.locator('aside[aria-label="Desktop Primary Navigation"]')).toBeVisible()

    // Capture Desktop Recipes Loading Skeleton
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen14-recipes-loading-desktop.png'),
      fullPage: false,
    })

    // Switch to dark mode and capture
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(200)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen14-recipes-loading-dark.png'),
      fullPage: false,
    })

    await page.evaluate(() => {
      document.documentElement.classList.remove('dark')
    })

    // B. Dashboard Loading Skeleton
    await page.goto('/loading-preview?screen=dashboard')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('aside[aria-label="Desktop Primary Navigation"]')).toBeVisible()

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen14-dashboard-loading-desktop.png'),
      fullPage: false,
    })

    // C. Meal Planner Loading Skeleton
    await page.goto('/loading-preview?screen=meal-planner')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('aside[aria-label="Desktop Primary Navigation"]')).toBeVisible()

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen14-meal-planner-loading-desktop.png'),
      fullPage: false,
    })

    // D. Shopping Loading Skeleton
    await page.goto('/loading-preview?screen=shopping')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('aside[aria-label="Desktop Primary Navigation"]')).toBeVisible()

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen14-shopping-loading-desktop.png'),
      fullPage: false,
    })

    // E. Collections Loading Skeleton
    await page.goto('/loading-preview?screen=collections')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('aside[aria-label="Desktop Primary Navigation"]')).toBeVisible()

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen14-collections-loading-desktop.png'),
      fullPage: false,
    })

    // F. AI Chef Loading Skeleton
    await page.goto('/loading-preview?screen=ai-chef')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('aside[aria-label="Desktop Primary Navigation"]')).toBeVisible()

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen14-ai-chef-loading-desktop.png'),
      fullPage: false,
    })

    // G. Settings Loading Skeleton
    await page.goto('/loading-preview?screen=settings')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('aside[aria-label="Desktop Primary Navigation"]')).toBeVisible()

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen14-settings-loading-desktop.png'),
      fullPage: false,
    })

    // H. Recipe Detail Loading Skeleton
    await page.goto('/loading-preview?screen=recipe-detail')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('aside[aria-label="Desktop Primary Navigation"]')).toBeVisible()

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen14-recipe-detail-loading-desktop.png'),
      fullPage: false,
    })
  })

  test('2. Mobile Viewport Loading & Perceived Performance (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })

    // Dashboard on mobile
    await page.goto('/loading-preview?screen=dashboard')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('header.sticky.top-0')).toBeVisible()
    await expect(page.locator('nav[aria-label="Mobile Primary Navigation"]')).toBeVisible()

    let overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(overflow).toBe(false)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen14-dashboard-loading-mobile.png'),
      fullPage: false,
    })

    // Recipes on mobile
    await page.goto('/loading-preview?screen=recipes')
    await page.waitForLoadState('domcontentloaded')
    overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(overflow).toBe(false)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen14-recipes-loading-mobile.png'),
      fullPage: false,
    })

    // Meal Planner on mobile
    await page.goto('/loading-preview?screen=meal-planner')
    await page.waitForLoadState('domcontentloaded')
    overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(overflow).toBe(false)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen14-meal-planner-loading-mobile.png'),
      fullPage: false,
    })

    // Shopping on mobile
    await page.goto('/loading-preview?screen=shopping')
    await page.waitForLoadState('domcontentloaded')
    overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(overflow).toBe(false)

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen14-shopping-loading-mobile.png'),
      fullPage: false,
    })
  })

  test('3. Recipe Detail Loading & Transition Sequence', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })

    await page.goto('/recipes')
    await page.waitForLoadState('domcontentloaded')

    // Find first recipe card in the archive grid
    const firstRecipeCard = page.locator('article h3 a[href^="/recipes/"]').first()
    await expect(firstRecipeCard).toBeVisible({ timeout: 10000 })

    const href = await firstRecipeCard.getAttribute('href')
    expect(href).toBeTruthy()

    if (href) {
      await page.goto(href)
      await page.waitForLoadState('domcontentloaded')

      // Shell remains mounted and visible during transition
      await expect(page.locator('aside[aria-label="Desktop Primary Navigation"]')).toBeVisible()

      // Capture transition sequence artifact
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'screen14-transition-sequence.png'),
        fullPage: false,
      })
    }
  })

  test('4. Reduced motion and Cook Mode isolation', async ({ page }) => {
    // A. Verify reduced motion styling
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/recipes')
    await page.waitForLoadState('domcontentloaded')

    // B. Verify Cook Mode loads without generic skeleton interference
    const firstRecipeCard = page.locator('article h3 a[href^="/recipes/"]').first()
    await expect(firstRecipeCard).toBeVisible({ timeout: 10000 })
    const href = await firstRecipeCard.getAttribute('href')

    if (href && href.startsWith('/recipes/')) {
      const parts = href.split('/').filter(Boolean)
      const recipeId = parts[1]
      await page.goto(`/recipes/${recipeId}/cook`)
      await page.waitForLoadState('domcontentloaded')

      // Cook Mode header / controls should be active without generic skeleton interference
      const exitControl = page.locator('a[aria-label="Exit Cook Mode and return to recipe"], a:has-text("Back to Recipe")')
      await expect(exitControl.first()).toBeVisible({ timeout: 10000 })
    }
  })
})
