import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { MobileNav } from '@/components/layout/mobile-nav'
import NotFound from '@/app/not-found'
import ErrorBoundary from '@/app/error'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/recipes',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}))

// Mock theme context
vi.mock('@/components/providers/theme-context', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
}))

describe('App Shell, Navigation & System Fallbacks Unit Tests', () => {
  it('Sidebar renders brand identity, quick actions, navigation items, user profile, and footer controls', () => {
    const html = renderToStaticMarkup(
      <Sidebar
        userProfile={{
          displayName: 'Chef Auguste',
          email: 'auguste@escofier.org',
          avatarUrl: null,
        }}
      />
    )

    // 1. Brand identity
    expect(html).toContain('Aurelia')
    expect(html).toContain('Culinary Archive')

    // 2. Primary quick actions
    expect(html).toContain('New Recipe')
    expect(html).toContain('href="/recipes/new"')
    expect(html).toContain('Import with AI')
    expect(html).toContain('href="/recipes/import"')

    // 3. Navigation items
    expect(html).toContain('href="/recipes"')
    expect(html).toContain('href="/meal-planner"')
    expect(html).toContain('href="/collections"')
    expect(html).toContain('href="/ai-chef"')
    expect(html).toContain('href="/shopping"')
    expect(html).toContain('href="/settings"')

    // 4. User profile section
    expect(html).toContain('Chef Auguste')
    expect(html).toContain('auguste@escofier.org')
    expect(html).toContain('A') // Initial letter

    // 5. Footer actions
    expect(html).toContain('Theme')
    expect(html).toContain('Sign out')
  })

  it('Sidebar highlights the active route using active pill and left indicator bar', () => {
    const html = renderToStaticMarkup(<Sidebar />)

    // With pathname mocked to '/recipes', recipes link should have aria-current="page" and primary styling
    expect(html).toContain('href="/recipes"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('bg-primary/10')
  })

  it('MobileHeader renders brand emblem, quick creation link, and accessible menu button', () => {
    const html = renderToStaticMarkup(
      <MobileHeader
        userProfile={{
          displayName: 'Elena Arzak',
          email: 'elena@arzak.es',
          avatarUrl: null,
        }}
      />
    )

    expect(html).toContain('Aurelia')
    expect(html).toContain('aria-label="Aurelia Home"')
    expect(html).toContain('href="/recipes/new"')
    expect(html).toContain('aria-label="New Recipe"')
    expect(html).toContain('aria-label="Open navigation menu"')
    expect(html).toContain('aria-expanded="false"')
  })

  it('MobileNav renders all 5 primary tabs plus More trigger with >=44px touch targets', () => {
    const html = renderToStaticMarkup(<MobileNav />)

    // 1. Core tabs
    expect(html).toContain('href="/"')
    expect(html).toContain('Home')
    expect(html).toContain('href="/recipes"')
    expect(html).toContain('Recipes')
    expect(html).toContain('href="/meal-planner"')
    expect(html).toContain('Planner')
    expect(html).toContain('href="/ai-chef"')
    expect(html).toContain('AI Chef')
    expect(html).toContain('href="/shopping"')
    expect(html).toContain('Shopping')

    // 2. More button trigger
    expect(html).toContain('More')
    expect(html).toContain('aria-label="More navigation destinations (Collections, Settings, New Recipe)"')

    // 3. Active state on mocked route (/recipes)
    expect(html).toContain('aria-current="page"')

    // 4. Touch target height
    expect(html).toContain('min-h-[48px]')
    expect(html).toContain('min-w-[44px]')
  })

  it('NotFound page renders culinary identity, calm messaging, and recovery actions', () => {
    const html = renderToStaticMarkup(<NotFound />)

    expect(html).toContain('404 — Recipe Not Found')
    expect(html).toContain('This dish seems off the menu')
    expect(html).toContain('View Recipe Archive')
    expect(html).toContain('href="/recipes"')
    expect(html).toContain('Kitchen Dashboard')
    expect(html).toContain('href="/"')
    expect(html).toContain('Meal Planner')
    expect(html).toContain('href="/meal-planner"')
  })

  it('ErrorBoundary renders calm error message, retry action, and escape route without leaking errors', () => {
    const mockError = new Error('Database connection reset during query')
    const html = renderToStaticMarkup(
      <ErrorBoundary error={mockError} reset={vi.fn()} />
    )

    expect(html).toContain('Something Went Awry')
    expect(html).toContain('A mishap in the kitchen')
    expect(html).toContain('Try Again')
    expect(html).toContain('Return to Recipes')
    expect(html).toContain('href="/recipes"')
    expect(html).toContain('Kitchen Dashboard')
    expect(html).toContain('href="/"')

    // Should NOT expose technical error messages or stack traces to the user
    expect(html).not.toContain('Database connection reset during query')
  })
})
