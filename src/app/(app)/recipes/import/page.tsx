'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { RecipeImporter } from '@/features/ai/components/recipe-importer'
import { RecipeAiPreview } from '@/features/ai/components/recipe-ai-preview'
import type { ExtractedRecipeData } from '@/features/ai/types'

export default function RecipeImportPage() {
  const [extractedRecipe, setExtractedRecipe] = useState<ExtractedRecipeData | null>(null)
  const [sourceImage, setSourceImage] = useState<string | null>(null)

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to recipes</span>
        </Link>
      </div>

      {!extractedRecipe ? (
        <>
          <PageHeader
            title="Import Recipe with AI"
            description="Paste raw ingredients and cooking instructions or upload a photo of a cookbook, screenshot, or handwritten card."
          />
          <RecipeImporter
            onRecipeExtracted={(recipe, img) => {
              setExtractedRecipe(recipe)
              setSourceImage(img ?? null)
            }}
          />
        </>
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
