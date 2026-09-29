import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RecipeCard } from '@/features/recipes/components/recipe-card'
import { RecipeSearchBar } from '@/features/recipes/components/recipe-search-bar'
import { RecipeSortSelect } from '@/features/recipes/components/recipe-sort-select'
import { RecipeFiltersSheet } from '@/features/recipes/components/recipe-filters-sheet'
import { RecipesView } from '@/features/recipes/components/recipes-view'
import type { Recipe } from '@/types/database'
import type { FilterOptions } from '@/features/recipes/queries'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/recipes',
}))

const mockRecipe: Recipe = {
  id: 'recipe-test-123',
  user_id: 'user-test-1',
  title: 'Classic Osso Buco alla Milanese',
  description: 'Tender braised veal shanks with aromatic vegetables and gremolata.',
  image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947',
  servings: 4,
  prep_time: 20,
  cook_time: 120,
  total_time: 140,
  difficulty: 'medium',
  cuisine: 'Italian',
  category: 'Dinner',
  notes: null,
  rating: 5,
  source_url: null,
  nutrition_facts: null,
  is_public: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const mockFilterOptions: FilterOptions = {
  categories: ['Dinner', 'Lunch', 'Dessert'],
  cuisines: ['Italian', 'French', 'Japanese'],
  tags: ['comfort-food', 'quick', 'baking'],
}

describe('Recipes Archive Refinement Suite', () => {
  describe('RecipeCard Component', () => {
    it('renders with luxury article element, rounded-2xl, and consistent typography', () => {
      const html = renderToStaticMarkup(<RecipeCard recipe={mockRecipe} isFavorite={true} />)
      expect(html).toContain('Classic Osso Buco alla Milanese')
      expect(html).toContain('Tender braised veal shanks')
      expect(html).toContain('rounded-2xl')
      expect(html).toContain('shadow-card')
      expect(html).toContain('font-serif')
      expect(html).toContain('Italian')
      expect(html).toContain('Dinner')
      expect(html).toContain('140 mins')
      expect(html).toContain('4 servings')
    })

    it('renders semantic difficulty badge and favorite toggle button', () => {
      const html = renderToStaticMarkup(<RecipeCard recipe={mockRecipe} isFavorite={true} />)
      expect(html).toContain('medium')
      expect(html).toContain('text-amber-800')
      expect(html).toContain('aria-label="Remove from favorites"')
      expect(html).toContain('aria-pressed="true"')
    })

    it('handles fallback image gracefully without breaking layout', () => {
      const recipeNoImage = { ...mockRecipe, image_url: null }
      const html = renderToStaticMarkup(<RecipeCard recipe={recipeNoImage} />)
      expect(html).toContain('lucide-chef-hat')
      expect(html).toContain('Classic Osso Buco alla Milanese')
    })
  })

  describe('RecipeSearchBar Component', () => {
    it('renders as a first-class library control with search icon and 44px min-height', () => {
      const html = renderToStaticMarkup(
        <RecipeSearchBar value="risotto" onChange={() => {}} placeholder="Search recipes..." />
      )
      expect(html).toContain('Search recipes...')
      expect(html).toContain('min-h-[44px]')
      expect(html).toContain('aria-label="Search recipes"')
      expect(html).toContain('aria-label="Clear search"')
    })

    it('displays loading spinner when isPending is true', () => {
      const html = renderToStaticMarkup(
        <RecipeSearchBar value="risotto" onChange={() => {}} isPending={true} />
      )
      expect(html).toContain('role="status"')
      expect(html).toContain('Searching recipes...')
    })

    it('displays keyboard shortcut hint when input is empty and not pending', () => {
      const html = renderToStaticMarkup(
        <RecipeSearchBar value="" onChange={() => {}} isPending={false} />
      )
      expect(html).toContain('Press / to focus search')
      expect(html).toContain('kbd')
    })
  })

  describe('RecipeSortSelect Component', () => {
    it('renders custom styled sort control with chevron and 44px min-height', () => {
      const html = renderToStaticMarkup(
        <RecipeSortSelect value="newest" onChange={() => {}} />
      )
      expect(html).toContain('min-h-[44px]')
      expect(html).toContain('aria-label="Sort recipes"')
      expect(html).toContain('Recently Added')
      expect(html).toContain('Alphabetical (A–Z)')
      expect(html).toContain('Highest Rated')
    })
  })

  describe('RecipeFiltersSheet Component', () => {
    it('renders filter trigger button and quick favorites toggle pill', () => {
      const html = renderToStaticMarkup(
        <RecipeFiltersSheet
          options={mockFilterOptions}
          activeFilters={{
            category: '',
            cuisine: '',
            difficulty: '',
            maxTime: null,
            tag: '',
            favorite: false,
          }}
          activeCount={0}
          onCategoryChange={() => {}}
          onCuisineChange={() => {}}
          onDifficultyChange={() => {}}
          onMaxTimeChange={() => {}}
          onTagChange={() => {}}
          onFavoriteChange={() => {}}
          onClearAll={() => {}}
        />
      )
      expect(html).toContain('Filters')
      expect(html).toContain('aria-label="Open filter options"')
      expect(html).toContain('aria-label="Filter favorites"')
      expect(html).toContain('All Categories')
      expect(html).toContain('Dinner')
      expect(html).toContain('Lunch')
    })

    it('displays active filter count badge and active filter chips', () => {
      const html = renderToStaticMarkup(
        <RecipeFiltersSheet
          options={mockFilterOptions}
          activeFilters={{
            category: 'Dinner',
            cuisine: 'Italian',
            difficulty: 'easy',
            maxTime: 30,
            tag: 'quick',
            favorite: true,
          }}
          activeCount={6}
          onCategoryChange={() => {}}
          onCuisineChange={() => {}}
          onDifficultyChange={() => {}}
          onMaxTimeChange={() => {}}
          onTagChange={() => {}}
          onFavoriteChange={() => {}}
          onClearAll={() => {}}
        />
      )
      expect(html).toContain('6')
      expect(html).toContain('Active filters:')
      expect(html).toContain('Category: Dinner')
      expect(html).toContain('Cuisine: Italian')
      expect(html).toContain('Difficulty: easy')
      expect(html).toContain('Under 30 mins')
      expect(html).toContain('#quick')
      expect(html).toContain('Clear all')
    })
  })

  describe('RecipesView Component Integration', () => {
    it('renders PageHeader primitive with title, description, and action buttons', () => {
      const html = renderToStaticMarkup(
        <RecipesView
          recipes={[mockRecipe]}
          favoriteIds={['recipe-test-123']}
          filterOptions={mockFilterOptions}
        />
      )
      expect(html).toContain('Recipes')
      expect(html).toContain('1 recipe')
      expect(html).toContain('Add Recipe')
      expect(html).toContain('Import with AI')
      expect(html).toContain('Classic Osso Buco alla Milanese')
    })

    it('renders editorial EmptyState when archive has 0 recipes and no active filters', () => {
      const html = renderToStaticMarkup(
        <RecipesView
          recipes={[]}
          favoriteIds={[]}
          filterOptions={mockFilterOptions}
        />
      )
      expect(html).toContain('Your Culinary Archive')
      expect(html).toContain('Add Your First Recipe')
      expect(html).toContain('Import with AI')
    })
  })
})
