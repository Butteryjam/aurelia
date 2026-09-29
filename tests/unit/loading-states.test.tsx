import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PageHeaderSkeleton,
  RecipeCardSkeleton,
  CollectionCardSkeleton,
  ShoppingRowSkeleton,
  SettingsSectionSkeleton,
} from '@/components/shared/skeletons'
import DashboardLoading from '@/app/(app)/loading'
import RecipesLoading from '@/app/(app)/recipes/loading'
import RecipeDetailLoading from '@/app/(app)/recipes/[id]/loading'
import EditRecipeLoading from '@/app/(app)/recipes/[id]/edit/loading'
import CollectionsLoading from '@/app/(app)/collections/loading'
import CollectionDetailLoading from '@/app/(app)/collections/[id]/loading'
import MealPlannerLoading from '@/app/(app)/meal-planner/loading'
import ShoppingLoading from '@/app/(app)/shopping/loading'
import AIChefLoading from '@/app/(app)/ai-chef/loading'
import SettingsLoading from '@/app/(app)/settings/loading'
import RecipeImportLoading from '@/app/(app)/recipes/import/loading'
import NewRecipeLoading from '@/app/(app)/recipes/new/loading'

describe('Screen 14: Loading States & Perceived Performance Unit Tests', () => {
  it('Skeleton primitive renders aria-hidden and respects reduced motion', () => {
    const html = renderToStaticMarkup(<Skeleton className="h-6 w-24" />)

    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('animate-pulse')
    expect(html).toContain('motion-reduce:animate-none')
    expect(html).toContain('h-6 w-24')
  })

  it('Shared skeletons match expected geometry and contain no interactive fake elements', () => {
    const cardHtml = renderToStaticMarkup(<RecipeCardSkeleton />)
    expect(cardHtml).toContain('aspect-4/3')
    expect(cardHtml).not.toContain('<button')
    expect(cardHtml).not.toContain('<a ')

    const collectionHtml = renderToStaticMarkup(<CollectionCardSkeleton />)
    expect(collectionHtml).toContain('rounded-2xl')
    expect(collectionHtml).not.toContain('<button')
    expect(collectionHtml).not.toContain('<a ')

    const shoppingHtml = renderToStaticMarkup(<ShoppingRowSkeleton />)
    expect(shoppingHtml).toContain('rounded-xl')
    expect(shoppingHtml).not.toContain('<button')

    const settingsHtml = renderToStaticMarkup(<SettingsSectionSkeleton />)
    expect(settingsHtml).toContain('rounded-2xl')
    expect(settingsHtml).not.toContain('<button')
  })

  it('Route-level loading states declare role="status" and accessible labels', () => {
    const dashboardHtml = renderToStaticMarkup(<DashboardLoading />)
    expect(dashboardHtml).toContain('role="status"')
    expect(dashboardHtml).toContain('aria-label="Loading Kitchen Dashboard"')

    const recipesHtml = renderToStaticMarkup(<RecipesLoading />)
    expect(recipesHtml).toContain('role="status"')
    expect(recipesHtml).toContain('aria-label="Loading Recipes Archive"')

    const recipeDetailHtml = renderToStaticMarkup(<RecipeDetailLoading />)
    expect(recipeDetailHtml).toContain('role="status"')
    expect(recipeDetailHtml).toContain('aria-label="Loading Recipe Detail"')

    const editHtml = renderToStaticMarkup(<EditRecipeLoading />)
    expect(editHtml).toContain('role="status"')
    expect(editHtml).toContain('aria-label="Loading Recipe Editor"')

    const collectionsHtml = renderToStaticMarkup(<CollectionsLoading />)
    expect(collectionsHtml).toContain('role="status"')
    expect(collectionsHtml).toContain('aria-label="Loading Collections Archive"')

    const collectionDetailHtml = renderToStaticMarkup(<CollectionDetailLoading />)
    expect(collectionDetailHtml).toContain('role="status"')
    expect(collectionDetailHtml).toContain('aria-label="Loading Collection Volume"')

    const mealPlannerHtml = renderToStaticMarkup(<MealPlannerLoading />)
    expect(mealPlannerHtml).toContain('role="status"')
    expect(mealPlannerHtml).toContain('aria-label="Loading Weekly Meal Planner"')

    const shoppingHtml = renderToStaticMarkup(<ShoppingLoading />)
    expect(shoppingHtml).toContain('role="status"')
    expect(shoppingHtml).toContain('aria-label="Loading Shopping List"')

    const aiChefHtml = renderToStaticMarkup(<AIChefLoading />)
    expect(aiChefHtml).toContain('role="status"')
    expect(aiChefHtml).toContain('aria-label="Loading AI Chef"')

    const settingsHtml = renderToStaticMarkup(<SettingsLoading />)
    expect(settingsHtml).toContain('role="status"')
    expect(settingsHtml).toContain('aria-label="Loading Account Settings"')

    const importHtml = renderToStaticMarkup(<RecipeImportLoading />)
    expect(importHtml).toContain('role="status"')
    expect(importHtml).toContain('aria-label="Loading AI Recipe Import"')

    const newRecipeHtml = renderToStaticMarkup(<NewRecipeLoading />)
    expect(newRecipeHtml).toContain('role="status"')
    expect(newRecipeHtml).toContain('aria-label="Loading Recipe Creator"')
  })

  it('None of the route loading states render focusable interactive buttons or links', () => {
    const states = [
      renderToStaticMarkup(<DashboardLoading />),
      renderToStaticMarkup(<RecipesLoading />),
      renderToStaticMarkup(<RecipeDetailLoading />),
      renderToStaticMarkup(<MealPlannerLoading />),
      renderToStaticMarkup(<ShoppingLoading />),
      renderToStaticMarkup(<AIChefLoading />),
      renderToStaticMarkup(<SettingsLoading />),
    ]

    for (const html of states) {
      // Must not render interactive fake buttons or clickable links
      expect(html).not.toMatch(/<button[^>]*>/i)
      expect(html).not.toMatch(/<a\s+href[^>]*>/i)
    }
  })

  it('LoadingPreviewPage invokes notFound in production when ENABLE_TEST_PREVIEWS is absent', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    const originalEnable = process.env.ENABLE_TEST_PREVIEWS

    try {
      // @ts-expect-error override NODE_ENV for test
      process.env.NODE_ENV = 'production'
      delete process.env.ENABLE_TEST_PREVIEWS

      const LoadingPreviewPage = (await import('@/app/(app)/loading-preview/page')).default
      await expect(
        LoadingPreviewPage({ searchParams: Promise.resolve({ screen: 'recipes' }) })
      ).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/)
    } finally {
      // @ts-expect-error restore NODE_ENV
      process.env.NODE_ENV = originalNodeEnv
      if (originalEnable !== undefined) {
        process.env.ENABLE_TEST_PREVIEWS = originalEnable
      }
    }
  })
})

