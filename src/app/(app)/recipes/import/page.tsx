'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { RecipeImporter } from '@/features/ai/components/recipe-importer'
import { RecipeAiPreview } from '@/features/ai/components/recipe-ai-preview'
import type { ExtractedRecipeData } from '@/features/ai/types'

const DEMO_EXTRACTED_RECIPE: ExtractedRecipeData = {
  title: "Grandma's Rustic Tuscan White Bean Soup",
  description: 'Hearty Tuscan bean soup with garlic, fresh rosemary, and velvety cannellini beans.',
  ingredients: [
    {
      name: 'cannellini beans',
      quantity: '2',
      unit: 'cans',
      preparationNote: 'rinsed and drained',
      isOptional: false,
    },
    {
      name: 'yellow onion',
      quantity: '1',
      unit: 'medium',
      preparationNote: 'diced',
      isOptional: false,
    },
    {
      name: 'garlic',
      quantity: '3',
      unit: 'cloves',
      preparationNote: 'minced',
      isOptional: false,
    },
    {
      name: 'carrots',
      quantity: '2',
      unit: '',
      preparationNote: 'sliced into coins',
      isOptional: false,
    },
    {
      name: 'vegetable or chicken broth',
      quantity: '4',
      unit: 'cups',
      preparationNote: 'rich broth',
      isOptional: false,
    },
    {
      name: 'fresh rosemary',
      quantity: '1',
      unit: 'sprig',
      preparationNote: '',
      isOptional: false,
    },
    {
      name: 'extra virgin olive oil',
      quantity: '2',
      unit: 'tbsp',
      preparationNote: '',
      isOptional: false,
    },
    {
      name: 'parmesan cheese and crusty sourdough',
      quantity: '',
      unit: '',
      preparationNote: 'for serving',
      isOptional: true,
    },
  ],
  instructions: [
    {
      stepNumber: 1,
      instruction: 'Warm olive oil in a heavy Dutch oven over medium heat.',
      timerDuration: 2,
    },
    {
      stepNumber: 2,
      instruction: 'Add diced onion, carrots, and celery. Cook until soft and fragrant, about 8 minutes.',
      timerDuration: 8,
    },
    {
      stepNumber: 3,
      instruction: 'Stir in minced garlic and fresh rosemary; cook for 1 minute until aromatic.',
      timerDuration: 1,
    },
    {
      stepNumber: 4,
      instruction: 'Add cannellini beans and broth. Bring to a gentle boil, then simmer gently for 20 minutes.',
      timerDuration: 20,
    },
    {
      stepNumber: 5,
      instruction: 'Remove rosemary stem. Mash 1/3 of the beans with a wooden spoon for a velvety texture.',
      timerDuration: null,
    },
  ],
  prepTime: 15,
  cookTime: 30,
  servings: 4,
  difficulty: 'easy',
  cuisine: 'Tuscan',
  category: 'Soup',
  tags: ['tuscan', 'beans', 'comfort-food', 'quick'],
  notes: null,
  confidenceNotes: 'Standardized quantities and step timers verified from recipe notes.',
}

function RecipeImportContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('preview') === 'demo'
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipeData | null>(
    isDemo ? DEMO_EXTRACTED_RECIPE : null
  )
  const [sourceImage, setSourceImage] = useState<string | null>(
    isDemo ? 'https://images.unsplash.com/photo-1547592180-85f173990554' : null
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 px-4 sm:px-6">
      {/* Top back navigation */}
      <div className="flex items-center justify-between pt-1">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group py-1.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to recipes</span>
        </Link>
      </div>

      {!extractedRecipe ? (
        <div className="space-y-6">
          <PageHeader
            title="Import Recipe"
            description="Transform raw recipe notes, cookbook photos, or handwritten cards into clean, structured culinary entries."
            badge={
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted/80 text-muted-foreground border border-border/80">
                <ShieldCheck className="h-3 w-3 text-primary/80" />
                <span>Private & Editable</span>
              </span>
            }
          />
          <RecipeImporter
            onRecipeExtracted={(recipe, img) => {
              setExtractedRecipe(recipe)
              setSourceImage(img ?? null)
            }}
          />
        </div>
      ) : (
        <RecipeAiPreview
          initialData={extractedRecipe}
          sourceImageUrl={sourceImage}
          badgeType="imported"
          onStartOver={() => {
            setExtractedRecipe(null)
            setSourceImage(null)
          }}
        />
      )}
    </div>
  )
}

export default function RecipeImportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading recipe import...</div>}>
      <RecipeImportContent />
    </Suspense>
  )
}
