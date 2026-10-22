/**
 * Aurelia Mobile — Phase G Visual Verification via Playwright
 *
 * Runs mobile viewports (390x844 iPhone 14 / 375x812 iPhone X)
 * against Expo Web runtime (http://localhost:8081).
 */

import { chromium } from '@playwright/test'
import path from 'path'

const ARTIFACTS_DIR = 'C:/Users/svish/.gemini/antigravity-ide/brain/2f51d3c1-9f26-4a5a-b502-ba6930144316'
const BASE_URL = 'http://localhost:8081'
const RECIPE_ID = '68173106-473e-44e5-8381-0630a7e7639e' // Real Tuscan White Bean Soup

async function runVisualVerification() {
  console.log('=== Launching Chromium for Phase G Visual Verification ===')
  const browser = await chromium.launch({ headless: true })

  const viewports = [
    { name: '390x844', width: 390, height: 844 },
    { name: '375x812', width: 375, height: 812 },
  ]

  for (const vp of viewports) {
    console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`)
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      deviceScaleFactor: 2,
    })

    const page = await context.newPage()

    // 1. Authenticate if needed
    console.log('1. Checking auth status...')
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(1500)

    const emailInput = page.locator('input[placeholder="you@domain.com"]')
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Signing in as test user...')
      await emailInput.fill('user_a_test@recipevault.test')
      const passInput = page.locator('input[placeholder="Enter your password"]')
      await passInput.fill('TestPassword123!')
      await page.locator('button:has-text("Sign In")').click()
      await page.waitForTimeout(3000)
    }

    // 2. Navigate to recipe detail
    console.log('2. Navigating to Recipe Detail...')
    await page.goto(`${BASE_URL}/recipe/${RECIPE_ID}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)

    const recipeDetailShot = path.join(ARTIFACTS_DIR, `phase_g_${vp.name}_recipe_detail.png`)
    await page.screenshot({ path: recipeDetailShot, fullPage: false })
    console.log(`✓ Saved recipe detail: ${recipeDetailShot}`)

    // 3. Locate Start Cooking or enter Cook Mode
    console.log('3. Locating Cook Mode trigger...')
    const startCookingBtn = page.locator('button:has-text("Start Cooking"), button:has-text("Cook Mode"), [aria-label*="Start Cooking"]').first()
    const hasCookBtn = await startCookingBtn.isVisible().catch(() => false)

    if (hasCookBtn) {
      await startCookingBtn.click()
    } else {
      console.log('Navigating directly to Cook Mode:', `/cook/${RECIPE_ID}`)
      await page.goto(`${BASE_URL}/cook/${RECIPE_ID}`, { waitUntil: 'networkidle' })
    }
    await page.waitForTimeout(2500)

    // 4. Capture Step 1 in Cook Mode
    console.log('4. Capturing Cook Mode Step 1 layout...')
    const step1Shot = path.join(ARTIFACTS_DIR, `phase_g_${vp.name}_step1.png`)
    await page.screenshot({ path: step1Shot, fullPage: false })
    console.log(`✓ Saved Step 1: ${step1Shot}`)

    // 5. Navigate to Step 2
    console.log('5. Navigating to Step 2...')
    const nextBtn = page.locator('[data-testid="next-step-btn"], button:has-text("Next Step")').first()
    if (await nextBtn.isVisible()) {
      await nextBtn.click()
      await page.waitForTimeout(1000)
    }

    const step2Shot = path.join(ARTIFACTS_DIR, `phase_g_${vp.name}_step2.png`)
    await page.screenshot({ path: step2Shot, fullPage: false })
    console.log(`✓ Saved Step 2: ${step2Shot}`)

    // 6. Test step timer if visible
    console.log('6. Checking for step timer...')
    const startTimerBtn = page.locator('[data-testid="start-timer-btn"], button:has-text("Start Timer")').first()
    if (await startTimerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Starting timer...')
      await startTimerBtn.click()
      await page.waitForTimeout(1500)
      const timerActiveShot = path.join(ARTIFACTS_DIR, `phase_g_${vp.name}_timer_active.png`)
      await page.screenshot({ path: timerActiveShot, fullPage: false })
      console.log(`✓ Saved Timer Active: ${timerActiveShot}`)
    }

    // 7. Open Ingredient Drawer
    console.log('7. Opening Ingredient Drawer...')
    const openIngBtn = page.locator('[data-testid="open-ingredients-btn"]').first()
    if (await openIngBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await openIngBtn.click()
      await page.waitForTimeout(1000)

      // Scale servings up
      const incServingsBtn = page.locator('[data-testid="increase-servings-btn"]').first()
      if (await incServingsBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await incServingsBtn.click()
        await page.waitForTimeout(500)
      }

      // Toggle first ingredient checkbox
      const firstIng = page.locator('[data-testid^="cook-ingredient-"]').first()
      if (await firstIng.isVisible({ timeout: 1000 }).catch(() => false)) {
        await firstIng.click()
        await page.waitForTimeout(500)
      }

      const ingDrawerShot = path.join(ARTIFACTS_DIR, `phase_g_${vp.name}_ingredients.png`)
      await page.screenshot({ path: ingDrawerShot, fullPage: false })
      console.log(`✓ Saved Ingredient Drawer: ${ingDrawerShot}`)

      // Close drawer
      const closeIngBtn = page.locator('[data-testid="close-ingredients-btn"]').first()
      if (await closeIngBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeIngBtn.click()
        await page.waitForTimeout(800)
      }
    }

    // 8. Advance through steps to the final step
    console.log('8. Advancing to final step...')
    for (let i = 0; i < 8; i++) {
      const finishBtn = page.locator('[data-testid="finish-cooking-btn"], button:has-text("Finish Cooking")').first()
      if (await finishBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        break
      }
      const next = page.locator('[data-testid="next-step-btn"], button:has-text("Next Step")').first()
      if (await next.isVisible({ timeout: 500 }).catch(() => false)) {
        await next.click()
        await page.waitForTimeout(500)
      } else {
        break
      }
    }

    const finalStepShot = path.join(ARTIFACTS_DIR, `phase_g_${vp.name}_final_step.png`)
    await page.screenshot({ path: finalStepShot, fullPage: false })
    console.log(`✓ Saved Final Step: ${finalStepShot}`)

    // 9. Open Completion Modal
    console.log('9. Opening Completion Modal...')
    const finishCookingBtn = page.locator('[data-testid="finish-cooking-btn"], button:has-text("Finish Cooking")').first()
    if (await finishCookingBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await finishCookingBtn.click()
      await page.waitForTimeout(1200)

      // Rate 5 stars
      const star5 = page.locator('[data-testid="star-rating-5"]').first()
      if (await star5.isVisible({ timeout: 1000 }).catch(() => false)) {
        await star5.click()
      }

      // Fill notes
      const notesInput = page.locator('[data-testid="cooking-notes-input"]').first()
      if (await notesInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await notesInput.fill('Cooked to perfection! Silky broth, aromatic rosemary and sage.')
      }

      const completionShot = path.join(ARTIFACTS_DIR, `phase_g_${vp.name}_completion_modal.png`)
      await page.screenshot({ path: completionShot, fullPage: false })
      console.log(`✓ Saved Completion Modal: ${completionShot}`)
    }

    await context.close()
  }

  await browser.close()
  console.log('\n🎉 Visual verification finished successfully!')
}

runVisualVerification().catch((err) => {
  console.error('\n❌ Visual verification error:', err)
  process.exit(1)
})
