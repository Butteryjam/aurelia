'use client'

import { useState, useEffect, useRef, useTransition, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  Loader2,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImageUpload } from '@/components/shared/image-upload'
import { createRecipe, updateRecipe } from '@/features/recipes/actions'
import { createClient } from '@/lib/supabase/client'
import type { RecipeWithDetails } from '@/types/database'

import {
  subscribeDraft,
  notifyDraftChange,
  getUserDraftKey,
  getLegacyDraftKey,
  readSavedDraft,
  type RecipeFormData,
} from '@/features/recipes/utils/draft-store'
import {
  isIngredientRowEmpty,
  isInstructionRowEmpty,
  pruneEmptyFormRows,
} from '@/features/recipes/utils/form-helpers'

export type { RecipeFormData }

interface RecipeFormProps {
  initialData?: RecipeWithDetails & { tags?: { id: string; name: string }[] }
  mode?: 'create' | 'edit'
}

const CUISINES = [
  'Italian',
  'French',
  'Mexican',
  'Japanese',
  'Thai',
  'Mediterranean',
  'Indian',
  'Chinese',
  'American',
  'Middle Eastern',
  'Spanish',
  'Vietnamese',
]

const CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Appetizer',
  'Salad',
  'Soup',
  'Dessert',
  'Baking',
  'Side Dish',
  'Beverage',
]

