'use client'

import { useState, useTransition, useRef, type KeyboardEvent } from 'react'
import Image from 'next/image'
import {
  FileText,
  UploadCloud,
  Sparkles,
  AlertCircle,
  X,
  RotateCcw,
  CheckCircle2,
  Image as ImageIcon,
  Clock,
  Trash2,
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function RecipeImporter({ onRecipeExtracted }: RecipeImporterProps) {
  const [tab, setTab] = useState<'text' | 'image'>('text')
  const [rawText, setRawText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function startStageTicker(): () => void {
    setProcessingStage(0)
    const interval = setInterval(() => {
      setProcessingStage((prev) => (prev < PROCESSING_STAGES.length - 1 ? prev + 1 : prev))
    }, 1800)
    return () => clearInterval(interval)
  }

  const handleTextSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!rawText.trim()) return

    setError(null)
    setIsRateLimited(false)
    setIsProcessing(true)
    const stopTicker = startStageTicker()

    startTransition(async () => {
      try {
        const result = await extractRecipeFromTextAction(rawText)
        stopTicker()
        setIsProcessing(false)

        if (result.error || !result.data) {
          setError(result.error ?? 'Failed to parse recipe.')
          if (result.rateLimited || result.error?.toLowerCase().includes('wait')) {
            setIsRateLimited(true)
          }
          return
        }

        onRecipeExtracted(result.data, null)
      } catch {
        stopTicker()
        setIsProcessing(false)
        setError('Something unexpected occurred while processing the recipe. Please try again.')
      }
    })
  }

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, or WebP).')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Image file must be under 8 MB.')
      return
    }

    setImageFile(file)
    setImageMimeType(file.type)
    setError(null)
    setIsRateLimited(false)

    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleImageSubmit = async () => {
    if (!imagePreview) return

    setError(null)
    setIsRateLimited(false)
    setIsProcessing(true)
    const stopTicker = startStageTicker()

    startTransition(async () => {
      try {
        const result = await extractRecipeFromImageAction(imagePreview, imageMimeType)
        stopTicker()
        setIsProcessing(false)

        if (result.error || !result.data) {
          setError(result.error ?? 'Failed to extract recipe from photo.')
          if (result.rateLimited || result.error?.toLowerCase().includes('wait')) {
            setIsRateLimited(true)
          }
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
    setIsRateLimited(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, targetTab: 'text' | 'image') => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const nextTab = targetTab === 'text' ? 'image' : 'text'
      setTab(nextTab)
      setError(null)
      const targetElement = document.getElementById(`tab-${nextTab}`)
      targetElement?.focus()
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Import Method Tabs (Accessible Segmented Control) */}
      <div
        role="tablist"
        aria-label="Recipe Import Methods"
        className="flex items-center justify-center p-1 bg-muted/80 rounded-xl max-w-sm mx-auto border border-border/80 shadow-xs"
      >
        <button
          id="tab-text"
          role="tab"
          type="button"
          aria-selected={tab === 'text'}
          aria-controls="panel-text"
          tabIndex={tab === 'text' ? 0 : -1}
          onClick={() => {
            setTab('text')
            setError(null)
          }}
          onKeyDown={(e) => handleTabKeyDown(e, 'text')}
          disabled={isProcessing}
          className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
            tab === 'text'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Paste Recipe Text</span>
        </button>

        <button
          id="tab-image"
          role="tab"
          type="button"
          aria-selected={tab === 'image'}
          aria-controls="panel-image"
          tabIndex={tab === 'image' ? 0 : -1}
          onClick={() => {
            setTab('image')
            setError(null)
          }}
          onKeyDown={(e) => handleTabKeyDown(e, 'image')}
          disabled={isProcessing}
          className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
            tab === 'image'
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UploadCloud className="h-4 w-4" />
          <span>Upload Photo / Scan</span>
        </button>
      </div>

      {/* Error or Rate Limit Alert */}
      {error && (
        <div
          role="alert"
          className={`flex items-start gap-3 p-4 rounded-xl border text-xs sm:text-sm animate-in fade-in-50 ${
            isRateLimited
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {isRateLimited ? (
            <Clock className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 space-y-1">
            <p className="font-semibold">
              {isRateLimited ? 'Request Limit Reached' : 'Unable to Extract Recipe'}
            </p>
            <p className="leading-relaxed">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error notice"
            className="p-1 rounded-md text-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Extraction in Progress / Processing State */}
      {isProcessing && (
        <div
          role="status"
          aria-live="polite"
          className="p-8 sm:p-12 rounded-2xl border border-primary/20 bg-card text-center space-y-5 shadow-sm animate-in fade-in duration-300"
        >
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
            <div className="relative h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center text-primary shadow-xs">
              <Sparkles className="h-7 w-7 animate-pulse" />
            </div>
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-serif font-semibold text-foreground tracking-tight">
              {PROCESSING_STAGES[processingStage]}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Standardizing culinary measurements, ingredients, sequential steps, and active cooking timers.
            </p>
          </div>

          <div className="w-56 h-1.5 bg-muted rounded-full mx-auto overflow-hidden">
            <div
              role="progressbar"
              aria-label="Recipe extraction progress"
              aria-valuenow={Math.round(((processingStage + 1) / PROCESSING_STAGES.length) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${((processingStage + 1) / PROCESSING_STAGES.length) * 100}%` }}
            />
          </div>

          <p className="text-[11px] text-muted-foreground/80">
            This typically takes 5–10 seconds. Your raw notes remain safe.
          </p>
        </div>
      )}

      {/* Tab Panel 1: Paste Text */}
      {!isProcessing && tab === 'text' && (
        <form
          id="panel-text"
          role="tabpanel"
          aria-labelledby="tab-text"
          onSubmit={handleTextSubmit}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs transition-colors focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
              <label
                htmlFor="recipe-text-input"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Recipe Content
              </label>

              <div className="flex items-center gap-3">
                {rawText.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRawText('')}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRawText(SAMPLE_RECIPE_TEXT)}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 transition-colors focus-visible:outline-hidden focus-visible:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Try sample recipe</span>
                </button>
              </div>
            </div>

            <div className="pt-3">
              <Textarea
                id="recipe-text-input"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste recipe notes, ingredients, steps, or messy cookbook text here...&#10;&#10;Example:&#10;2 cups flour&#10;1 tsp baking powder&#10;Mix ingredients together and bake at 350°F for 25 minutes."
                rows={11}
                className="w-full resize-y font-sans text-sm sm:text-base leading-relaxed border-0 bg-transparent focus-visible:ring-0 p-0 shadow-none placeholder:text-muted-foreground/60"
                required
              />
            </div>

            {rawText.length > 0 && (
              <div className="pt-2 text-right">
                <span className="text-[11px] text-muted-foreground">
                  {rawText.length.toLocaleString()} characters
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
              Aurelia will extract ingredients, quantities, directions, and timers for your review.
            </p>
            <Button
              type="submit"
              disabled={rawText.trim().length < 15 || isProcessing}
              className="gap-2 shrink-0 font-medium min-h-[44px] px-6"
            >
              <Sparkles className="h-4 w-4" />
              <span>Extract Recipe</span>
            </Button>
          </div>
        </form>
      )}

      {/* Tab Panel 2: Upload Image */}
      {!isProcessing && tab === 'image' && (
        <div
          id="panel-image"
          role="tabpanel"
          aria-labelledby="tab-image"
          className="space-y-4"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageSelect}
            className="hidden"
            id="recipe-image-file-input"
            aria-label="Upload recipe photo"
          />

          {!imagePreview ? (
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Click or drop recipe photo to upload"
              className={`flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all text-center group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${
                isDragging
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border/80 hover:border-primary/50 hover:bg-muted/40 bg-card/60'
              }`}
            >
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors mb-3.5">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-sm sm:text-base font-semibold text-foreground mb-1">
                {isDragging ? 'Drop your recipe photo here' : 'Drop your recipe photo here or browse'}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-4">
                Cookbook pages, magazine clippings, screenshots, or handwritten cards.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span className="px-2 py-0.5 rounded-md bg-muted border border-border/80">JPEG</span>
                <span className="px-2 py-0.5 rounded-md bg-muted border border-border/80">PNG</span>
                <span className="px-2 py-0.5 rounded-md bg-muted border border-border/80">WebP</span>
                <span className="text-muted-foreground/60">·</span>
                <span>Up to 8 MB</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] max-h-96 w-full rounded-2xl overflow-hidden border border-border bg-neutral-900/5 dark:bg-black/30 shadow-xs">
                <Image
                  src={imagePreview}
                  alt="Uploaded recipe preview"
                  fill
                  unoptimized
                  className="object-contain"
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  aria-label="Remove uploaded image"
                  className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/85 backdrop-blur-xs border border-border flex items-center justify-center text-foreground hover:bg-background transition-colors shadow-xs"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="font-medium text-foreground truncate max-w-xs">
                    {imageFile?.name ?? 'Recipe photo'}
                  </span>
                  {imageFile && (
                    <span className="text-muted-foreground shrink-0">
                      ({formatFileSize(imageFile.size)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="min-h-[40px] text-xs gap-1.5"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>Change Photo</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleImageSubmit}
                    disabled={isProcessing}
                    className="min-h-[40px] gap-2 font-medium text-xs px-4"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
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
