import { test, expect } from '@playwright/test'
import { TEST_USER_A, loginViaUI } from '../fixtures/test-helpers'

test.use({
  viewport: { width: 375, height: 812 },
})

test.describe('Mobile Navigation E2E (375px Viewport)', () => {
  test('Bottom mobile navigation bar renders and smoothly switches primary views', async ({
    page,
  }) => {
    // 1. Sign in as User A
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)

    // 2. Verify bottom navigation bar is visible
    const mobileNav = page.locator('nav.fixed.bottom-0')
    await expect(mobileNav).toBeVisible({ timeout: 10000 })

    // 3. Navigate to Recipes tab
    const recipesTab = mobileNav.locator('a[href="/recipes"]').first()
    await expect(recipesTab).toBeVisible()
    await recipesTab.click()
    await page.waitForURL((url) => url.pathname === '/recipes', { timeout: 10000 })
    await expect(page.locator('main h1', { hasText: 'Recipes' })).toBeVisible()

    // 4. Navigate to Meal Planner tab
    const mealPlannerTab = mobileNav.locator('a[href="/meal-planner"]').first()
    await expect(mealPlannerTab).toBeVisible()
    await mealPlannerTab.click()
    await page.waitForURL((url) => url.pathname === '/meal-planner', { timeout: 10000 })
    await expect(page.locator('main').locator('text=Meal Planner').first()).toBeVisible()

    // 5. Navigate to AI Chef tab
    const aiChefTab = mobileNav.locator('a[href="/ai-chef"]').first()
    await expect(aiChefTab).toBeVisible()
    await aiChefTab.click()
    await page.waitForURL((url) => url.pathname === '/ai-chef', { timeout: 10000 })
    await expect(page.locator('main').locator('text=AI Chef').first()).toBeVisible()

    // 6. Navigate to Shopping tab
    const shoppingTab = mobileNav.locator('a[href="/shopping"]').first()
    await expect(shoppingTab).toBeVisible()
    await shoppingTab.click()
    await page.waitForURL((url) => url.pathname === '/shopping', { timeout: 10000 })
    await expect(page.locator('main h1', { hasText: 'Shopping Lists' })).toBeVisible()

    // 7. Navigate back to Home dashboard tab
    await page.evaluate(() => {
      document.querySelectorAll('nextjs-portal').forEach((el) => el.remove())
    })
    const homeTab = mobileNav.locator('a[href="/"]').first()
    await expect(homeTab).toBeVisible()
    await homeTab.click()
    await page.waitForURL((url) => url.pathname === '/', { timeout: 10000 })
    await expect(page.locator('main').locator('text=Chef Alice').first()).toBeVisible()
  })
})
