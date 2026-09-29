'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Utensils,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AiBadge } from './ai-badge'
import { createRecipe } from '@/features/recipes/actions'
import type { ExtractedRecipeData } from '../types'

interface RecipeAiPreviewProps {
  initialData: ExtractedRecipeData
  sourceImageUrl?: string | null
  badgeType?: 'imported' | 'modified' | 'generated'
  onStartOver: () => void
}

export function RecipeAiPreview({
  initialData,
  sourceImageUrl,
  badgeType = 'imported',
  onStartOver,
}: RecipeAiPreviewProps) {
  const router = useRouter()
  const [isSaving, startSaving] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showSourceImage, setShowSourceImage] = useState(true)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  // Local editable form state
  const [title, setTitle] = useState(initialData.title || '')
  const [description, setDescription] = useState(initialData.description || '')
  const [cuisine, setCuisine] = useState(initialData.cuisine || '')
  const [category, setCategory] = useState(initialData.category || '')
  const [prepTime, setPrepTime] = useState<string>(
    initialData.prepTime ? initialData.prepTime.toString() : ''
  )
  const [cookTime, setCookTime] = useState<string>(
    initialData.cookTime ? initialData.cookTime.toString() : ''
  )
  const [servings, setServings] = useState<string>(
    initialData.servings ? initialData.servings.toString() : '4'
  )
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(
    initialData.difficulty || 'medium'
  )
  const [tags, setTags] = useState<string[]>(initialData.tags || [])
  const [tagInput, setTagInput] = useState('')

  const [ingredients, setIngredients] = useState(
    initialData.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity || '',
      unit: ing.unit || '',
      preparationNote: ing.preparationNote || '',
      isOptional: !!ing.isOptional,
    }))
  )

  const [instructions, setInstructions] = useState(
    initialData.instructions.map((inst, i) => ({
      stepNumber: i + 1,
      instruction: inst.instruction,
      timerDuration: inst.timerDuration ? inst.timerDuration.toString() : '',
    }))
  )

  // Ingredient helpers
  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { name: '', quantity: '', unit: '', preparationNote: '', isOptional: false },
    ])
  }

  const updateIngredient = (index: number, field: string, value: unknown) => {
    setIngredients((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  // Instruction helpers
  const addInstruction = () => {
    setInstructions((prev) => [
      ...prev,
      { stepNumber: prev.length + 1, instruction: '', timerDuration: '' },
    ])
  }

  const updateInstruction = (index: number, field: string, value: unknown) => {
    setInstructions((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removeInstruction = (index: number) => {
    setInstructions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((inst, idx) => ({ ...inst, stepNumber: idx + 1 }))
    )
  }

  // Tag helpers
  const addTag = () => {
    if (!tagInput.trim()) return
    const cleaned = tagInput.trim().toLowerCase()
    if (!tags.includes(cleaned)) {
      setTags((prev) => [...prev, cleaned])
    }
    setTagInput('')
  }

  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((tag) => tag !== t))
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Recipe title is required.')
      return
    }

    if (ingredients.filter((i) => i.name.trim()).length === 0) {
      setError('Please provide at least one ingredient.')
      return
    }

    if (instructions.filter((i) => i.instruction.trim()).length === 0) {
      setError('Please provide at least one instruction step.')
      return
    }

    setError(null)
    startSaving(async () => {
      try {
        const payload = {
          title: title.trim(),
          description: description.trim() || undefined,
          imageUrl: undefined,
          prepTime: prepTime ? parseInt(prepTime, 10) : undefined,
          cookTime: cookTime ? parseInt(cookTime, 10) : undefined,
          servings: servings ? parseInt(servings, 10) : undefined,
          difficulty,
          cuisine: cuisine.trim() || undefined,
          category: category.trim() || undefined,
          tags,
          ingredients: ingredients
            .filter((i) => i.name.trim())
            .map((i, idx) => ({
              name: i.name.trim(),
              quantity: i.quantity.trim() || undefined,
              unit: i.unit.trim() || undefined,
              preparationNote: i.preparationNote.trim() || undefined,
              isOptional: i.isOptional,
              orderIndex: idx,
            })),
          instructions: instructions
            .filter((i) => i.instruction.trim())
            .map((i, idx) => ({
              stepNumber: idx + 1,
              instruction: i.instruction.trim(),
              timerDuration: i.timerDuration ? parseInt(i.timerDuration, 10) : undefined,
            })),
        }

        const res = await createRecipe(payload)
        if (res.error || !res.data) {
          setError(res.error ?? 'Failed to save recipe.')
          return
        }

        router.push(`/recipes/${res.data.id}`)
      } catch {
        setError('An unexpected error occurred while saving. Please try again.')
      }
    })
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-20">
      {/* Top Banner & Primary Actions (Explicit Preview vs Saved State) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <AiBadge type={badgeType} />
            <Badge
              variant="outline"
              className="text-[11px] font-medium border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            >
              Unsaved Preview
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-foreground tracking-tight">
            Recipe Preview
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
            Aurelia structured this entry from your source content. Review, edit any fields below, and save to your cookbook when ready.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDiscardDialog(true)}
            disabled={isSaving}
            className="gap-1.5 text-xs min-h-[40px] px-3.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Discard</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 text-xs font-semibold shadow-xs min-h-[40px] px-5"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save to Cookbook</span>
          </Button>
        </div>
      </div>

      {/* AI Extraction Confidence or Context Notes */}
      {initialData.confidenceNotes && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-0.5">
            <span className="font-semibold">AI Extraction Note:</span>{' '}
            <span className="leading-relaxed">{initialData.confidenceNotes}</span>
          </div>
        </div>
      )}

      {/* Save Error Alert */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs sm:text-sm"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="leading-relaxed font-medium">{error}</div>
        </div>
      )}

      {/* Source Image Reference (Collapsible for Cross-Checking) */}
      {sourceImageUrl && (
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Original Photo Reference
              </span>
              <span className="text-[11px] text-muted-foreground">
                (Cross-reference original text)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSourceImage(!showSourceImage)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors p-1"
            >
              {showSourceImage ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Hide Photo</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>View Photo</span>
                </>
              )}
            </button>
          </div>

          {showSourceImage && (
            <div className="relative aspect-[16/9] sm:aspect-[21/9] max-h-80 w-full rounded-xl overflow-hidden border border-border/60 bg-neutral-900/5 dark:bg-black/30">
              <Image
                src={sourceImageUrl}
                alt="Source recipe photo"
                fill
                unoptimized
                className="object-contain"
              />
            </div>
          )}
        </div>
      )}

      {/* Editable Fields Grid */}
      <div className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Basic Information</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">* Required fields</span>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="preview-title" className="text-xs font-semibold text-foreground">
                Recipe Title *
              </Label>
              <Input
                id="preview-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 font-serif text-lg sm:text-xl font-semibold h-11 tracking-tight"
                placeholder="e.g. Classic Beef Bourguignon"
                required
              />
            </div>

            <div>
              <Label htmlFor="preview-desc" className="text-xs font-semibold text-foreground">
                Description & Culinary Notes
              </Label>
              <Textarea
                id="preview-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1.5 text-xs sm:text-sm leading-relaxed resize-y"
                placeholder="A rich, fragrant French stew with red wine, carrots, and mushrooms."
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <Label htmlFor="preview-prep" className="text-xs text-muted-foreground">
                  Prep Time (min)
                </Label>
                <Input
                  id="preview-prep"
                  type="number"
                  min="0"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="mt-1 h-9 text-xs sm:text-sm"
                  placeholder="15"
                />
              </div>

              <div>
                <Label htmlFor="preview-cook" className="text-xs text-muted-foreground">
                  Cook Time (min)
                </Label>
                <Input
                  id="preview-cook"
                  type="number"
                  min="0"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  className="mt-1 h-9 text-xs sm:text-sm"
                  placeholder="30"
                />
              </div>

              <div>
                <Label htmlFor="preview-servings" className="text-xs text-muted-foreground">
                  Servings
                </Label>
                <Input
                  id="preview-servings"
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className="mt-1 h-9 text-xs sm:text-sm"
                  placeholder="4"
                />
              </div>

              <div>
                <Label htmlFor="preview-difficulty" className="text-xs text-muted-foreground">
                  Difficulty
                </Label>
                <select
                  id="preview-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-xs sm:text-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <Label htmlFor="preview-cuisine" className="text-xs text-muted-foreground">
                  Cuisine
                </Label>
                <Input
                  id="preview-cuisine"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className="mt-1 h-9 text-xs sm:text-sm"
                  placeholder="e.g. Italian, French, Mexican"
                />
              </div>
              <div>
                <Label htmlFor="preview-category" className="text-xs text-muted-foreground">
                  Category
                </Label>
                <Input
                  id="preview-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 h-9 text-xs sm:text-sm"
                  placeholder="e.g. Dinner, Soup, Dessert"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Ingredients Editor */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Utensils className="h-3.5 w-3.5 text-primary" />
                <span>Ingredients ({ingredients.length})</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quantities, units, names, and preparation notes extracted by AI.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
              className="h-8 gap-1.5 text-xs font-medium min-h-[36px]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Ingredient</span>
            </Button>
          </div>

          <div className="space-y-2.5">
            {ingredients.map((ing, idx) => (
              <div
                key={idx}
                className="p-2.5 sm:p-2 rounded-xl bg-muted/40 border border-border/60 transition-colors focus-within:border-primary/40 focus-within:bg-muted/60"
              >
                {/* Desktop layout: Single inline flex row */}
                <div className="hidden sm:flex items-center gap-2">
                  <Input
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                    placeholder="Qty"
                    aria-label={`Ingredient ${idx + 1} quantity`}
                    className="w-16 h-8 text-xs shrink-0"
                  />
                  <Input
                    value={ing.unit}
                    onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                    placeholder="Unit"
                    aria-label={`Ingredient ${idx + 1} unit`}
                    className="w-20 h-8 text-xs shrink-0"
                  />
                  <Input
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                    placeholder="Ingredient name *"
                    aria-label={`Ingredient ${idx + 1} name`}
                    className="flex-1 h-8 text-xs font-medium"
                    required
                  />
                  <Input
                    value={ing.preparationNote}
                    onChange={(e) => updateIngredient(idx, 'preparationNote', e.target.value)}
                    placeholder="Prep note (e.g. minced)"
                    aria-label={`Ingredient ${idx + 1} preparation note`}
                    className="w-36 h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(idx)}
                    aria-label={`Remove ingredient ${ing.name || idx + 1}`}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Mobile layout: Clean 2-line stacked layout to prevent cramped text & horizontal overflow */}
                <div className="sm:hidden space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={ing.name}
                      onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                      placeholder="Ingredient name *"
                      aria-label={`Ingredient ${idx + 1} name`}
                      className="flex-1 h-9 text-xs font-medium"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(idx)}
                      aria-label={`Remove ingredient ${ing.name || idx + 1}`}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                      placeholder="Qty (e.g. 2)"
                      aria-label={`Ingredient ${idx + 1} quantity`}
                      className="w-20 h-8 text-xs shrink-0"
                    />
                    <Input
                      value={ing.unit}
                      onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                      placeholder="Unit (cups)"
                      aria-label={`Ingredient ${idx + 1} unit`}
                      className="w-24 h-8 text-xs shrink-0"
                    />
                    <Input
                      value={ing.preparationNote}
                      onChange={(e) => updateIngredient(idx, 'preparationNote', e.target.value)}
                      placeholder="Prep (e.g. chopped)"
                      aria-label={`Ingredient ${idx + 1} preparation note`}
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Instructions Editor */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>Cooking Instructions ({instructions.length} steps)</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sequential cooking steps with active countdown timers.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addInstruction}
              className="h-8 gap-1.5 text-xs font-medium min-h-[36px]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Step</span>
            </Button>
          </div>

          <div className="space-y-3.5">
            {instructions.map((inst, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 sm:p-4 rounded-xl bg-muted/40 border border-border/60 focus-within:border-primary/40 focus-within:bg-muted/60 transition-colors"
              >
                <div className="h-6 w-6 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-1 shadow-xs">
                  {idx + 1}
                </div>

                <div className="flex-1 space-y-2.5">
                  <Textarea
                    value={inst.instruction}
                    onChange={(e) => updateInstruction(idx, 'instruction', e.target.value)}
                    rows={2}
                    placeholder={`Step ${idx + 1} instructions…`}
                    aria-label={`Step ${idx + 1} instructions`}
                    className="text-xs sm:text-sm leading-relaxed resize-y"
                    required
                  />

                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                      type="number"
                      min="0"
                      value={inst.timerDuration}
                      onChange={(e) => updateInstruction(idx, 'timerDuration', e.target.value)}
                      placeholder="Optional"
                      aria-label={`Step ${idx + 1} timer duration in minutes`}
                      className="w-24 h-7 text-xs"
                    />
                    <span className="text-[11px] text-muted-foreground">minute timer</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInstruction(idx)}
                  aria-label={`Remove step ${idx + 1}`}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Tags */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border/80 bg-card space-y-3.5">
          <div className="pb-2 border-b border-border/60">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tags & Categorization
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Keywords to help organize and filter recipes in your cookbook.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-border/80 text-foreground"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  aria-label={`Remove tag ${t}`}
                  className="hover:text-destructive text-muted-foreground p-0.5"
                >
                  ×
                </button>
              </span>
            ))}
            {tags.length === 0 && (
              <span className="text-xs text-muted-foreground italic">No tags added yet</span>
            )}
          </div>

          <div className="flex items-center gap-2 max-w-sm pt-1">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="Add tag (e.g. comfort-food, quick)"
              aria-label="Add a tag"
              className="h-9 text-xs sm:text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTag}
              className="h-9 px-3 text-xs shrink-0"
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
          <span>Unsaved preview — changes will not persist until saved</span>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDiscardDialog(true)}
            disabled={isSaving}
            className="text-xs min-h-[40px] px-4"
          >
            Discard
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 font-semibold text-xs min-h-[40px] px-6 shadow-xs"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save to Cookbook</span>
          </Button>
        </div>
      </div>

      {/* Discard Confirmation Dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent size="compact">
          <DialogHeader>
            <DialogTitle>Discard extracted recipe?</DialogTitle>
            <DialogDescription>
              Any adjustments or additions you made to this extracted recipe will be lost. You will return to the recipe import workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDiscardDialog(false)}
            >
              Keep Editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setShowDiscardDialog(false)
                onStartOver()
              }}
            >
              Discard Recipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
