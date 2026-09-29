import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RecipeForm } from '@/features/recipes/components/recipe-form'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-123' } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    storage: {
      from: () => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } }),
      }),
    },
  }),
}))

describe('RecipeForm Screen 12 Refinement Unit Tests', () => {
  it('1. renders "Create New Recipe" header and all 5 editorial sections in create mode', () => {
    const html = renderToStaticMarkup(<RecipeForm mode="create" />)

    expect(html).toContain('Create New Recipe')
    expect(html).toContain('The Essentials')
    expect(html).toContain('Timing, Yield &amp; Taxonomy')
    expect(html).toContain('Ingredients Archive')
    expect(html).toContain('Method &amp; Timers')
    expect(html).toContain('Chef&#x27;s Notes &amp; Culinary Tags')
  })

  it('2. renders "Edit Recipe" header in edit mode with existing recipe data', () => {
    const mockRecipe = {
      id: 'recipe-456',
      user_id: 'test-user-123',
      title: 'Heirloom Tomato Tart',
      description: 'Buttery puff pastry with Dijon and roasted tomatoes',
      servings: 6,
      prep_time: 20,
      cook_time: 35,
      difficulty: 'medium' as const,
      cuisine: 'French',
      category: 'Dinner',
      notes: 'Best served warm with a crisp white wine.',
      image_url: null,
      source_type: 'manual' as const,
      source_url: null,
      total_time: 55,
      rating: null,
      nutrition_facts: null,
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: [{ id: 'tag-1', name: 'Pastry' }],
      recipe_ingredients: [
        { id: 'ing-1', recipe_id: 'recipe-456', name: 'Puff pastry', quantity: '1', unit: 'sheet', preparation_note: '', is_optional: false, order_index: 0 },
      ],
      recipe_instructions: [
        { id: 'ins-1', recipe_id: 'recipe-456', step_number: 1, instruction: 'Roll out the pastry on parchment.', timer_duration: 600 },
      ],
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html = renderToStaticMarkup(<RecipeForm mode="edit" initialData={mockRecipe as any} />)

    expect(html).toContain('Edit Recipe')
    expect(html).toContain('Heirloom Tomato Tart')
    expect(html).toContain('Buttery puff pastry with Dijon and roasted tomatoes')
    expect(html).toContain('Puff pastry')
    expect(html).toContain('Roll out the pastry on parchment.')
  })

  it('3. renders responsive mobile and desktop ingredient layouts without clipping', () => {
    const html = renderToStaticMarkup(<RecipeForm mode="create" />)

    // Desktop controls
    expect(html).toContain('hidden sm:flex')
    // Mobile controls
    expect(html).toContain('sm:hidden')
    expect(html).toContain('Ingredient name (e.g. Olive Oil)')
    expect(html).toContain('Delete ingredient')
    expect(html).toContain('Move ingredient up')
    expect(html).toContain('Move ingredient down')
  })

  it('4. renders step cards with numbered badges, timers, and cook mode indicator', () => {
    const html = renderToStaticMarkup(<RecipeForm mode="create" />)

    expect(html).toContain('Describe step 1 with culinary precision…')
    expect(html).toContain('Timer duration')
    expect(html).toContain('mins')
    expect(html).toContain('Add Step')
  })

  it('5. renders popular culinary tag suggestions for instant tagging', () => {
    const html = renderToStaticMarkup(<RecipeForm mode="create" />)

    expect(html).toContain('Quick suggestions:')
    expect(html).toContain('+ Quick')
    expect(html).toContain('+ Weeknight')
    expect(html).toContain('+ Vegetarian')
    expect(html).toContain('+ Gluten-Free')
    expect(html).toContain('Add custom tag')
  })

  it('6. renders sticky action bar with cancel and save actions', () => {
    const html = renderToStaticMarkup(<RecipeForm mode="create" />)

    expect(html).toContain('sticky bottom-0')
    expect(html).toContain('Cancel')
    expect(html).toContain('Save Recipe')
  })

  it('7. renders required fields indicators and difficulty select dropdown', () => {
    const html = renderToStaticMarkup(<RecipeForm mode="create" />)

    expect(html).toContain('Recipe Title')
    expect(html).toContain('text-destructive')
    expect(html).toContain('Easy (Simple &amp; Quick)')
    expect(html).toContain('Medium (Moderate Skill)')
    expect(html).toContain('Hard (Mastery Required)')
  })

  it('8. renders back breadcrumb with navigation to archive', () => {
    const html = renderToStaticMarkup(<RecipeForm mode="create" />)

    expect(html).toContain('Back to Recipes')
    expect(html).toContain('href="/recipes"')
  })
})