export function RecipeForm({ initialData, mode = 'create' }: RecipeFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false)
  const [isDraftDismissed, setIsDraftDismissed] = useState(false)
  const [userId, setUserId] = useState<string | null>(() => initialData?.user_id ?? null)

  const userIdRef = useRef<string | null>(initialData?.user_id ?? null)

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auth sync: Resolve user via Supabase browser client post-hydration and handle account changes
  useEffect(() => {
    let isMounted = true
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted && user) {
        userIdRef.current = user.id
        setUserId((prev) => {
          if (prev !== user.id) {
            notifyDraftChange()
            return user.id
          }
          return prev
        })
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      const newUid = session?.user?.id ?? null

      // Immediately invalidate/cancel any pending autosave timer from the previous user
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }

      if (userIdRef.current !== newUid) {
        userIdRef.current = newUid
        setIsDraftDismissed(false)
        setHasRestoredDraft(false)
        setUserId(newUid)
        notifyDraftChange()
      }
    })

    return () => {
      isMounted = false
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
      subscription.unsubscribe()
    }
  }, [])

  // useSyncExternalStore: Deterministic server (false) and client initial hydration (false) snapshots.
  // localStorage only affects the rendered banner after the post-hydration store update.
  const hasSavedDraft = useSyncExternalStore(
    subscribeDraft,
    () => {
      if (mode !== 'create' || isDraftDismissed || hasRestoredDraft || !userId) {
        return false
      }
      return Boolean(readSavedDraft(userId, initialData?.id))
    },
    () => false
  )

  const defaultValues: RecipeFormData = {
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    imageUrl: initialData?.image_url ?? '',
    prepTime: initialData?.prep_time ?? '',
    cookTime: initialData?.cook_time ?? '',
    servings: initialData?.servings ?? 4,
    difficulty: (initialData?.difficulty as 'easy' | 'medium' | 'hard') ?? 'medium',
    cuisine: initialData?.cuisine ?? '',
    category: initialData?.category ?? '',
    notes: initialData?.notes ?? '',
    tags: initialData?.tags?.map((t) => t.name) ?? [],
    ingredients:
      initialData?.recipe_ingredients?.map((ing, idx) => ({
        id: ing.id,
        name: ing.name,
        quantity: ing.quantity ?? '',
        unit: ing.unit ?? '',
        preparationNote: ing.preparation_note ?? '',
        isOptional: ing.is_optional,
        orderIndex: idx,
      })) ?? [
        { name: '', quantity: '', unit: '', preparationNote: '', isOptional: false, orderIndex: 0 },
        { name: '', quantity: '', unit: '', preparationNote: '', isOptional: false, orderIndex: 1 },
      ],
    instructions:
      initialData?.recipe_instructions?.map((ins, idx) => ({
        id: ins.id,
        stepNumber: idx + 1,
        instruction: ins.instruction,
        timerDuration: ins.timer_duration ? Math.round(ins.timer_duration / 60) : '',
      })) ?? [
        { stepNumber: 1, instruction: '', timerDuration: '' },
        { stepNumber: 2, instruction: '', timerDuration: '' },
      ],
  }

  const [formData, setFormData] = useState<RecipeFormData>(defaultValues)
  const isDirty = useRef(false)

  // 2. Autosave draft to localStorage (debounced)
  useEffect(() => {
    if (!isDirty.current && mode === 'edit') return

    // Never autosave to a fallback or unscoped key when userId is unavailable
    if (!userId) return

    const scheduledUserId = userId

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }

    autosaveTimerRef.current = setTimeout(() => {
      // Re-check current authenticated user ID immediately before writing
      if (userIdRef.current !== scheduledUserId || !userIdRef.current) {
        return
      }

      if (formData.title || formData.description || formData.ingredients.some((i) => i.name)) {
        try {
          const userKey = getUserDraftKey(scheduledUserId, initialData?.id)
          const payload = { ...formData, _userId: scheduledUserId }
          // Write strictly to user-scoped key; never create or overwrite legacy unscoped key
          localStorage.setItem(userKey, JSON.stringify(payload))
          notifyDraftChange()
        } catch (e) {
          console.error('Draft save error:', e)
        }
      }
    }, 1000)

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
    }
  }, [formData, userId, initialData?.id, mode])

  // 3. Prevent accidental navigation when dirty
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  function restoreDraft() {
    try {
      const draft = readSavedDraft(userId, initialData?.id)
      if (draft?.data) {
        const cleanFormData = { ...draft.data }
        delete cleanFormData._userId
        setFormData(cleanFormData)
        setHasRestoredDraft(true)
        setIsDraftDismissed(true)
        isDirty.current = true
        notifyDraftChange()
      }
    } catch (e) {
      console.error('Failed to restore draft:', e)
    }
  }

  function discardDraft() {
    if (userId) {
      try {
        localStorage.removeItem(getUserDraftKey(userId, initialData?.id))
        const legacyKey = getLegacyDraftKey(initialData?.id)
        const savedLegacy = localStorage.getItem(legacyKey)
        if (savedLegacy) {
          const parsed = JSON.parse(savedLegacy)
          if (parsed?._userId === userId) {
            localStorage.removeItem(legacyKey)
          }
        }
      } catch {
        // ignore
      }
    }
    setIsDraftDismissed(true)
    notifyDraftChange()
  }

  // Field change helper
  function updateField<K extends keyof RecipeFormData>(key: K, value: RecipeFormData[K]) {
    isDirty.current = true
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  // Ingredient Helpers
  function addIngredient() {
    isDirty.current = true
    setFormData((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          name: '',
          quantity: '',
          unit: '',
          preparationNote: '',
          isOptional: false,
          orderIndex: prev.ingredients.length,
        },
      ],
    }))
  }

  function removeIngredient(index: number) {
    isDirty.current = true
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients
        .filter((_, i) => i !== index)
        .map((ing, idx) => ({ ...ing, orderIndex: idx })),
    }))
  }

  function updateIngredient(index: number, patch: Partial<RecipeFormData['ingredients'][number]>) {
    isDirty.current = true
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)),
    }))
  }

  function moveIngredient(index: number, direction: 'up' | 'down') {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === formData.ingredients.length - 1)
    ) {
      return
    }

    isDirty.current = true
    const newIndex = direction === 'up' ? index - 1 : index + 1
    const items = [...formData.ingredients]
    const [moved] = items.splice(index, 1)
    items.splice(newIndex, 0, moved)

    setFormData((prev) => ({
      ...prev,
      ingredients: items.map((ing, idx) => ({ ...ing, orderIndex: idx })),
    }))
  }

  // Instruction Helpers
  function addInstruction() {
    isDirty.current = true
    setFormData((prev) => ({
      ...prev,
      instructions: [
        ...prev.instructions,
        {
          stepNumber: prev.instructions.length + 1,
          instruction: '',
          timerDuration: '',
        },
      ],
    }))
  }

  function removeInstruction(index: number) {
    isDirty.current = true
    setFormData((prev) => ({
      ...prev,
      instructions: prev.instructions
        .filter((_, i) => i !== index)
        .map((ins, idx) => ({ ...ins, stepNumber: idx + 1 })),
    }))
  }

  function updateInstruction(index: number, patch: Partial<RecipeFormData['instructions'][number]>) {
    isDirty.current = true
    setFormData((prev) => ({
      ...prev,
      instructions: prev.instructions.map((ins, i) => (i === index ? { ...ins, ...patch } : ins)),
    }))
  }

  function moveInstruction(index: number, direction: 'up' | 'down') {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === formData.instructions.length - 1)
    ) {
      return
    }

    isDirty.current = true
    const newIndex = direction === 'up' ? index - 1 : index + 1
    const items = [...formData.instructions]
    const [moved] = items.splice(index, 1)
    items.splice(newIndex, 0, moved)

    setFormData((prev) => ({
      ...prev,
      instructions: items.map((ins, idx) => ({ ...ins, stepNumber: idx + 1 })),
    }))
  }

  // Tag Helpers
  function addTag() {
    const trimmed = tagInput.trim()
    if (!trimmed) return
    if (!formData.tags.includes(trimmed)) {
      isDirty.current = true
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }))
    }
    setTagInput('')
  }

  function removeTag(tagToRemove: string) {
    isDirty.current = true
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }))
  }

  // Form Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError('Recipe title is required.')
      return
    }

    // 1. Prune genuinely empty / untouched rows before validation/submission
    const { ingredients: prunedIngredients, instructions: prunedInstructions } = pruneEmptyFormRows({
      ingredients: formData.ingredients,
      instructions: formData.instructions,
    })

    // 2. Validate partially completed ingredients (preserve user input; never silently discard)
    const partiallyCompletedIng = prunedIngredients.find((ing) => !ing.name.trim())
    if (partiallyCompletedIng) {
      setError('Please provide a name for all ingredients.')
      return
    }

    // 3. Validate partially completed instructions (preserve user input; never silently discard)
    const partiallyCompletedIns = prunedInstructions.find((ins) => !ins.instruction.trim())
    if (partiallyCompletedIns) {
      setError('Please provide instructions for all steps.')
      return
    }

    // Update form state if any untouched rows were pruned so the UI reflects the change
    if (
      prunedIngredients.length !== formData.ingredients.length ||
      prunedInstructions.length !== formData.instructions.length
    ) {
      setFormData((prev) => ({
        ...prev,
        ingredients: prunedIngredients,
        instructions: prunedInstructions,
      }))
    }

    // 4. Map valid ingredients and instructions for the payload
    const validIngredients = prunedIngredients.map((ing, idx) => ({
      ...ing,
      name: ing.name.trim(),
      quantity: ing.quantity.trim() || null,
      unit: ing.unit.trim() || null,
      preparationNote: ing.preparationNote.trim() || null,
      orderIndex: idx,
    }))

    const validInstructions = prunedInstructions.map((ins, idx) => ({
      stepNumber: idx + 1,
      instruction: ins.instruction.trim(),
      timerDuration:
        typeof ins.timerDuration === 'number' && ins.timerDuration > 0
          ? ins.timerDuration * 60 // convert minutes to seconds
          : null,
    }))

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      imageUrl: formData.imageUrl.trim() || null,
      prepTime: typeof formData.prepTime === 'number' ? formData.prepTime : null,
      cookTime: typeof formData.cookTime === 'number' ? formData.cookTime : null,
      servings: typeof formData.servings === 'number' ? formData.servings : null,
      difficulty: formData.difficulty || null,
      cuisine: formData.cuisine.trim() || null,
      category: formData.category.trim() || null,
      notes: formData.notes.trim() || null,
      tags: formData.tags,
      ingredients: validIngredients,
      instructions: validInstructions,
    }

    startTransition(async () => {
      try {
        let res
        if (mode === 'create') {
          res = await createRecipe(payload)
        } else if (initialData?.id) {
          res = await updateRecipe(initialData.id, payload)
        }

        if (res?.error) {
          setError(res.error)
          return
        }

        if (res?.data?.id) {
          // Success: clean up draft
          isDirty.current = false
          if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current)
            autosaveTimerRef.current = null
          }
          if (userId) {
            try {
              localStorage.removeItem(getUserDraftKey(userId, initialData?.id))
              const legacyKey = getLegacyDraftKey(initialData?.id)
              const savedLegacy = localStorage.getItem(legacyKey)
              if (savedLegacy) {
                const parsed = JSON.parse(savedLegacy)
                if (parsed?._userId === userId) {
                  localStorage.removeItem(legacyKey)
                }
              }
            } catch {
              // ignore
            }
          }
          notifyDraftChange()
          router.push(`/recipes/${res.data.id}`)
          router.refresh()
        }
      } catch (err: unknown) {
        console.error('Submit error:', err)
        setError(err instanceof Error ? err.message : 'Could not save recipe. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-12">
      {/* Draft Restore Notification */}
      {hasSavedDraft && !hasRestoredDraft && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>You have an autosaved draft from an earlier session.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="default" onClick={restoreDraft}>
              Restore draft
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={discardDraft}>
              Discard
            </Button>
          </div>
        </div>
      )}

      {hasRestoredDraft && (
        <div aria-live="polite" className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Draft restored successfully.</span>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Header section with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mode === 'create' ? 'Create New Recipe' : 'Edit Recipe'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in the ingredients, steps, and details for your digital cookbook.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Link href={initialData ? `/recipes/${initialData.id}` : '/recipes'}>
            <Button type="button" variant="outline" size="sm" disabled={isPending}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" size="sm" disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Save Recipe' : 'Update Recipe'}
          </Button>
        </div>
      </div>

      {/* Primary Info & Hero Image */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Essential details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold">
              Recipe Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g. Pan-Seared Lemon Herb Salmon"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              required
              className="text-base font-medium h-11"
              autoFocus={mode === 'create'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              Description / Summary
            </Label>
            <Textarea
              id="description"
              placeholder="A brief story, taste profile, or highlights of this dish…"
              rows={3}
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>

          {/* Cooking Times & Servings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="prepTime" className="text-xs font-medium text-muted-foreground">
                Prep Time (mins)
              </Label>
              <Input
                id="prepTime"
                type="number"
                min="0"
                placeholder="15"
                value={formData.prepTime}
                onChange={(e) =>
                  updateField('prepTime', e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cookTime" className="text-xs font-medium text-muted-foreground">
                Cook Time (mins)
              </Label>
              <Input
                id="cookTime"
                type="number"
                min="0"
                placeholder="25"
                value={formData.cookTime}
                onChange={(e) =>
                  updateField('cookTime', e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="servings" className="text-xs font-medium text-muted-foreground">
                Servings
              </Label>
              <Input
                id="servings"
                type="number"
                min="1"
                placeholder="4"
                value={formData.servings}
                onChange={(e) =>
                  updateField('servings', e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty" className="text-xs font-medium text-muted-foreground">
                Difficulty
              </Label>
              <select
                id="difficulty"
                value={formData.difficulty}
                onChange={(e) =>
                  updateField('difficulty', e.target.value as 'easy' | 'medium' | 'hard' | '')
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Cuisine & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cuisine" className="text-xs font-medium text-muted-foreground">
                Cuisine
              </Label>
              <input
                id="cuisine"
                list="cuisine-list"
                placeholder="e.g. Italian, Thai, French"
                value={formData.cuisine}
                onChange={(e) => updateField('cuisine', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <datalist id="cuisine-list">
                {CUISINES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-xs font-medium text-muted-foreground">
                Category / Meal Type
              </Label>
              <input
                id="category"
                list="category-list"
                placeholder="e.g. Dinner, Breakfast, Soup"
                value={formData.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <datalist id="category-list">
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Image & Tags */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Recipe Photo</Label>
            <ImageUpload
              value={formData.imageUrl}
              onChange={(url) => updateField('imageUrl', url)}
              onRemove={() => updateField('imageUrl', '')}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2 rounded-xl border border-border/80 p-4 bg-card">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tags
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag (e.g. Quick, Gluten-Free)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                className="h-8 text-xs"
              />
              <Button type="button" size="sm" variant="secondary" onClick={addTag} className="h-8 text-xs">
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-destructive transition-colors ml-0.5"
                    aria-label={`Remove ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {formData.tags.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No tags added yet.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section: Ingredients */}
      <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Ingredients</h2>
            <p className="text-xs text-muted-foreground">
              Add quantities, units, and preparation notes. You can reorder ingredients anytime.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addIngredient}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Ingredient
          </Button>
        </div>

        <div className="space-y-3 pt-2">
          {formData.ingredients.map((ing, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xl border border-border/60 bg-background p-3 transition-colors hover:border-border"
            >
              {/* Order Controls */}
              <div className="flex sm:flex-col gap-1 text-muted-foreground">
                <button
                  type="button"
                  onClick={() => moveIngredient(idx, 'up')}
                  disabled={idx === 0}
                  className="rounded p-1 hover:bg-accent disabled:opacity-30"
                  aria-label="Move ingredient up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveIngredient(idx, 'down')}
                  disabled={idx === formData.ingredients.length - 1}
                  className="rounded p-1 hover:bg-accent disabled:opacity-30"
                  aria-label="Move ingredient down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Quantity */}
              <Input
                placeholder="Qty (e.g. 1 1/2)"
                value={ing.quantity}
                onChange={(e) => updateIngredient(idx, { quantity: e.target.value })}
                className="w-full sm:w-28 text-sm h-9"
              />

              {/* Unit */}
              <Input
                placeholder="Unit (cups, g)"
                value={ing.unit}
                onChange={(e) => updateIngredient(idx, { unit: e.target.value })}
                className="w-full sm:w-28 text-sm h-9"
              />

              {/* Name */}
              <Input
                placeholder="Ingredient name (e.g. Olive Oil)"
                value={ing.name}
                onChange={(e) => updateIngredient(idx, { name: e.target.value })}
                className="w-full sm:flex-1 text-sm h-9 font-medium"
                required={!isIngredientRowEmpty(ing)}
              />

              {/* Prep note */}
              <Input
                placeholder="Note (e.g. minced)"
                value={ing.preparationNote}
                onChange={(e) => updateIngredient(idx, { preparationNote: e.target.value })}
                className="w-full sm:w-36 text-xs h-9 text-muted-foreground"
              />

              {/* Optional Toggle & Delete */}
              <div className="flex items-center justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ing.isOptional}
                    onChange={(e) => updateIngredient(idx, { isOptional: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span>Opt</span>
                </label>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeIngredient(idx)}
                  className="relative h-8 w-8 p-0 text-muted-foreground hover:text-destructive after:absolute after:-inset-1 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  aria-label="Delete ingredient"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {formData.ingredients.length === 0 && (
            <div className="text-center py-6 border border-dashed rounded-xl text-xs text-muted-foreground">
              No ingredients yet. Click &quot;Add Ingredient&quot; above to add your first ingredient.
            </div>
          )}
        </div>
      </div>

      {/* Section: Instructions */}
      <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Instructions</h2>
            <p className="text-xs text-muted-foreground">
              Step-by-step preparation directions. You can attach timers to relevant steps.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addInstruction}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Step
          </Button>
        </div>

        <div className="space-y-4 pt-2">
          {formData.instructions.map((ins, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4 transition-colors hover:border-border"
            >
              {/* Step indicator & reorder */}
              <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {idx + 1}
                </span>
                <div className="flex flex-col gap-0.5 text-muted-foreground mt-1">
                  <button
                    type="button"
                    onClick={() => moveInstruction(idx, 'up')}
                    disabled={idx === 0}
                    className="rounded p-0.5 hover:bg-accent disabled:opacity-30"
                    aria-label="Move step up"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveInstruction(idx, 'down')}
                    disabled={idx === formData.instructions.length - 1}
                    className="rounded p-0.5 hover:bg-accent disabled:opacity-30"
                    aria-label="Move step down"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Textarea & Timer */}
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder={`Describe step ${idx + 1}…`}
                  rows={3}
                  value={ins.instruction}
                  onChange={(e) => updateInstruction(idx, { instruction: e.target.value })}
                  required={!isInstructionRowEmpty(ins)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Timer (mins, opt)"
                      value={ins.timerDuration}
                      onChange={(e) =>
                        updateInstruction(idx, {
                          timerDuration:
                            e.target.value === '' ? '' : parseInt(e.target.value, 10),
                        })
                      }
                      className="h-7 w-36 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">mins</span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInstruction(idx)}
                    className="relative h-7 w-7 p-0 text-muted-foreground hover:text-destructive after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                    aria-label={`Remove step ${idx + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {formData.instructions.length === 0 && (
            <div className="text-center py-6 border border-dashed rounded-xl text-xs text-muted-foreground">
              No instructions yet. Click &quot;Add Step&quot; above to begin.
            </div>
          )}
        </div>
      </div>

      {/* Section: Chef's Notes */}
      <div className="space-y-2 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
        <Label htmlFor="notes" className="text-sm font-semibold">
          Chef&apos;s Notes &amp; Storage Tips
        </Label>
        <Textarea
          id="notes"
          placeholder="Special wine pairings, dietary substitutes, reheating guidelines, or refrigeration tips…"
          rows={3}
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
        />
      </div>

      {/* Bottom submit row */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link href={initialData ? `/recipes/${initialData.id}` : '/recipes'}>
          <Button type="button" variant="outline" disabled={isPending}>
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={isPending} className="gap-2 min-w-32">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Save Recipe' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
