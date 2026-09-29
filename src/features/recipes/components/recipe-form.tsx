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
  ArrowLeft,
  Check,
  ChefHat,
  Timer,
  UtensilsCrossed,
  Tag,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  'Greek',
  'Korean',
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

const POPULAR_TAGS = [
  'Quick',
  'Weeknight',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Comfort Food',
  'High-Protein',
  'Meal Prep',
  'Holiday',
]

export function RecipeForm({ initialData, mode = 'create' }: RecipeFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false)
  const [isDraftDismissed, setIsDraftDismissed] = useState(false)
  const [isDraftSaved, setIsDraftSaved] = useState(false)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
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

  // useSyncExternalStore: Deterministic server (false) and client initial hydration (false) snapshots
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
  const [isFormDirty, setIsFormDirty] = useState(false)

  function markDirty() {
    isDirty.current = true
    setIsFormDirty(true)
    setIsDraftSaved(false)
  }

  // Autosave draft to localStorage (debounced)
  useEffect(() => {
    if (!isDirty.current && mode === 'edit') return
    if (!userId) return

    const scheduledUserId = userId

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }

    autosaveTimerRef.current = setTimeout(() => {
      if (userIdRef.current !== scheduledUserId || !userIdRef.current) {
        return
      }

      if (formData.title || formData.description || formData.ingredients.some((i) => i.name)) {
        try {
          const userKey = getUserDraftKey(scheduledUserId, initialData?.id)
          const payload = { ...formData, _userId: scheduledUserId }
          localStorage.setItem(userKey, JSON.stringify(payload))
          notifyDraftChange()
          setIsDraftSaved(true)
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

  // Prevent accidental navigation when dirty
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
        markDirty()
        setIsDraftSaved(true)
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
    setIsDraftSaved(false)
    notifyDraftChange()
  }

  // Field change helper
  function updateField<K extends keyof RecipeFormData>(key: K, value: RecipeFormData[K]) {
    markDirty()
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  // Ingredient Helpers
  function addIngredient() {
    markDirty()
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
    markDirty()
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients
        .filter((_, i) => i !== index)
        .map((ing, idx) => ({ ...ing, orderIndex: idx })),
    }))
  }

  function updateIngredient(index: number, patch: Partial<RecipeFormData['ingredients'][number]>) {
    markDirty()
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

    markDirty()
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
    markDirty()
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
    markDirty()
    setFormData((prev) => ({
      ...prev,
      instructions: prev.instructions
        .filter((_, i) => i !== index)
        .map((ins, idx) => ({ ...ins, stepNumber: idx + 1 })),
    }))
  }

  function updateInstruction(index: number, patch: Partial<RecipeFormData['instructions'][number]>) {
    markDirty()
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

    markDirty()
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
  function addTag(customTag?: string) {
    const target = customTag ?? tagInput
    const trimmed = target.trim()
    if (!trimmed) return
    if (!formData.tags.includes(trimmed)) {
      markDirty()
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }))
    }
    if (!customTag) {
      setTagInput('')
    }
  }

  function removeTag(tagToRemove: string) {
    markDirty()
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }))
  }

  const cancelDestination = initialData ? `/recipes/${initialData.id}` : '/recipes'

  function handleCancelClick() {
    if (isDirty.current) {
      setShowDiscardModal(true)
    } else {
      router.push(cancelDestination)
    }
  }

  function handleConfirmDiscard() {
    setShowDiscardModal(false)
    isDirty.current = false
    setIsFormDirty(false)
    discardDraft()
    router.push(cancelDestination)
  }

  // Total time computation for user delight
  const totalMins =
    (typeof formData.prepTime === 'number' ? formData.prepTime : 0) +
    (typeof formData.cookTime === 'number' ? formData.cookTime : 0)

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

    // 2. Validate partially completed ingredients
    const partiallyCompletedIng = prunedIngredients.find((ing) => !ing.name.trim())
    if (partiallyCompletedIng) {
      setError('Please provide a name for all ingredients.')
      return
    }

    // 3. Validate partially completed instructions
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
          ? ins.timerDuration * 60
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
          isDirty.current = false
          setIsFormDirty(false)
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
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-8 pb-28">
        {/* Navigation Breadcrumb & Page Header */}
        <div className="space-y-4">
          <Link
            href={cancelDestination}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{initialData ? `Back to ${initialData.title || 'Recipe'}` : 'Back to Recipes'}</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {mode === 'create' ? <BookOpen className="h-4 w-4" /> : <ChefHat className="h-4 w-4" />}
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {mode === 'create' ? 'Create New Recipe' : 'Edit Recipe'}
                </h1>
                {isDraftSaved && (
                  <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1 text-[11px] font-normal border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                    <span>Autosaved</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {mode === 'create'
                  ? 'Compose a handwritten entry for your personal culinary archive.'
                  : `Refine ingredients, culinary steps, and timing for ${initialData?.title || 'this dish'}.`}
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelClick}
                disabled={isPending}
                className="h-9 px-3.5 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold gap-2 shadow-xs"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {mode === 'create' ? 'Save Recipe' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

        {/* Draft Restore Notification */}
        {hasSavedDraft && !hasRestoredDraft && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  Autosaved Draft Found
                </p>
                <p className="text-xs text-muted-foreground">
                  You have an autosaved draft from an earlier session. Would you like to restore your progress?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <Button type="button" size="sm" variant="default" onClick={restoreDraft} className="h-8 px-3 text-xs">
                Restore draft
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={discardDraft} className="h-8 px-3 text-xs">
                Discard
              </Button>
            </div>
          </div>
        )}

        {hasRestoredDraft && (
          <div
            aria-live="polite"
            className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>Draft restored successfully. You can continue refining below.</span>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs sm:text-sm text-destructive font-medium shadow-xs"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        {/* Section 1: The Essentials */}
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
          <div className="border-b border-border/60 pb-3.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest text-primary uppercase">01</span>
              <span className="text-border/60">/</span>
              <h2 className="font-serif text-lg font-bold text-foreground tracking-tight">The Essentials</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recipe title, culinary summary, and hero presentation photograph.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            <div className="lg:col-span-2 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Recipe Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Pan-Seared Lemon Herb Salmon"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  required
                  className="text-base font-medium h-11 rounded-xl"
                  autoFocus={mode === 'create'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Description &amp; Highlights
                </Label>
                <Textarea
                  id="description"
                  placeholder="A brief culinary story, tasting profile, or highlights of this dish…"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  className="rounded-xl resize-y"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Recipe Photo
              </Label>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(url) => updateField('imageUrl', url)}
                onRemove={() => updateField('imageUrl', '')}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Timing, Yield & Taxonomy */}
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
          <div className="border-b border-border/60 pb-3.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest text-primary uppercase">02</span>
              <span className="text-border/60">/</span>
              <h2 className="font-serif text-lg font-bold text-foreground tracking-tight">Timing, Yield &amp; Taxonomy</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cooking duration, serving portion sizes, difficulty, and cuisine classification.
            </p>
          </div>

          <div className="space-y-5 pt-2">
            {/* Times & Servings */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prepTime" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Prep Time (mins)</span>
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
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cookTime" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-primary" />
                  <span>Cook Time (mins)</span>
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
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="servings" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <UtensilsCrossed className="h-3.5 w-3.5 text-primary" />
                  <span>Servings</span>
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
                  className="h-10 rounded-xl"
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
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="easy">Easy (Simple &amp; Quick)</option>
                  <option value="medium">Medium (Moderate Skill)</option>
                  <option value="hard">Hard (Mastery Required)</option>
                </select>
              </div>
            </div>

            {/* Total time preview pill */}
            {totalMins > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-accent/30 rounded-xl px-3 py-1.5 w-fit">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>Total kitchen time: <strong className="text-foreground font-semibold">{totalMins} minutes</strong></span>
              </div>
            )}

            {/* Cuisine & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <datalist id="category-list">
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Ingredients Archive */}
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-widest text-primary uppercase">03</span>
                <span className="text-border/60">/</span>
                <h2 className="font-serif text-lg font-bold text-foreground tracking-tight">Ingredients Archive</h2>
                <Badge variant="secondary" className="text-[11px] font-normal ml-1">
                  {formData.ingredients.length} {formData.ingredients.length === 1 ? 'item' : 'items'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add precise quantities, units, and preparation notes. Reorder anytime.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
              className="gap-1.5 text-xs h-9 self-start sm:self-auto rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Ingredient</span>
            </Button>
          </div>

          <div className="space-y-3 pt-2">
            {formData.ingredients.map((ing, idx) => (
              <div
                key={idx}
                className="group relative rounded-xl border border-border/60 bg-background/90 p-3 sm:p-3.5 transition-all hover:border-primary/40 hover:shadow-xs space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:gap-2.5"
              >
                {/* Order Controls (desktop) */}
                <div className="hidden sm:flex flex-col gap-0.5 text-muted-foreground shrink-0">
                  <button
                    type="button"
                    onClick={() => moveIngredient(idx, 'up')}
                    disabled={idx === 0}
                    className="rounded p-1 hover:bg-accent disabled:opacity-30 transition-colors"
                    aria-label="Move ingredient up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveIngredient(idx, 'down')}
                    disabled={idx === formData.ingredients.length - 1}
                    className="rounded p-1 hover:bg-accent disabled:opacity-30 transition-colors"
                    aria-label="Move ingredient down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Qty & Unit inputs */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 shrink-0">
                  <Input
                    placeholder="Qty (1 1/2)"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(idx, { quantity: e.target.value })}
                    className="w-full sm:w-24 lg:w-28 text-sm h-9 rounded-lg"
                  />
                  <Input
                    placeholder="Unit (cups, g)"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(idx, { unit: e.target.value })}
                    className="w-full sm:w-24 lg:w-28 text-sm h-9 rounded-lg"
                  />
                </div>

                {/* Ingredient Name */}
                <Input
                  placeholder="Ingredient name (e.g. Olive Oil)"
                  value={ing.name}
                  onChange={(e) => updateIngredient(idx, { name: e.target.value })}
                  className="w-full sm:flex-1 text-sm h-9 font-medium rounded-lg"
                  required={!isIngredientRowEmpty(ing)}
                />

                {/* Preparation Note */}
                <Input
                  placeholder="Prep note (e.g. minced)"
                  value={ing.preparationNote}
                  onChange={(e) => updateIngredient(idx, { preparationNote: e.target.value })}
                  className="w-full sm:w-36 lg:w-44 text-xs h-9 text-muted-foreground rounded-lg"
                />

                {/* Mobile & Desktop action controls */}
                <div className="flex items-center justify-between sm:justify-start gap-2 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
                  {/* Order Controls (mobile only) */}
                  <div className="sm:hidden flex items-center gap-1 text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => moveIngredient(idx, 'up')}
                      disabled={idx === 0}
                      className="rounded p-1.5 hover:bg-accent disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Move ingredient up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveIngredient(idx, 'down')}
                      disabled={idx === formData.ingredients.length - 1}
                      className="rounded p-1.5 hover:bg-accent disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Move ingredient down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Optional Toggle */}
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none px-2 py-1 rounded hover:bg-accent/50 min-h-[44px] sm:min-h-0">
                    <input
                      type="checkbox"
                      checked={ing.isOptional}
                      onChange={(e) => updateIngredient(idx, { isOptional: e.target.checked })}
                      className="rounded border-border"
                    />
                    <span>Opt</span>
                  </label>

                  {/* Delete button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIngredient(idx)}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-destructive shrink-0 rounded-lg flex items-center justify-center"
                    aria-label="Delete ingredient"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {formData.ingredients.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-border/80 rounded-2xl text-xs text-muted-foreground space-y-2">
                <UtensilsCrossed className="h-6 w-6 mx-auto text-muted-foreground/60" />
                <p className="font-medium text-foreground">No ingredients listed yet.</p>
                <p>Click &quot;Add Ingredient&quot; above to begin adding your pantry and produce items.</p>
              </div>
            )}
          </div>
        </section>

        {/* Section 4: Method & Timers */}
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-widest text-primary uppercase">04</span>
                <span className="text-border/60">/</span>
                <h2 className="font-serif text-lg font-bold text-foreground tracking-tight">Method &amp; Timers</h2>
                <Badge variant="secondary" className="text-[11px] font-normal ml-1">
                  {formData.instructions.length} {formData.instructions.length === 1 ? 'step' : 'steps'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Step-by-step culinary preparation. Attach timers to active cooking steps for Cook Mode.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addInstruction}
              className="gap-1.5 text-xs h-9 self-start sm:self-auto rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Step</span>
            </Button>
          </div>

          <div className="space-y-4 pt-2">
            {formData.instructions.map((ins, idx) => (
              <div
                key={idx}
                className="group relative rounded-xl border border-border/60 bg-background/90 p-4 transition-all hover:border-primary/40 hover:shadow-xs flex items-start gap-3 sm:gap-4"
              >
                {/* Step indicator & order buttons */}
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                    {idx + 1}
                  </span>
                  <div className="flex flex-col gap-0.5 text-muted-foreground mt-1">
                    <button
                      type="button"
                      onClick={() => moveInstruction(idx, 'up')}
                      disabled={idx === 0}
                      className="rounded p-1 hover:bg-accent disabled:opacity-30 transition-colors"
                      aria-label="Move step up"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveInstruction(idx, 'down')}
                      disabled={idx === formData.instructions.length - 1}
                      className="rounded p-1 hover:bg-accent disabled:opacity-30 transition-colors"
                      aria-label="Move step down"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Step content & timer */}
                <div className="flex-1 space-y-3">
                  <Textarea
                    placeholder={`Describe step ${idx + 1} with culinary precision…`}
                    rows={3}
                    value={ins.instruction}
                    onChange={(e) => updateInstruction(idx, { instruction: e.target.value })}
                    required={!isInstructionRowEmpty(ins)}
                    className="rounded-xl resize-y text-sm"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Timer duration"
                        value={ins.timerDuration}
                        onChange={(e) =>
                          updateInstruction(idx, {
                            timerDuration:
                              e.target.value === '' ? '' : parseInt(e.target.value, 10),
                          })
                        }
                        className="h-8 w-32 text-xs rounded-lg"
                      />
                      <span className="text-xs text-muted-foreground">mins</span>
                      {typeof ins.timerDuration === 'number' && ins.timerDuration > 0 && (
                        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                          Active in Cook Mode
                        </Badge>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInstruction(idx)}
                      className="h-8 px-2 text-muted-foreground hover:text-destructive gap-1 text-xs rounded-lg"
                      aria-label={`Remove step ${idx + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Remove</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {formData.instructions.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-border/80 rounded-2xl text-xs text-muted-foreground space-y-2">
                <BookOpen className="h-6 w-6 mx-auto text-muted-foreground/60" />
                <p className="font-medium text-foreground">No instruction steps recorded.</p>
                <p>Click &quot;Add Step&quot; above to write out the preparation steps.</p>
              </div>
            )}
          </div>
        </section>

        {/* Section 5: Chef's Notes & Tags */}
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
          <div className="border-b border-border/60 pb-3.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest text-primary uppercase">05</span>
              <span className="text-border/60">/</span>
              <h2 className="font-serif text-lg font-bold text-foreground tracking-tight">Chef&apos;s Notes &amp; Culinary Tags</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Special pairings, dietary highlights, refrigeration tips, and archival search tags.
            </p>
          </div>

          <div className="space-y-6 pt-2">
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Chef&apos;s Notes &amp; Storage Tips
              </Label>
              <Textarea
                id="notes"
                placeholder="Special wine pairings, dietary substitutes, reheating guidelines, or refrigeration tips…"
                rows={3}
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                className="rounded-xl resize-y"
              />
            </div>

            {/* Tags Management */}
            <div className="space-y-3 rounded-xl border border-border/60 p-4 bg-muted/20">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-primary" />
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Culinary Tags
                </Label>
              </div>

              {/* Quick suggestion pills */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-muted-foreground">Quick suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_TAGS.map((suggested) => {
                    const isSelected = formData.tags.includes(suggested)
                    return (
                      <button
                        key={suggested}
                        type="button"
                        onClick={() => (isSelected ? removeTag(suggested) : addTag(suggested))}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-accent text-muted-foreground hover:text-foreground border-border/80'
                        }`}
                      >
                        {isSelected ? `✓ ${suggested}` : `+ ${suggested}`}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Custom tag input */}
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Add custom tag (e.g. Artisanal, Wood-Fired)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  className="h-9 text-xs rounded-xl"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => addTag()}
                  className="h-9 px-4 text-xs rounded-xl shrink-0"
                >
                  Add Tag
                </Button>
              </div>

              {/* Active tags display */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 border border-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive transition-colors ml-0.5 min-h-[24px] min-w-[24px] flex items-center justify-center"
                      aria-label={`Remove ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {formData.tags.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">No tags attached to this recipe yet.</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 z-20 backdrop-blur-md bg-background/95 border-t border-border p-4 shadow-lg -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isDraftSaved ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="h-3.5 w-3.5" />
                <span>Draft autosaved locally</span>
              </span>
            ) : isFormDirty ? (
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Unsaved modifications</span>
              </span>
            ) : (
              <span>All changes saved</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelClick}
              disabled={isPending}
              className="h-9 px-4 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-9 px-5 text-xs font-semibold rounded-xl gap-2 shadow-xs min-w-32"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mode === 'create' ? 'Save Recipe' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>

      {/* Discard Confirmation Dialog */}
      <Dialog open={showDiscardModal} onOpenChange={setShowDiscardModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Discard Unsaved Changes?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1.5">
              You have unsaved changes in this recipe. Leaving now will discard your current modifications.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDiscardModal(false)}
            >
              Keep Editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDiscard}
            >
              Discard &amp; Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
