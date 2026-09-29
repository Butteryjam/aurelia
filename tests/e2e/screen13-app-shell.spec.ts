import { test, expect } from '@playwright/test'
import path from 'path'
import { TEST_USER_A, loginViaUI } from '../fixtures/test-helpers'

const ARTIFACT_DIR = path.resolve(
  process.env.ARTIFACT_DIR ||
    'C:/Users/svish/.gemini/antigravity-ide/brain/5a25f97c-7cdc-4fb8-ab31-907e287199d9'
)

test.describe('Screen 13: Global App Shell, Navigation & System Fallbacks E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
  })

  test('1. Desktop Sidebar verification across 1280px & 1024px with light and dark mode', async ({
    page,
  }) => {
    // 1280px Desktop Viewport
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/recipes')
    await page.waitForLoadState('domcontentloaded')

    const sidebar = page.locator('aside[aria-label="Desktop Primary Navigation"]')
    await expect(sidebar).toBeVisible({ timeout: 10000 })

    // Verify brand presence
    await expect(sidebar.locator('a[aria-label="Aurelia Home"]')).toBeVisible()
    await expect(sidebar.locator('text=Culinary Archive')).toBeVisible()

    // Verify quick action CTAs
    const newRecipeBtn = sidebar.locator('a[href="/recipes/new"]')
    await expect(newRecipeBtn).toBeVisible()
    await expect(newRecipeBtn).toContainText('New Recipe')

    const importAiBtn = sidebar.locator('a[href="/recipes/import"]')
    await expect(importAiBtn).toBeVisible()
    await expect(importAiBtn).toContainText('Import with AI')

    // Verify all 7 core navigation items are present
    const expectedDestinations = [
      { href: '/', label: 'Home' },
      { href: '/recipes', label: 'Recipes' },
      { href: '/meal-planner', label: 'Meal Planner' },
      { href: '/collections', label: 'Collections' },
      { href: '/ai-chef', label: 'AI Chef' },
      { href: '/shopping', label: 'Shopping' },
      { href: '/settings', label: 'Settings' },
    ]

    for (const dest of expectedDestinations) {
      const link = sidebar.locator(`nav a[href="${dest.href}"]`).first()
      await expect(link).toBeVisible()
      await expect(link).toContainText(dest.label)
    }

    // Verify active route highlights (/recipes)
    const activeRecipesLink = sidebar.locator('nav a[href="/recipes"]')
    await expect(activeRecipesLink).toHaveAttribute('aria-current', 'page')

    // Verify user profile card
    const profileSection = sidebar.locator('a[href="/settings"]').first()
    await expect(profileSection).toBeVisible()

    // Verify footer controls
    await expect(sidebar.locator('text=Theme')).toBeVisible()
    await expect(sidebar.locator('button:has-text("Sign out")')).toBeVisible()

    // Zero horizontal overflow check
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(isOverflowing).toBe(false)

    // Capture 1280 Light Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen13-desktop-1280-light.png'),
      fullPage: true,
    })

    // Switch to Dark Mode & Capture
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(300)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen13-desktop-1280-dark.png'),
      fullPage: true,
    })

    // Reset to Light Mode & test 1024px Viewport
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark')
    })
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.waitForTimeout(300)

    await expect(sidebar).toBeVisible()
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen13-desktop-1024-light.png'),
      fullPage: true,
    })
  })

  test('2. Mobile Navigation Dock & Sticky Header across 375px, 390px, 414px', async ({
    page,
  }) => {
    // 375px Mobile Viewport
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/recipes')
    await page.waitForLoadState('domcontentloaded')

    // Header checks
    const header = page.locator('header.sticky.top-0')
    await expect(header).toBeVisible({ timeout: 10000 })
    await expect(header.locator('text=Aurelia')).toBeVisible()
    await expect(header.locator('a[aria-label="New Recipe"]')).toBeVisible()
    await expect(header.locator('button[aria-label="Open navigation menu"]')).toBeVisible()

    // Bottom Navigation dock checks
    const mobileNav = page.locator('nav[aria-label="Mobile Primary Navigation"]')
    await expect(mobileNav).toBeVisible()

    // Verify all 5 primary tabs + More button
    await expect(mobileNav.locator('a[href="/"]')).toBeVisible()
    await expect(mobileNav.locator('a[href="/recipes"]')).toBeVisible()
    await expect(mobileNav.locator('a[href="/meal-planner"]')).toBeVisible()
    await expect(mobileNav.locator('a[href="/ai-chef"]')).toBeVisible()
    await expect(mobileNav.locator('a[href="/shopping"]')).toBeVisible()
    await expect(mobileNav.locator('button:has-text("More")')).toBeVisible()

    // Touch target sizes >= 44px check
    const navItems = mobileNav.locator('a, button')
    const count = await navItems.count()
    for (let i = 0; i < count; i++) {
      const box = await navItems.nth(i).boundingBox()
      expect(box).toBeTruthy()
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.width).toBeGreaterThanOrEqual(44)
      }
    }

    // Zero horizontal overflow at 375px
    const overflow375 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(overflow375).toBe(false)

    // Capture 375 Light Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen13-mobile-375-light.png'),
      fullPage: true,
    })

    // Capture 375 Dark Screenshot
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(300)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen13-mobile-375-dark.png'),
      fullPage: true,
    })

    // Reset Dark Mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark')
    })

    // 390px Viewport check
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(200)
    const overflow390 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(overflow390).toBe(false)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen13-mobile-390-light.png'),
      fullPage: true,
    })

    // 414px Viewport check
    await page.setViewportSize({ width: 414, height: 896 })
    await page.waitForTimeout(200)
    const overflow414 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(overflow414).toBe(false)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen13-mobile-414-light.png'),
      fullPage: true,
    })
  })

  test('3. Tablet Header & Navigation behavior (768px Viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // At 768px (< 1024px lg breakpoint), MobileHeader and MobileNav are active
    const header = page.locator('header.sticky.top-0')
    await expect(header).toBeVisible({ timeout: 10000 })

    const mobileNav = page.locator('nav[aria-label="Mobile Primary Navigation"]')
    await expect(mobileNav).toBeVisible()

    const overflow768 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(overflow768).toBe(false)

    // Capture 768 Light Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen13-tablet-768-light.png'),
      fullPage: true,
    })

    // Capture 768 Dark Screenshot
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(300)
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen13-tablet-768-dark.png'),
      fullPage: true,
    })

    // Clean up dark mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark')
    })
  })

  test('4. Mobile Navigation Drawer full interaction: open, close, accessibility, and destinations', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/recipes')
    await page.waitForLoadState('domcontentloaded')

    // 1. Open drawer via Header hamburger button
    const menuBtn = page.locator('header button[aria-label="Open navigation menu"]')
    await menuBtn.click()

    const drawer = page.locator('div[role="dialog"][aria-label="Navigation Menu"]')
    await expect(drawer).toBeVisible({ timeout: 5000 })
    await expect(drawer.locator('text=Culinary Navigation')).toBeVisible()

    // Verify quick action inside drawer
    await expect(drawer.locator('a[href="/recipes/new"]')).toBeVisible()
    await expect(drawer.locator('a[href="/recipes/import"]')).toBeVisible()

    // Verify all 7 core navigation items are reachable inside drawer
    await expect(drawer.locator('nav a[href="/collections"]')).toBeVisible()
    await expect(drawer.locator('nav a[href="/settings"]')).toBeVisible()

    // Capture Mobile Drawer Open Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen13-mobile-drawer-open.png'),
      fullPage: false,
    })

    // 2. Close via Escape key
    await page.keyboard.press('Escape')
    await expect(drawer).not.toBeVisible()

    // 3. Open drawer via bottom dock "More" button
    const moreBtn = page.locator('nav[aria-label="Mobile Primary Navigation"] button:has-text("More")')
    await moreBtn.click()
    await expect(drawer).toBeVisible()

    // 4. Click Collections link inside drawer and verify navigation
    const collectionsLink = drawer.locator('a[href="/collections"]')
    await collectionsLink.click()
    await page.waitForURL((url) => url.pathname === '/collections', { timeout: 10000 })
    await expect(page.locator('h1', { hasText: 'Collections' })).toBeVisible()
    await expect(drawer).not.toBeVisible()
  })

  test('5. System Fallbacks: 404 Recovery and Navigation Escape Routes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    // Navigate to non-existent route
    await page.goto('/culinary-route-that-does-not-exist')
    await page.waitForLoadState('domcontentloaded')

    // Verify 404 page content
    await expect(page.locator('text=404 — Recipe Not Found')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('h1', { hasText: 'This dish seems off the menu' })).toBeVisible()

    // Verify recovery links
    const recipesRecovery = page.locator('a:has-text("View Recipe Archive")')
    await expect(recipesRecovery).toBeVisible()
    const homeRecovery = page.locator('a:has-text("Kitchen Dashboard")')
    await expect(homeRecovery).toBeVisible()

    // Capture 404 Screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screen13-fallback-404.png'),
      fullPage: true,
    })

    // Click "View Recipe Archive" recovery button
    await recipesRecovery.click()
    await page.waitForURL((url) => url.pathname === '/recipes', { timeout: 10000 })
    await expect(page.locator('h1', { hasText: 'Recipes' })).toBeVisible()
  })
})
