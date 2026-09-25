'use client'

import { useState, useEffect, useRef, useTransition, useSyncExternalStore, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  ChefHat,
  X,
  Star,
  Clock,
} from 'lucide-react'
import type { RecipeWithDetails } from '@/types/database'
import { Button } from '@/components/ui/button'
import { ServingSelector } from '@/features/recipes/components/serving-selector'
import { StepTimer } from './step-timer'
import { useWakeLock } from '../hooks/use-wake-lock'
import { scaleQuantity } from '@/lib/utils/quantity-scaler'
import { completeCookingSession } from '../actions'
import { cn } from '@/lib/utils'

interface CookModeViewProps {
  recipe: RecipeWithDetails
}

const SESSION_KEY = (recipeId: string) => `cook-mode-step-${recipeId}`

/**
 * Extract cooking duration in seconds from instruction text as fallback.
 * Matches patterns like "8-10 minutes", "5 mins", "30 seconds", "1 hour".
 */
function extractTimerDuration(instruction: string): number | null {
  const match = instruction.match(
    /(\d+(?:\.\d+)?)(?:\s*(?:-|to)\s*(\d+(?:\.\d+)?))?\s*(min(?:ute)?s?|sec(?:ond)?s?|hr|hour|hours)/i
  )
  if (!match) return null

  const num = parseFloat(match[2] ?? match[1])
  const unit = match[3].toLowerCase()

  if (unit.startsWith('sec')) return Math.round(num)
  if (unit.startsWith('hr') || unit.startsWith('hour')) return Math.round(num * 3600)
  return Math.round(num * 60)
}

/**
 * Cook Mode — mobile-first, distraction-free step-by-step cooking UI.
 *
 * Design goals (per product requirements):
 * - Large controls, minimal distractions
 * - Persistent step (survives page refresh via sessionStorage)
 * - Ingredient panel accessible from any step
 * - Reliable step navigation (never blocks)
 * - Wake Lock as progressive enhancement
 * - Serving scaling via existing scaleQuantity utility
 */
