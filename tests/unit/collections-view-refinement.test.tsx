import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CollectionCard } from '@/features/collections/components/collection-card'
import { CollectionsView } from '@/features/collections/components/collections-view'
import { CollectionDetailView } from '@/features/collections/components/collection-detail-view'
import { CollectionDialog } from '@/features/collections/components/collection-dialog'
import type { CollectionWithRecipes } from '@/features/collections/queries'
import type { Recipe } from '@/types/database'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/collections',
}))

const mockRecipe: Recipe = {
  id: 'recipe-col-1',
  user_id: 'user-test-1',
  title: 'Handmade Tagliatelle al Tartufo',
  description: 'Silky egg pasta ribbons coated in black winter truffle butter.',
  image_url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141',
  servings: 2,
  prep_time: 30,
  cook_time: 10,
  total_time: 40,
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

const mockCollections: CollectionWithRecipes[] = [
  {
    id: 'col-1',
    user_id: 'user-test-1',
    name: 'Winter Comfort Stews',
    description: 'Slow-simmered hearty classics for cold evenings by the fireplace.',
    cover_image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    recipe_count: 6,
    recipes: [mockRecipe],
  },
  {
    id: 'col-2',
    user_id: 'user-test-1',
    name: 'Sunday Morning Baking',
    description: 'Artisan sourdough loaves, golden brioche, and laminated pastries.',
    cover_image_url: null, // Test editorial placeholder treatment
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    recipe_count: 1,
    recipes: [mockRecipe],
  },
]

describe('Collections Refinement Suite (Screen 4)', () => {
  describe('CollectionCard Component', () => {
    it('renders with luxury rounded-2xl geometry, shadow-card, and serif volume title', () => {
      const html = renderToStaticMarkup(<CollectionCard collection={mockCollections[0]} />)

      expect(html).toContain('Winter Comfort Stews')
      expect(html).toContain('Slow-simmered hearty classics')
      expect(html).toContain('6 recipes')
      expect(html).toContain('rounded-2xl')
      expect(html).toContain('shadow-card')
      expect(html).toContain('font-serif')
      expect(html).toContain('/collections/col-1')
      expect(html).toContain('Curated Collection')
      expect(html).toContain('View recipes')
    })

    it('renders editorial cookbook volume cover placeholder with spine accent when no cover image', () => {
      const html = renderToStaticMarkup(<CollectionCard collection={mockCollections[1]} />)

      expect(html).toContain('Sunday Morning Baking')
      expect(html).toContain('1 recipe')
      // Check for decorative debossed spine accent and volume label
      expect(html).toContain('Culinary Volume')
      expect(html).toContain('bg-primary/15')
    })

    it('includes accessible edit and delete action buttons with aria labels', () => {
      const html = renderToStaticMarkup(<CollectionCard collection={mockCollections[0]} />)

      expect(html).toContain('aria-label="Edit Winter Comfort Stews"')
      expect(html).toContain('aria-label="Delete Winter Comfort Stews"')
    })
  })

  describe('CollectionsView Component', () => {
    it('renders editorial PageHeader with H1 Collections and volume counter badge', () => {
      const html = renderToStaticMarkup(<CollectionsView collections={mockCollections} />)

      expect(html).toContain('Collections')
      expect(html).toContain('Organize and curate your culinary archive')
      expect(html).toContain('2 Volumes')
      expect(html).toContain('New Collection')
    })

    it('renders intentional editorial empty state when user has 0 collections', () => {
      const html = renderToStaticMarkup(<CollectionsView collections={[]} />)

      expect(html).toContain('Your Cookbook Shelves are Empty')
      expect(html).toContain('Curate your culinary archive into themed volumes')
      expect(html).toContain('Create your first collection')
    })
  })

  describe('CollectionDetailView Component', () => {
    it('renders breadcrumb back link, volume hero banner, and recipes grid', () => {
      const html = renderToStaticMarkup(
        <CollectionDetailView collection={mockCollections[0]} favoriteIds={['recipe-col-1']} />
      )

      expect(html).toContain('All Collections')
      expect(html).toContain('Winter Comfort Stews')
      expect(html).toContain('Recipes in this Collection')
      expect(html).toContain('Handmade Tagliatelle al Tartufo')
      expect(html).toContain('Remove')
      expect(html).toContain('aria-label="Remove Handmade Tagliatelle al Tartufo from collection"')
    })

    it('renders editorial empty state when volume has no recipes', () => {
      const emptyCol: CollectionWithRecipes = {
        ...mockCollections[0],
        recipes: [],
        recipe_count: 0,
      }
      const html = renderToStaticMarkup(
        <CollectionDetailView collection={emptyCol} favoriteIds={[]} />
      )

      expect(html).toContain('This volume is currently empty')
      expect(html).toContain('Browse Recipes')
    })
  })

  describe('CollectionDialog Primitive', () => {
    it('renders dialog trigger button with New Collection text', () => {
      const html = renderToStaticMarkup(<CollectionDialog mode="create" />)

      expect(html).toContain('New Collection')
    })
  })
})
