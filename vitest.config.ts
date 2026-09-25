import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables for integration tests
dotenv.config({ path: '.env.local' })

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      'server-only': path.resolve(__dirname, 'tests/fixtures/empty.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    testTimeout: 20000,
    hookTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/utils/quantity-scaler.ts',
        'src/lib/utils/shopping-consolidator.ts',
        'src/features/meal-planner/utils.ts',
        'src/features/ai/services/chef.ts',
      ],
    },
  },
})
