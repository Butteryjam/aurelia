'use client'

import { useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import {
  FileText,
  UploadCloud,
  Sparkles,
  AlertCircle,
  X,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { extractRecipeFromTextAction, extractRecipeFromImageAction } from '../actions/extract-recipe'
import type { ExtractedRecipeData } from '../types'

interface RecipeImporterProps {
  onRecipeExtracted: (recipe: ExtractedRecipeData, sourceImage?: string | null) => void
}

const SAMPLE_RECIPE_TEXT = `Grandma's Rustic Tuscan White Bean & Rosemary Soup
Ingredients:
2 cans cannellini beans, rinsed and drained
1 medium yellow onion, diced
3 cloves garlic, minced
2 carrots, sliced into coins
2 stalks celery, chopped
4 cups rich vegetable or chicken broth
1 sprig fresh rosemary
2 tbsp extra virgin olive oil
salt and cracked black pepper to taste
grated parmesan cheese and crusty sourdough for serving

Instructions:
1. Warm olive oil in a heavy Dutch oven over medium heat.
2. Add diced onion, carrots, and celery. Cook until soft and fragrant, about 8 minutes.
3. Stir in minced garlic and fresh rosemary; cook for 1 minute until aromatic.
4. Add the cannellini beans and broth. Bring to a gentle boil, then reduce heat and simmer gently for 20 minutes.
5. Remove the rosemary stem. Mash about 1/3 of the beans with a wooden spoon to create a thick, velvety broth.
6. Season with sea salt and black pepper. Ladle into warm bowls and top with generous parmesan and warm olive oil.`

const PROCESSING_STAGES = [
  'Reading recipe content…',
  'Structuring ingredients & measurements…',
  'Organizing sequential steps & timers…',
  'Finalizing culinary preview…',
]

export function RecipeImporter({ onRecipeExtracted }: RecipeImporterProps) {
  const [tab, setTab] = useState<'text' | 'image'>('text')
  const [rawText, setRawText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function startStageTicker(): () => void {
    setProcessingStage(0)
    const interval = setInterval(() => {
      setProcessingStage((prev) => (prev < PROCESSING_STAGES.length - 1 ? prev + 1 : prev))
    }, 1800)
    return () => clearInterval(interval)
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rawText.trim()) return

    setError(null)
    setIsProcessing(true)
    const stopTicker = startStageTicker()

    startTransition(async () => {
      try {
        const result = await extractRecipeFromTextAction(rawText)
        stopTicker()
        setIsProcessing(false)

        if (result.error || !result.data) {
          setError(result.error ?? 'Failed to parse recipe.')
          return
        }

        onRecipeExtracted(result.data, null)
      } catch {
        stopTicker()
        setIsProcessing(false)
        setError('Something unexpected occurred. Please try again.')
      }
    })
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, WebP).')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be under 8 MB.')
      return
    }

    setImageFile(file)
    setImageMimeType(file.type)
    setError(null)

    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleImageSubmit = async () => {
    if (!imagePreview) return

    setError(null)
    setIsProcessing(true)
    const stopTicker = startStageTicker()

    startTransition(async () => {
      try {
        const result = await extractRecipeFromImageAction(imagePreview, imageMimeType)
        stopTicker()
        setIsProcessing(false)

        if (result.error || !result.data) {
          setError(result.error ?? 'Failed to extract recipe from image.')
          return
        }

        onRecipeExtracted(result.data, imagePreview)
      } catch {
        stopTicker()
        setIsProcessing(false)
        setError('Something unexpected occurred while reading the image. Please try again.')
      }
    })
  }

  const handleClearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-center p-1 bg-muted/70 rounded-xl max-w-sm mx-auto border border-border/70">
        <button
          type="button"
          onClick={() => {
            setTab('text')
            setError(null)
          }}
          disabled={isProcessing}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            tab === 'text'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Paste Text</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab('image')
            setError(null)
          }}
          disabled={isProcessing}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            tab === 'image'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UploadCloud className="h-3.5 w-3.5" />
          <span>Upload Image</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm animate-in fade-in-50">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-xs sm:text-sm">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-destructive/80 hover:text-destructive p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Processing State Banner */}
      {isProcessing && (
        <div className="p-8 rounded-2xl border border-primary/20 bg-card text-center space-y-4 shadow-sm animate-in fade-in duration-300">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
            <div className="relative h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center text-primary">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              {PROCESSING_STAGES[processingStage]}
            </h3>
            <p className="text-xs text-muted-foreground">
              Our culinary AI is standardizing quantities, steps, and cooking timers.
            </p>
          </div>

          <div className="w-48 h-1.5 bg-muted rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${((processingStage + 1) / PROCESSING_STAGES.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tab: Paste Text */}
      {!isProcessing && tab === 'text' && (
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <div className="relative rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-colors focus-within:border-primary/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Unstructured Recipe Text
              </span>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_RECIPE_TEXT)}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Try sample recipe</span>
              </button>
            </div>

            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste recipe notes, ingredients, steps, or messy cookbook text here..."
              rows={12}
              className="w-full resize-y font-mono text-xs sm:text-sm leading-relaxed border-0 bg-transparent focus-visible:ring-0 p-0 shadow-none"
              required
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              The AI will extract ingredients, measurements, timers, and directions for your review.
            </p>
            <Button
              type="submit"
              disabled={!rawText.trim() || isProcessing}
              className="gap-2 shrink-0 font-medium"
            >
              <Sparkles className="h-4 w-4" />
              <span>Convert to Recipe</span>
            </Button>
          </div>
        </form>
      )}

      {/* Tab: Upload Image */}
      {!isProcessing && tab === 'image' && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            id="recipe-image-file-input"
          />

          {!imagePreview ? (
            <label
              htmlFor="recipe-image-file-input"
              className="flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed border-border/80 hover:border-primary/50 hover:bg-muted/40 rounded-2xl cursor-pointer transition-all text-center group"
            >
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors mb-3">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">
                Drop your recipe image here or browse
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Photos of cookbooks, magazine recipes, handwritten cards, or screenshots. Max 8 MB.
              </p>
            </label>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border bg-black/5 shadow-xs">
                <Image
                  src={imagePreview}
                  alt="Uploaded recipe preview"
                  fill
                  className="object-contain"
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 backdrop-blur-xs border border-border flex items-center justify-center text-foreground hover:bg-background transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="truncate">{imageFile?.name ?? 'Image loaded'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearImage}
                    disabled={isProcessing}
                  >
                    Change Image
                  </Button>
                  <Button
                    type="button"
                    onClick={handleImageSubmit}
                    disabled={isProcessing}
                    className="gap-2 font-medium"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Extract Recipe</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
