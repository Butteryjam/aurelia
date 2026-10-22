/**
 * Aurelia Mobile — Phase H Production Visual Audit via Playwright
 *
 * Captures all 15 mobile product screens across:
 * - 390x844 (iPhone 14 / modern standard)
 * - 375x812 (iPhone X / compact standard)
 */

import { chromium } from '@playwright/test'
import path from 'path'

const ARTIFACTS_DIR = 'C:/Users/svish/.gemini/antigravity-ide/brain/2f51d3c1-9f26-4a5a-b502-ba6930144316'
const BASE_URL = 'http://localhost:8081'
const RECIPE_ID = '68173106-473e-44e5-8381-0630a7e7639e'

async function runVisualAudit() {
  console.log('=== Starting Phase H Mobile Visual Audit ===')
  const browser = await chromium.launch({ headless: true })

  const viewports = [
    { name: '390x844', width: 390, height: 844 },
    { name: '375x812', width: 375, height: 812 },
  ]

  for (const vp of viewports) {
    console.log(`\n--- Auditing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`)
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      deviceScaleFactor: 2,
    })

    const page = await context.newPage()

    // 1. Login Screen
    console.log('1. Auditing Login Screen...')
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_01_login.png`) })

    // Sign in
    const emailInput = page.locator('input[placeholder="you@domain.com"]')
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.fill('user_a_test@recipevault.test')
      await page.locator('input[placeholder="Enter your password"]').fill('TestPassword123!')
      await page.locator('button:has-text("Sign In")').click()
      await page.waitForTimeout(3000)
    }

    // 2. Home Dashboard
    console.log('2. Auditing Home Screen...')
    await page.goto(`${BASE_URL}/home`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_02_home.png`) })

    // 3. Recipes Library
    console.log('3. Auditing Recipes Screen...')
    await page.goto(`${BASE_URL}/recipes`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_03_recipes.png`) })

    // 4. Recipe Detail
    console.log('4. Auditing Recipe Detail Screen...')
    await page.goto(`${BASE_URL}/recipe/${RECIPE_ID}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_04_recipe_detail.png`) })

    // 5. Recipe Creation
    console.log('5. Auditing Recipe Creation Screen...')
    await page.goto(`${BASE_URL}/recipe/new`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_05_recipe_new.png`) })

    // 6. Recipe Editing
    console.log('6. Auditing Recipe Editing Screen...')
    await page.goto(`${BASE_URL}/recipe/${RECIPE_ID}/edit`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_06_recipe_edit.png`) })

    // 7. Collections
    console.log('7. Auditing Collections Screen...')
    await page.goto(`${BASE_URL}/collections`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_07_collections.png`) })

    // 8. Favorites
    console.log('8. Auditing Favorites Screen...')
    await page.goto(`${BASE_URL}/favorites`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_08_favorites.png`) })

    // 9. AI Recipe Import
    console.log('9. Auditing AI Import Screen...')
    await page.goto(`${BASE_URL}/recipe/import`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_09_ai_import.png`) })

    // 10. AI Chef
    console.log('10. Auditing AI Chef Screen...')
    await page.goto(`${BASE_URL}/chef`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_10_ai_chef.png`) })

    // 11. Meal Planner
    console.log('11. Auditing Meal Planner Screen...')
    await page.goto(`${BASE_URL}/planner`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_11_meal_planner.png`) })

    // 12. Shopping List
    console.log('12. Auditing Shopping Screen...')
    await page.goto(`${BASE_URL}/shopping`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_12_shopping.png`) })

    // 13. Cook Mode
    console.log('13. Auditing Cook Mode Screen...')
    await page.goto(`${BASE_URL}/cook/${RECIPE_ID}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_13_cook_mode.png`) })

    // 14. Settings
    console.log('14. Auditing Settings Screen...')
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_14_settings.png`) })

    // 15. More Hub
    console.log('15. Auditing More Hub Screen...')
    await page.goto(`${BASE_URL}/more`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase_h_${vp.name}_15_more_hub.png`) })

    await context.close()
  }

  await browser.close()
  console.log('\n🎉 Phase H Mobile Visual Audit Complete!')
}

runVisualAudit().catch((err) => {
  console.error('Visual audit failed:', err)
  process.exit(1)
})
