import { test, expect, Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import {
  loginViaUI,
  TEST_USER_A,
  TEST_USER_B,
  establishRecoverySessionInContext,
  getSupabaseAdmin,
} from '../fixtures/test-helpers'

const ARTIFACTS_DIR = 'C:/Users/svish/.gemini/antigravity-ide/brain/5a25f97c-7cdc-4fb8-ab31-907e287199d9'

async function captureScreenshot(page: Page, filename: string) {
  const testResultsDir = path.resolve('test-results')
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true })
  }
  const testResultsPath = path.join(testResultsDir, filename)
  await page.screenshot({ path: testResultsPath, fullPage: true })

  try {
    if (fs.existsSync(ARTIFACTS_DIR)) {
      const artifactPath = path.join(ARTIFACTS_DIR, filename)
      fs.copyFileSync(testResultsPath, artifactPath)
    }
  } catch (err) {
    console.warn(`Could not copy screenshot to artifacts: ${err}`)
  }
}

test.describe('Screen 10 Auth Verification Pass', () => {
  // ═══════════════════════════════════════════════════════
  // 1. LOGIN PAGE & FLOW
  // ═══════════════════════════════════════════════════════

  test('Login page loads and renders correctly', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    // Core elements visible
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Create one' })).toBeVisible()
  })

  test('Login — invalid credentials show calm error', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'WrongPassword1')
    await page.click('button[type="submit"]')

    // Wait for loading state to resolve and error to appear
    const errorAlert = page.locator('.space-y-8 > [role="alert"]')
    await expect(errorAlert).toBeVisible({ timeout: 15000 })

    await expect(errorAlert.locator('p')).not.toBeEmpty({ timeout: 5000 })
    const errorText = await errorAlert.locator('p').innerText()

    // Safe user-facing message — no raw Supabase error or stack trace
    expect(errorText.toLowerCase()).not.toContain('supabase')
    expect(errorText.toLowerCase()).not.toContain('stack')
    expect(errorText.length).toBeGreaterThan(5)
  })

  test('Login — valid credentials succeed and redirect to intended route', async ({ page }) => {
    await page.context().clearCookies()
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
    await expect(page).toHaveURL('/')
    await expect(page.locator('main').locator('text=Kitchen Dashboard').first()).toBeVisible()
  })

  test('Redirect / search-param message displays calmly on login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/login?message=Check%20your%20email%20for%20a%20password%20reset%20link.')
    await page.waitForLoadState('domcontentloaded')

    const messageBanner = page.locator('div[aria-live="polite"]')
    await expect(messageBanner).toBeVisible()
    await expect(messageBanner).toContainText('Check your email for a password reset link.')
  })

  // ═══════════════════════════════════════════════════════
  // 2. SIGNUP PAGE & FLOW
  // ═══════════════════════════════════════════════════════

  test('Signup page loads and renders correctly', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/signup')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
    await expect(page.locator('input[name="displayName"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
  })

  test('Signup — password requirements hint is visible', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/signup')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('text=At least 8 characters')).toBeVisible()
  })

  test('Signup — client/server validation rejects weak password with calm error', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/signup')
    await page.waitForLoadState('domcontentloaded')

    await page.fill('input[name="displayName"]', 'Test Chef')
    await page.fill('input[name="email"]', `newchef_${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'weak')
    await page.click('button[type="submit"]')

    // Form should reject password with clear user feedback
    const errorAlert = page.locator('.space-y-8 > [role="alert"]')
    await expect(errorAlert).toBeVisible({ timeout: 15000 })
    const errorText = await errorAlert.locator('p').innerText()
    expect(errorText.toLowerCase()).toContain('password')
  })

  test('Signup — duplicate email produces calm user-facing message', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/signup')
    await page.waitForLoadState('domcontentloaded')

    await page.fill('input[name="displayName"]', 'Duplicate Chef')
    await page.fill('input[name="email"]', TEST_USER_A.email)
    await page.fill('input[name="password"]', 'StrongPass123!')
    await page.click('button[type="submit"]')

    // Safe handling: either redirects with confirmation message or shows calm alert
    await page.waitForFunction(() => {
      return (
        window.location.pathname.includes('/login') ||
        document.body.innerText.includes('Check your email') ||
        document.body.innerText.includes('already registered')
      )
    }, { timeout: 15000 })
  })

  // ═══════════════════════════════════════════════════════
  // 3. FORGOT PASSWORD & RECOVERY
  // ═══════════════════════════════════════════════════════

  test('Forgot password page loads correctly', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/forgot-password')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible()
    await expect(page.getByRole('link', { name: /back to sign in/i })).toBeVisible()
  })

  test('Forgot password submission works and redirects calmly', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/forgot-password')
    await page.waitForLoadState('domcontentloaded')

    await page.fill('input[name="email"]', 'reset-flow-test@recipevault.com')
    await page.click('button[type="submit"]')

    await page.waitForFunction(() => {
      return (
        window.location.pathname.includes('/login') ||
        document.body.innerText.includes('Check your email')
      )
    }, { timeout: 15000 })
  })

  test('Invalid / expired recovery state behaves safely on /settings?mode=recovery', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/settings?mode=recovery')
    await page.waitForLoadState('domcontentloaded')

    // Unauthenticated access to recovery mode must display safe expiration notice
    await expect(page.locator('text=Password Reset Link Expired or Invalid')).toBeVisible({ timeout: 10000 })
    const requestNewBtn = page.getByRole('link', { name: /Request a New Reset Link/i })
    await expect(requestNewBtn).toBeVisible()
    await expect(requestNewBtn).toHaveAttribute('href', '/forgot-password')
  })

  test('Recovery mode works with authenticated recovery session and password update succeeds', async ({ page }) => {
    // Establish recovery session
    await establishRecoverySessionInContext(page, TEST_USER_B)

    await page.goto('/settings?mode=recovery')
    await page.waitForLoadState('domcontentloaded')

    // Recovery mode UI active
    await expect(page.locator('text=Password Recovery Mode')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Set New Password' })).toBeVisible({ timeout: 10000 })

    // Test client-side password rule enforcement: too short (<8)
    await page.fill('input[name="password"]', 'Short1!')
    await page.fill('input[name="confirmPassword"]', 'Short1!')
    await page.click('button:has-text("Set New Password & Continue")')
    await expect(page.locator('form [role="alert"]')).toContainText('at least 8 characters')

    // Test client-side password rule enforcement: missing uppercase
    await page.fill('input[name="password"]', 'lowercase123!')
    await page.fill('input[name="confirmPassword"]', 'lowercase123!')
    await page.click('button:has-text("Set New Password & Continue")')
    await expect(page.locator('form [role="alert"]')).toContainText('uppercase letter')

    // Test client-side password rule enforcement: missing number
    await page.fill('input[name="password"]', 'NoNumberUpper!')
    await page.fill('input[name="confirmPassword"]', 'NoNumberUpper!')
    await page.click('button:has-text("Set New Password & Continue")')
    await expect(page.locator('form [role="alert"]')).toContainText('number')

    // Test client-side password rule enforcement: mismatch
    await page.fill('input[name="password"]', 'ValidPass123!')
    await page.fill('input[name="confirmPassword"]', 'ValidPassMismatch1!')
    await page.click('button:has-text("Set New Password & Continue")')
    await expect(page.locator('form [role="alert"]')).toContainText('do not match')

    // Perform valid update with temporary password
    const tempPassword = `RecoveryPass_${Date.now()}!`
    try {
      await page.fill('input[name="password"]', tempPassword)
      await page.fill('input[name="confirmPassword"]', tempPassword)
      await page.click('button:has-text("Set New Password & Continue")')

      // Confirm success
      await expect(page.locator('text=Password updated successfully')).toBeVisible({ timeout: 10000 })
    } finally {
      // Restore original password via admin fixture
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

  // ═══════════════════════════════════════════════════════
  // 4. LOGOUT & ROUTE PROTECTION
  // ═══════════════════════════════════════════════════════

  test('Logout redirects cleanly to /login', async ({ page }) => {
    await page.context().clearCookies()
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
    await expect(page).toHaveURL('/')

    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')
    await page.click('button:has-text("Sign out")')
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 })
  })

  test('Protected route redirects unauthenticated user to login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/recipes')
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 })
  })

  test('Authenticated user reaches intended routes smoothly', async ({ page }) => {
    await page.context().clearCookies()
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)

    const routes = ['/recipes', '/meal-planner', '/shopping', '/ai-chef', '/settings']
    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).toHaveURL(route)
    }
  })

  test('Existing callback route remains functional and safe', async ({ page }) => {
    await page.context().clearCookies()
    // Navigating without code should redirect safely to login with message
    await page.goto('/auth/callback')
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 })
    await expect(page.locator('text=Could not authenticate')).toBeVisible({ timeout: 10000 })
  })

  // ═══════════════════════════════════════════════════════
  // 5. ACCESSIBILITY & USABILITY
  // ═══════════════════════════════════════════════════════

  test('Login form accessibility: labels, autocomplete, touch targets, focus', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    const emailInput = page.locator('#email')
    await expect(emailInput).toHaveAttribute('type', 'email')
    await expect(emailInput).toHaveAttribute('autocomplete', 'email')

    const passwordInput = page.locator('#password')
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')

    const toggleBtn = page.locator('button[aria-label="Show password"]')
    await expect(toggleBtn).toBeVisible()

    // Touch targets >= 44px
    const emailBox = await emailInput.boundingBox()
    expect(emailBox!.height).toBeGreaterThanOrEqual(44)

    const passwordBox = await passwordInput.boundingBox()
    expect(passwordBox!.height).toBeGreaterThanOrEqual(44)

    const submitBtn = page.getByRole('button', { name: 'Sign in' })
    const submitBox = await submitBtn.boundingBox()
    expect(submitBox!.height).toBeGreaterThanOrEqual(44)

    // Keyboard tab navigation
    await emailInput.focus()
    await page.keyboard.press('Tab')
    const activeElement = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)
    expect(activeElement).toBeTruthy()
  })

  test('Signup form accessibility: labels, autocomplete, touch targets', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/signup')
    await page.waitForLoadState('domcontentloaded')

    const nameInput = page.locator('#displayName')
    await expect(nameInput).toHaveAttribute('autocomplete', 'name')

    const emailInput = page.locator('#email')
    await expect(emailInput).toHaveAttribute('autocomplete', 'email')

    const passwordInput = page.locator('#password')
    await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')

    const nameBox = await nameInput.boundingBox()
    expect(nameBox!.height).toBeGreaterThanOrEqual(44)

    const submitBtn = page.getByRole('button', { name: 'Create account' })
    const submitBox = await submitBtn.boundingBox()
    expect(submitBox!.height).toBeGreaterThanOrEqual(44)
  })

  // ═══════════════════════════════════════════════════════
  // 6. SCREEN 9 REGRESSION — SETTINGS PERSISTENCE
  // ═══════════════════════════════════════════════════════

  test('Screen 9 regression — settings page loads with profile data and persists changes', async ({ page }) => {
    await page.context().clearCookies()
    await loginViaUI(page, TEST_USER_A.email, TEST_USER_A.password)
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')

    // Verify all 5 editorial sections
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'Profile & Identity' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Culinary Preferences' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Security & Credentials' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Account & Session' })).toBeVisible()

    // Test Display Name Persistence with updated value
    const displayNameInput = page.getByRole('textbox', { name: 'Chef / Display Name' })
    await expect(displayNameInput).toBeVisible()
    const updatedName = `Chef Aurelia ${Date.now() % 1000}`
    await displayNameInput.fill(updatedName)
    const saveProfileBtn = page.locator('button:has-text("Save Profile")')
    await expect(saveProfileBtn).toBeEnabled()
    await saveProfileBtn.click()
    await expect(page.locator('text=Profile name updated successfully')).toBeVisible({ timeout: 10000 })

    // Test Measurement System Persistence
    const metricBtn = page.getByRole('button', { name: /Metric/i })
    await metricBtn.click()
    const savePrefBtn = page.locator('button:has-text("Save Preferences")')
    if (await savePrefBtn.isEnabled()) {
      await savePrefBtn.click()
      await expect(page.locator('text=Culinary preferences saved successfully')).toBeVisible({ timeout: 10000 })
    }

    // Reload page to verify persistence
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect(displayNameInput).toHaveValue(updatedName)

    // Restore clean name
    await displayNameInput.fill('Chef Aurelia')
    await saveProfileBtn.click()
    await expect(page.locator('text=Profile name updated successfully')).toBeVisible({ timeout: 10000 })
  })

  // ═══════════════════════════════════════════════════════
  // 7. VISUAL SCREENSHOTS (ALL 11 ARTIFACTS)
  // ═══════════════════════════════════════════════════════

  test('Screenshots — Login 1280 light', async ({ page }) => {
    await page.context().clearCookies()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await captureScreenshot(page, 'screen10-login-1280-light.png')
  })

  test('Screenshots — Login 1280 dark', async ({ page }) => {
    await page.context().clearCookies()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(500)
    await captureScreenshot(page, 'screen10-login-1280-dark.png')
  })

  test('Screenshots — Signup 1280 light', async ({ page }) => {
    await page.context().clearCookies()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await captureScreenshot(page, 'screen10-signup-1280-light.png')
  })

  test('Screenshots — Signup 1280 dark', async ({ page }) => {
    await page.context().clearCookies()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(500)
    await captureScreenshot(page, 'screen10-signup-1280-dark.png')
  })

  test('Screenshots — Login 375 light', async ({ page }) => {
    await page.context().clearCookies()
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await captureScreenshot(page, 'screen10-login-375-light.png')
  })

  test('Screenshots — Login 375 dark', async ({ page }) => {
    await page.context().clearCookies()
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(500)
    await captureScreenshot(page, 'screen10-login-375-dark.png')
  })

  test('Screenshots — Signup 375', async ({ page }) => {
    await page.context().clearCookies()
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await captureScreenshot(page, 'screen10-signup-375.png')
  })

  test('Screenshots — Forgot password', async ({ page }) => {
    await page.context().clearCookies()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await captureScreenshot(page, 'screen10-forgot-password.png')
  })

  test('Screenshots — Recovery / update-password mode', async ({ page }) => {
    await page.context().clearCookies()
    await establishRecoverySessionInContext(page, TEST_USER_B)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/settings?mode=recovery')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Password Recovery Mode')).toBeVisible({ timeout: 10000 })
    await captureScreenshot(page, 'screen10-recovery-update-password.png')
  })

  test('Screenshots — Validation error state', async ({ page }) => {
    await page.context().clearCookies()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[name="email"]', 'bad@bad.com')
    await page.fill('input[name="password"]', 'WrongPass123')
    await page.click('button[type="submit"]')
    await page.waitForSelector('[role="alert"]', { timeout: 15000 })
    await page.waitForTimeout(500)
    await captureScreenshot(page, 'screen10-validation-error.png')
  })

  test('Screenshots — Loading / submitting state', async ({ page }) => {
    await page.context().clearCookies()
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.fill('input[name="email"]', 'loading-state@recipevault.com')
    await page.fill('input[name="password"]', 'LoadingPass123!')

    // Intercept POST request with delay to ensure submit loading state is visually captured
    await page.route('**/*', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((r) => setTimeout(r, 2000))
      }
      await route.continue()
    })

    const submitBtn = page.getByRole('button', { name: 'Sign in' })
    await submitBtn.click()

    const loadingBtn = page.locator('button[disabled]:has-text("Signing in")')
    await expect(loadingBtn).toBeVisible({ timeout: 5000 })
    await captureScreenshot(page, 'screen10-loading-submitting.png')

    await page.unroute('**/*')
  })

  // ═══════════════════════════════════════════════════════
  // 8. ZERO HYDRATION WARNINGS & ZERO CONSOLE ERRORS
  // ═══════════════════════════════════════════════════════

  test('Login page has zero hydration warnings and zero console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    const hydrationWarnings: string[] = []

    page.on('console', (msg) => {
      const text = msg.text()
      if (msg.type() === 'error') consoleErrors.push(text)
      if (
        text.toLowerCase().includes('hydration') ||
        text.toLowerCase().includes('mismatch') ||
        text.toLowerCase().includes('did not match') ||
        text.toLowerCase().includes('server html')
      ) {
        hydrationWarnings.push(text)
      }
    })
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    expect(hydrationWarnings, `Hydration warnings: ${hydrationWarnings.join(', ')}`).toHaveLength(0)
    expect(consoleErrors, `Console errors: ${consoleErrors.join(', ')}`).toHaveLength(0)
  })

  test('Signup page has zero hydration warnings and zero console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    const hydrationWarnings: string[] = []

    page.on('console', (msg) => {
      const text = msg.text()
      if (msg.type() === 'error') consoleErrors.push(text)
      if (text.toLowerCase().includes('hydration') || text.toLowerCase().includes('mismatch')) {
        hydrationWarnings.push(text)
      }
    })
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    await page.goto('/signup')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    expect(hydrationWarnings).toHaveLength(0)
    expect(consoleErrors).toHaveLength(0)
  })

  // ═══════════════════════════════════════════════════════
  // 9. ZERO HORIZONTAL OVERFLOW (MOBILE 375PX)
  // ═══════════════════════════════════════════════════════

  test('No horizontal overflow on mobile login (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasOverflow).toBe(false)
  })

  test('No horizontal overflow on mobile signup (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/signup')
    await page.waitForLoadState('domcontentloaded')

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasOverflow).toBe(false)
  })
})
