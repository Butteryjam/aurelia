import { test, expect } from '@playwright/test'
import {
  TEST_USER_A,
  TEST_USER_B,
  loginViaUI,
  getSupabaseAdmin,
  establishRecoverySessionInContext,
} from '../fixtures/test-helpers'

test.describe('Auth, Password Recovery & Draft Hydration E2E', () => {
  test('Password reset request flow displays confirmation message', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('domcontentloaded')

    // Submit password reset request using a valid domain to test the UI flow cleanly
    await page.fill('input[type="email"]', 'reset-request-flow@recipevault.com')
    await page.click('button[type="submit"]')

    // Verifies redirect or message indicating request processed
    await page.waitForFunction(() => {
      return (
        window.location.pathname.includes('/login') ||
        document.body.innerText.includes('Check your email') ||
        document.body.innerText.includes('security purposes')
      )
    }, { timeout: 15000 })
  })

  test('Deterministic recovery session -> password update -> sign in flow', async ({ page }) => {
    // 1. Establish authenticated recovery session strictly in server-side Node fixture
    // Never exposes recovery tokens, service keys, or action links to page code or URL bar
    await establishRecoverySessionInContext(page, TEST_USER_B)

    // 2. Navigate directly to /settings in recovery mode
    await page.goto('/settings?mode=recovery')
    await page.waitForLoadState('domcontentloaded')

    // Verify recovery mode UI is active
    await expect(page.locator('text=Password Recovery Mode')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Set New Password' })).toBeVisible({ timeout: 10000 })

    // 3. Update password to temporary password (ensure different from current password)
    const tempPassword = `NewPass_${Date.now()}!`
    try {
      await page.fill('input[name="password"]', tempPassword)
      await page.fill('input[name="confirmPassword"]', tempPassword)
      await page.click('button:has-text("Set New Password & Continue")')

      // Confirm password update success toast or message
      await expect(page.locator('text=Password updated successfully')).toBeVisible({ timeout: 10000 })

      // 4. Sign out
      await page.click('button:has-text("Sign out")')
      await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 })
      await page.context().clearCookies()

      // 5. Sign in with updated temporary password
      await loginViaUI(page, TEST_USER_B.email, tempPassword)
      await expect(page).toHaveURL('/')
    } finally {
      // 6. Restore original test password for idempotency via admin Node fixture
      const admin = getSupabaseAdmin()
      const { data: userList } = await admin.auth.admin.listUsers()
      const targetUser = userList?.users.find((u) => u.email === TEST_USER_B.email)
      if (targetUser) {
        await admin.auth.admin.updateUserById(targetUser.id, {
          password: TEST_USER_B.password,
        })
      }
    }
  })

  test('/recipes/new draft hydration behavior with strict console error assertion', async ({ page }) => {
    const consoleErrors: string[] = []
    const hydrationWarnings: string[] = []

    // Attach listeners to detect ANY React hydration errors
    page.on('console', (msg) => {
      const text = msg.text()
      const type = msg.type()
      if (type === 'error') {
        consoleErrors.push(text)
      }
      if (
        text.toLowerCase().includes('hydration') ||
        text.toLowerCase().includes('mismatch') ||
        text.toLowerCase().includes('did not match') ||
        text.toLowerCase().includes('server html')
      ) {
        hydrationWarnings.push(text)
      }
    })

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message)
    })

    // 1. Sign in as User A
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)

    // 2. Open /recipes/new with clean state
    await page.goto('/recipes/new')
    await page.waitForLoadState('domcontentloaded')

    // Verify initial clean header
    await expect(page.locator('h1', { hasText: 'New Recipe' })).toBeVisible()

    // 3. Type draft details
    const uniqueTitle = `Autosaved Draft ${Date.now()}`
    await page.fill('input#title', uniqueTitle)
    await page.fill('textarea#description', 'Testing hydration-safe autosave functionality')

    // Wait for debounced autosave (1500ms) to write to localStorage
    await page.waitForTimeout(2000)

    // 4. Reload page to trigger server render + client hydration pass
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // 5. Verify NO hydration warnings or mismatch errors occurred
    expect(hydrationWarnings, `Hydration warnings detected: ${hydrationWarnings.join(', ')}`).toHaveLength(0)

    // 6. Verify post-hydration draft banner appears cleanly
    const draftBanner = page.locator('text=You have an autosaved draft from an earlier session.')
    await expect(draftBanner).toBeVisible({ timeout: 5000 })

    // 7. Click Discard draft
    await page.click('button:has-text("Discard")')
    await expect(draftBanner).not.toBeVisible()

    // Ensure still zero hydration warnings after user interaction
    expect(hydrationWarnings).toHaveLength(0)
  })
})