export function CookModeView({ recipe }: CookModeViewProps) {
  const router = useRouter()
  const steps = recipe.recipe_instructions ?? []
  const baseServings = recipe.servings ?? 4

  // --- State ---
  const [servings, setServings] = useState(baseServings)

  const initialStep = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        const saved = sessionStorage.getItem(SESSION_KEY(recipe.id))
        if (saved) {
          const idx = parseInt(saved, 10)
          if (!isNaN(idx) && idx >= 0 && idx < steps.length) {
            return idx
          }
        }
      } catch {
        // sessionStorage unavailable
      }
      return 0
    },
    () => 0
  )

  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null)
  const stepIndex = activeStepIndex ?? initialStep

  const [manualTimers, setManualTimers] = useState<Record<number, number>>({})
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({})
  const [showIngredients, setShowIngredients] = useState(false)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [sessionSaved, setSessionSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const stepContainerRef = useRef<HTMLDivElement>(null)

  // Wake Lock — progressive enhancement (no-op if unsupported)
  useWakeLock()

  // Persist step index to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY(recipe.id), String(stepIndex))
    } catch {
      // sessionStorage unavailable
    }
  }, [recipe.id, stepIndex])

  // Scroll step container to top on step change (mobile UX)
  useEffect(() => {
    stepContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [stepIndex])

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= steps.length) return
    setActiveStepIndex(index)
  }, [steps.length])

  const toggleStep = useCallback((stepNum: number) => {
    setCompletedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }))
  }, [])

  const currentStep = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = steps.length > 0 ? stepIndex === steps.length - 1 : false
  const totalDone = Object.values(completedSteps).filter(Boolean).length

  function handleFinish() {
    // Mark all steps done
    const allDone: Record<number, boolean> = {}
    steps.forEach((s) => (allDone[s.step_number] = true))
    setCompletedSteps(allDone)
    setShowFinishDialog(true)
  }

  function handleSaveSession() {
    startTransition(async () => {
      const result = await completeCookingSession(recipe.id, {
        notes: notes || undefined,
        rating: rating > 0 ? rating : undefined,
      })
      if (result.error) {
        setSaveError(result.error)
      } else {
        setSessionSaved(true)
        // Clear persisted step
        try {
          sessionStorage.removeItem(SESSION_KEY(recipe.id))
        } catch {
          // ignore
        }
        setActiveStepIndex(0)
      }
    })
  }

  // Global Cook Mode keyboard navigation
  useEffect(() => {
    if (steps.length === 0 || !currentStep) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInteractive = Boolean(
        target?.closest(
          'input, textarea, select, button, a, [role="button"], [role="checkbox"], [role="switch"], [role="slider"]'
        )
      )

      // Escape handling:
      // Global Cook Mode keyboard handling must not intercept Escape from active Radix dialogs.
      // Let dialogs handle their own Escape behavior. Cook Mode may use Escape for its custom ingredients drawer/panel.
      if (e.key === 'Escape') {
        const hasActiveRadixDialog = Boolean(
          document.querySelector('[data-radix-portal] [role="dialog"]') ||
          target?.closest('[data-radix-portal]')
        )
        if (hasActiveRadixDialog) {
          return
        }

        if (showFinishDialog) {
          e.preventDefault()
          setShowFinishDialog(false)
          return
        }

        if (showIngredients) {
          e.preventDefault()
          setShowIngredients(false)
          return
        }
        return
      }

      // Ignore step navigation when focus is on interactive elements
      if (isInteractive) {
        return
      }

      // Do not trigger step navigation if any modal dialog is currently open
      if (
        showFinishDialog ||
        document.querySelector('[data-radix-portal] [role="dialog"]') ||
        target?.closest('[role="dialog"]')
      ) {
        return
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (!isLast) {
          toggleStep(currentStep.step_number)
          goTo(stepIndex + 1)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (!isFirst) {
          goTo(stepIndex - 1)
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (!isLast) {
          toggleStep(currentStep.step_number)
          goTo(stepIndex + 1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [stepIndex, isFirst, isLast, currentStep, showIngredients, showFinishDialog, steps.length, goTo, toggleStep])

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <ChefHat className="h-12 w-12 text-muted-foreground" />
        <h2 className="font-serif text-xl font-bold">No instructions available</h2>
        <p className="text-muted-foreground text-sm">
          This recipe doesn&apos;t have any step-by-step instructions yet.
        </p>
        <Link href={`/recipes/${recipe.id}`}>
          <Button variant="outline">Back to Recipe</Button>
        </Link>
      </div>
    )
  }

  const scaledIngredients = (recipe.recipe_ingredients ?? []).map((ing) => ({
    ...ing,
    scaledQuantity: scaleQuantity(ing.quantity, baseServings, servings),
  }))

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden">
      {/* ─── TOP BAR ─── */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <Link
          href={`/recipes/${recipe.id}`}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Exit Cook Mode</span>
        </Link>

        {/* Recipe title */}
        <h1 className="flex-1 truncate text-center font-serif text-base font-bold text-foreground sm:text-lg">
          {recipe.title}
        </h1>

        {/* Serving selector — compact on mobile */}
        <div className="shrink-0">
          <ServingSelector
            currentServings={servings}
            baseServings={baseServings}
            onChange={setServings}
            min={1}
            max={48}
          />
        </div>
      </header>

      {/* ─── PROGRESS BAR ─── */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label={`Step ${stepIndex + 1} of ${steps.length}`}
        />
      </div>

      {/* ─── STEP COUNTER ─── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1 text-xs text-muted-foreground">
        <span>
          {totalDone} of {steps.length} steps complete
        </span>
        <span className="font-semibold text-foreground">
          Step {stepIndex + 1} / {steps.length}
        </span>
      </div>

      {/* ─── STEP DOTS ─── */}
      <div className="flex items-center justify-center gap-1.5 px-4 py-2 flex-wrap">
        {steps.map((s, i) => (
          <button
            key={s.id ?? i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to step ${i + 1}`}
            className={cn(
              'relative h-2.5 rounded-full transition-all duration-200 after:absolute after:-inset-2 after:content-[\'\'] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              i === stepIndex
                ? 'bg-primary w-6'
                : completedSteps[s.step_number]
                  ? 'bg-emerald-500 w-2.5'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/60 w-2.5'
            )}
          />
        ))}
      </div>

      {/* ─── MAIN STEP CONTENT ─── */}
      <main
        ref={stepContainerRef}
        tabIndex={-1}
        aria-live="polite"
        aria-atomic="true"
        className="flex-1 overflow-y-auto px-4 py-4 pb-32 focus:outline-none"
      >
        <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
          {/* Step header */}
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => toggleStep(currentStep.step_number)}
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors active:scale-95 sm:h-14 sm:w-14',
                completedSteps[currentStep.step_number]
                  ? 'bg-emerald-500 text-white'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              )}
              aria-label={`Mark step ${currentStep.step_number} as ${completedSteps[currentStep.step_number] ? 'incomplete' : 'complete'}`}
            >
              {completedSteps[currentStep.step_number] ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <span className="text-lg">{currentStep.step_number}</span>
              )}
            </button>

            <div className="flex-1 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Step {currentStep.step_number}
              </p>
              <p
                className={cn(
                  'mt-2 text-base leading-relaxed sm:text-lg',
                  completedSteps[currentStep.step_number]
                    ? 'text-muted-foreground line-through'
                    : 'text-foreground'
                )}
              >
                {currentStep.instruction}
              </p>
            </div>
          </div>

          {/* Timer if this step has one, or detected from text, or manually selected */}
          {(() => {
            const detectedDuration = extractTimerDuration(currentStep.instruction)
            const activeDuration =
              currentStep.timer_duration && currentStep.timer_duration > 0
                ? currentStep.timer_duration
                : (detectedDuration ?? manualTimers[currentStep.step_number])

            if (activeDuration && activeDuration > 0) {
              return (
                <div className="space-y-2">
                  <StepTimer
                    key={`${currentStep.step_number}-${activeDuration}`}
                    durationSeconds={activeDuration}
                  />
                  {!currentStep.timer_duration && !detectedDuration && (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          setManualTimers((prev) => {
                            const next = { ...prev }
                            delete next[currentStep.step_number]
                            return next
                          })
                        }
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        Remove timer
                      </button>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 p-3">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">Start step timer:</span>
                {[1, 2, 5, 8, 10, 15].map((mins) => (
                  <Button
                    key={mins}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs rounded-full"
                    onClick={() =>
                      setManualTimers((prev) => ({
                        ...prev,
                        [currentStep.step_number]: mins * 60,
                      }))
                    }
                  >
                    {mins}m
                  </Button>
                ))}
              </div>
            )
          })()}
        </div>
      </main>

      {/* ─── INGREDIENT PANEL (bottom sheet) ─── */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 flex flex-col bg-card border-t border-border shadow-2xl transition-transform duration-300',
          showIngredients ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ maxHeight: '65dvh' }}
        aria-label="Ingredients panel"
        aria-hidden={!showIngredients}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-serif text-base font-bold text-foreground">
            Ingredients ({scaledIngredients.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowIngredients(false)}
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close ingredients"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-2 divide-y divide-border/50 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {scaledIngredients.map((ing, idx) => (
            <div key={ing.id ?? idx} className="flex items-baseline gap-2 py-2.5 text-sm">
              <span className="font-semibold text-foreground min-w-0">
                {ing.scaledQuantity && <span>{ing.scaledQuantity} </span>}
                {ing.unit && (
                  <span className="text-muted-foreground font-medium">{ing.unit} </span>
                )}
                {ing.name}
              </span>
              {ing.preparation_note && (
                <span className="text-xs text-muted-foreground shrink-0">
                  ({ing.preparation_note})
                </span>
              )}
              {ing.is_optional && (
                <span className="text-xs italic text-muted-foreground shrink-0">(optional)</span>
              )}
            </div>
          ))}
          {scaledIngredients.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground italic">
              No ingredients listed.
            </p>
          )}
        </div>
      </div>

      {/* ─── BOTTOM NAVIGATION ─── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {/* Ingredients toggle */}
          <button
            type="button"
            onClick={() => setShowIngredients((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
            aria-expanded={showIngredients}
            aria-controls="ingredients-panel"
          >
            {showIngredients ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
            <span>Ingredients</span>
          </button>

          <div className="flex flex-1 items-center justify-end gap-3">
            {/* Previous */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => goTo(stepIndex - 1)}
              disabled={isFirst}
              className="h-11 px-4 disabled:opacity-30"
              aria-label="Previous step"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Prev</span>
            </Button>

            {/* Next / Finish */}
            {isLast ? (
              <Button
                size="sm"
                onClick={handleFinish}
                className="h-11 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5"
              >
                <Check className="h-4 w-4" />
                Finish Cooking
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  toggleStep(currentStep.step_number)
                  goTo(stepIndex + 1)
                }}
                className="h-11 px-5 gap-1.5"
                aria-label="Mark step done and go to next step"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── FINISH DIALOG ─── */}
      {showFinishDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="finish-dialog-title"
          aria-describedby="finish-dialog-desc"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-fade-up">
            <div className="text-center space-y-2">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto">
                <ChefHat className="h-8 w-8" />
              </div>
              <h2 id="finish-dialog-title" className="font-serif text-2xl font-bold text-foreground">
                Great cooking!
              </h2>
              <p id="finish-dialog-desc" className="text-sm text-muted-foreground">
                You just made <strong>{recipe.title}</strong>. How did it go?
              </p>
            </div>

            {/* Star rating */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                Rate this recipe
              </p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star === rating ? 0 : star)}
                    className="relative p-1.5 transition-transform hover:scale-110 active:scale-95 after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                    aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                  >
                    <Star
                      className={cn(
                        'h-8 w-8 transition-colors',
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/40'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="cook-notes"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Notes (optional)
              </label>
              <textarea
                id="cook-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you change or notice?"
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </div>

            {saveError && (
              <p role="alert" className="text-xs text-destructive text-center font-medium">{saveError}</p>
            )}

            {sessionSaved ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Session saved!</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/recipes/${recipe.id}`)}
                >
                  Back to Recipe
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSaveSession}
                  disabled={isPending}
                  className="w-full h-11"
                >
                  {isPending ? 'Saving…' : 'Save & Finish'}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => router.push(`/recipes/${recipe.id}`)}
                >
                  Skip & Exit
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
