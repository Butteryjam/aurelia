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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AiBadge type={badgeType} />
            <span className="text-xs text-muted-foreground font-medium">Review & Edit</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-serif text-foreground">
            Recipe Preview
          </h2>
          <p className="text-xs text-muted-foreground">
            Review the extracted details below. Make any adjustments, then save directly to your archive.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onStartOver}
            disabled={isSaving}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Discard</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 text-xs font-semibold shadow-xs"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Save to Cookbook</span>
          </Button>
        </div>
      </div>

      {/* Confidence notes or warnings */}
      {initialData.confidenceNotes && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-semibold">AI Extraction Note:</span> {initialData.confidenceNotes}
          </div>
        </div>
      )}

      {/* Save Error */}
      {error && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium">
          {error}
        </div>
      )}

      {/* Source Image if present */}
      {sourceImageUrl && (
        <div className="relative aspect-[21/9] sm:aspect-[16/6] w-full rounded-2xl overflow-hidden border border-border bg-black/5">
          <Image
            src={sourceImageUrl}
            alt="Source recipe photo"
            fill
            className="object-contain"
          />
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-xs text-[11px] font-medium text-foreground">
            Source Image
          </div>
        </div>
      )}

      {/* Editable Fields Grid */}
      <div className="space-y-6">
        {/* Core Info */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Basic Information
          </h3>

          <div className="space-y-3">
            <div>
              <Label htmlFor="preview-title" className="text-xs font-medium">
                Recipe Title *
              </Label>
              <Input
                id="preview-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 font-serif text-base sm:text-lg font-semibold"
                placeholder="e.g. Classic Beef Bourguignon"
              />
            </div>

            <div>
              <Label htmlFor="preview-desc" className="text-xs font-medium">
                Description
              </Label>
              <Textarea
                id="preview-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 text-xs sm:text-sm"
                placeholder="A rich, fragrant French stew with red wine, carrots, and mushrooms."
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <Label className="text-xs text-muted-foreground">Prep Time (min)</Label>
                <Input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  placeholder="15"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Cook Time (min)</Label>
                <Input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  placeholder="30"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Servings</Label>
                <Input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  placeholder="4"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Difficulty</Label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <Label className="text-xs text-muted-foreground">Cuisine</Label>
                <Input
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  placeholder="e.g. Italian, Mexican, Thai"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  placeholder="e.g. Dinner, Soup, Dessert"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ingredients Editor */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Ingredients ({ingredients.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Amounts, units, and ingredient names extracted by AI.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
              className="h-8 gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Ingredient</span>
            </Button>
          </div>

          <div className="space-y-2">
            {ingredients.map((ing, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/50 group"
              >
                <Input
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                  placeholder="Qty"
                  className="w-16 h-8 text-xs shrink-0"
                />
                <Input
                  value={ing.unit}
                  onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                  placeholder="Unit"
                  className="w-20 h-8 text-xs shrink-0"
                />
                <Input
                  value={ing.name}
                  onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                  placeholder="Ingredient name *"
                  className="flex-1 h-8 text-xs font-medium"
                />
                <Input
                  value={ing.preparationNote}
                  onChange={(e) => updateIngredient(idx, 'preparationNote', e.target.value)}
                  placeholder="Prep note (e.g. minced)"
                  className="w-32 h-8 text-xs hidden sm:block"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeIngredient(idx)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions Editor */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Instructions ({instructions.length} steps)
              </h3>
              <p className="text-xs text-muted-foreground">
                Sequential steps and active timer durations in minutes.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addInstruction}
              className="h-8 gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Step</span>
            </Button>
          </div>

          <div className="space-y-3">
            {instructions.map((inst, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
              >
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-1">
                  {idx + 1}
                </div>

                <div className="flex-1 space-y-2">
                  <Textarea
                    value={inst.instruction}
                    onChange={(e) => updateInstruction(idx, 'instruction', e.target.value)}
                    rows={2}
                    placeholder={`Step ${idx + 1} instructions…`}
                    className="text-xs sm:text-sm resize-y"
                  />

                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      value={inst.timerDuration}
                      onChange={(e) => updateInstruction(idx, 'timerDuration', e.target.value)}
                      placeholder="Timer (min)"
                      className="w-28 h-7 text-xs"
                    />
                    <span className="text-[11px] text-muted-foreground">min timer</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInstruction(idx)}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 mt-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Tags
          </h3>

          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-border/80"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="hover:text-destructive ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-xs">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="Add tag (e.g. comfort-food)"
              className="h-8 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTag}
              className="h-8 text-xs"
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Floating Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onStartOver}
          disabled={isSaving}
          className="text-xs"
        >
          Discard
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2 font-semibold text-xs px-6"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>Save Recipe to Archive</span>
        </Button>
      </div>
    </div>
  )
}
