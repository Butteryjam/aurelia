import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const PORT = process.env.PORT || 3000
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || `http://localhost:${PORT}`
const USE_DEV_SERVER = process.env.PLAYWRIGHT_USE_DEV === 'true'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
      testIgnore: /mobile-navigation\.spec\.ts/,
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 375, height: 812 },
      },
      testMatch: /mobile-navigation\.spec\.ts/,
    },
  ],
  webServer: {
    command: USE_DEV_SERVER ? 'npm run dev' : 'npm run start',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120000,
    env: {
      ENABLE_TEST_PREVIEWS: 'true',
    },
  },
})
