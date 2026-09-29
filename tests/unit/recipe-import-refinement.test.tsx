import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RecipeImporter } from '@/features/ai/components/recipe-importer'
import { RecipeAiPreview } from '@/features/ai/components/recipe-ai-preview'
import type { ExtractedRecipeData } from '@/features/ai/types'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/recipes/import',
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ fill, unoptimized, ...rest }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...rest} alt={rest.alt || ''} />
  ),
}))

const mockExtractedRecipe: ExtractedRecipeData = {
  title: "Grandma's Rustic Tuscan White Bean Soup",
  description: 'Hearty Tuscan bean soup with garlic and fresh rosemary.',
  ingredients: [
    {
      name: 'cannellini beans',
      quantity: '2',
      unit: 'cans',
      preparationNote: 'rinsed and drained',
      isOptional: false,
    },
    {
      name: 'garlic cloves',
      quantity: '3',
      unit: '',
      preparationNote: 'minced',
      isOptional: false,
    },
  ],
  instructions: [
    {
      stepNumber: 1,
      instruction: 'Warm olive oil in a heavy Dutch oven and cook aromatics until fragrant.',
      timerDuration: 8,
    },
    {
      stepNumber: 2,
      instruction: 'Add beans and broth; simmer gently for 20 minutes.',
      timerDuration: 20,
    },
  ],
  prepTime: 15,
  cookTime: 30,
  servings: 4,
  difficulty: 'easy',
  cuisine: 'Tuscan',
  category: 'Soup',
  tags: ['tuscan', 'beans', 'comfort-food'],
  notes: null,
  confidenceNotes: 'Handwritten measurements verified against standard culinary units.',
}

describe('AI Recipe Import Refinement Suite (Screen 11)', () => {
  describe('RecipeImporter Component', () => {
    it('renders accessible segmented control with role="tablist" and role="tab"', () => {
      const html = renderToStaticMarkup(
        <RecipeImporter onRecipeExtracted={vi.fn()} />
      )
      expect(html).toContain('role="tablist"')
      expect(html).toContain('aria-label="Recipe Import Methods"')
      expect(html).toContain('Paste Recipe Text')
      expect(html).toContain('Upload Photo / Scan')
      expect(html).toContain('aria-selected="true"')
      expect(html).toContain('id="tab-text"')
      expect(html).toContain('id="tab-image"')
    })

    it('renders comfortable welcoming textarea without code-editor monospace styling', () => {
      const html = renderToStaticMarkup(
        <RecipeImporter onRecipeExtracted={vi.fn()} />
      )
      expect(html).toContain('font-sans')
      expect(html).not.toContain('font-mono')
      expect(html).toContain('Recipe Content')
      expect(html).toContain('Try sample recipe')
      expect(html).toContain('Extract Recipe')
      expect(html).toContain('id="recipe-text-input"')
    })

    it('provides clear trust reassurance about recipe privacy and review', () => {
      const html = renderToStaticMarkup(
        <RecipeImporter onRecipeExtracted={vi.fn()} />
      )
      expect(html).toContain(
        'Aurelia will extract ingredients, quantities, directions, and timers for your review.'
      )
    })
  })

  describe('RecipeAiPreview Component', () => {
    it('renders explicit unsaved preview distinction with badge and editorial heading', () => {
      const html = renderToStaticMarkup(
        <RecipeAiPreview
          initialData={mockExtractedRecipe}
          badgeType="imported"
          onStartOver={vi.fn()}
        />
      )
      expect(html).toContain('Unsaved Preview')
      expect(html).toContain('AI Imported')
      expect(html).toContain('Recipe Preview')
      expect(html).toContain('Save to Cookbook')
      expect(html).toContain('Discard')
    })

    it('displays AI extraction confidence notes in a polite culinary card', () => {
      const html = renderToStaticMarkup(
        <RecipeAiPreview
          initialData={mockExtractedRecipe}
          badgeType="imported"
          onStartOver={vi.fn()}
        />
      )
      expect(html).toContain('AI Extraction Note:')
      expect(html).toContain('Handwritten measurements verified against standard culinary units.')
    })

    it('renders basic recipe fields with luxury editorial inputs and required title', () => {
      const html = renderToStaticMarkup(
        <RecipeAiPreview
          initialData={mockExtractedRecipe}
          badgeType="imported"
          onStartOver={vi.fn()}
        />
      )
      expect(html).toContain("Grandma&#x27;s Rustic Tuscan White Bean Soup")
      expect(html).toContain('Hearty Tuscan bean soup with garlic and fresh rosemary.')
      expect(html).toContain('Prep Time (min)')
      expect(html).toContain('Cook Time (min)')
      expect(html).toContain('Servings')
      expect(html).toContain('Difficulty')
      expect(html).toContain('Cuisine')
      expect(html).toContain('Category')
    })

    it('renders structured ingredient hierarchy (quantity, unit, name, preparation notes)', () => {
      const html = renderToStaticMarkup(
        <RecipeAiPreview
          initialData={mockExtractedRecipe}
          badgeType="imported"
          onStartOver={vi.fn()}
        />
      )
      expect(html).toContain('Ingredients (2)')
      expect(html).toContain('cannellini beans')
      expect(html).toContain('rinsed and drained')
      expect(html).toContain('garlic cloves')
      expect(html).toContain('minced')
      expect(html).toContain('Add Ingredient')
    })

    it('renders numbered instruction steps with timer inputs and step add/remove affordances', () => {
      const html = renderToStaticMarkup(
        <RecipeAiPreview
          initialData={mockExtractedRecipe}
          badgeType="imported"
          onStartOver={vi.fn()}
        />
      )
      expect(html).toContain('Cooking Instructions (2 steps)')
      expect(html).toContain('Warm olive oil in a heavy Dutch oven')
      expect(html).toContain('minute timer')
      expect(html).toContain('Add Step')
    })

    it('renders tags as removable pills and includes tag addition input', () => {
      const html = renderToStaticMarkup(
        <RecipeAiPreview
          initialData={mockExtractedRecipe}
          badgeType="imported"
          onStartOver={vi.fn()}
        />
      )
      expect(html).toContain('#tuscan')
      expect(html).toContain('#beans')
      expect(html).toContain('#comfort-food')
      expect(html).toContain('Add tag')
    })

    it('renders source image cross-reference section when sourceImageUrl is provided', () => {
      const html = renderToStaticMarkup(
        <RecipeAiPreview
          initialData={mockExtractedRecipe}
          sourceImageUrl="https://images.unsplash.com/photo-1544025162-d76694265947"
          badgeType="imported"
          onStartOver={vi.fn()}
        />
      )
      expect(html).toContain('Original Photo Reference')
      expect(html).toContain('Cross-reference original text')
      expect(html).toContain('Hide Photo')
    })

    it('maintains clear sticky bottom action bar with Unsaved Preview status reminder', () => {
      const html = renderToStaticMarkup(
        <RecipeAiPreview
          initialData={mockExtractedRecipe}
          badgeType="imported"
          onStartOver={vi.fn()}
        />
      )
      expect(html).toContain('Unsaved preview — changes will not persist until saved')
      expect(html).toContain('Save to Cookbook')
    })
  })
})
