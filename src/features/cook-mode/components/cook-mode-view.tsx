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
  Sparkles,
  Sun,
  RotateCcw,
} from 'lucide-react'
import type { RecipeWithDetails } from '@/types/database'
import { Button } from '@/components/ui/button'
import { ServingSelector } from '@/features/recipes/components/serving-selector'
import { StepTimer } from './step-timer'
import { useWakeLock } from '../hooks/use-wake-lock'
import { scaleQuantity } from '@/lib/utils/quantity-scaler'
import { completeCookingSession } from '../actions'
import { SafeImage } from '@/components/shared/safe-image'
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
 * Cook Mode — distraction-free, stove-side digital culinary companion.
 *
 * Design goals (per Aurelia luxury specification):
 * - Standing-distance step readability (24px-32px text, generous leading)
 * - Persistent step (survives page refresh via sessionStorage)
 * - Interactive ingredient drawer with prepped/completion checklist
 * - Reliable step navigation with dominant Previous / Next actions (>=44x44px)
 * - Screen Wake Lock progressive enhancement with status badge
 * - Serving scaling via existing scaleQuantity utility
 * - Refined, celebratory cooking completion session
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
  const [completedIngredients, setCompletedIngredients] = useState<Record<string, boolean>>({})
  const [showIngredients, setShowIngredients] = useState(false)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [sessionSaved, setSessionSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const stepContainerRef = useRef<HTMLDivElement>(null)

  // Wake Lock — progressive enhancement (tracks whether active)
  const { isLocked } = useWakeLock()

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

  const toggleIngredient = useCallback((id: string) => {
    setCompletedIngredients((prev) => ({ ...prev, [id]: !prev[id] }))
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
          <Button variant="outline" className="min-h-[44px] rounded-xl px-5">Back to Recipe</Button>
        </Link>
      </div>
    )
  }

  const scaledIngredients = (recipe.recipe_ingredients ?? []).map((ing) => ({
    ...ing,
    scaledQuantity: scaleQuantity(ing.quantity, baseServings, servings),
  }))

  const preppedIngredientsCount = Object.values(completedIngredients).filter(Boolean).length

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground overflow-hidden">
      {/* ─── TOP BAR ─── */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/80 bg-background/95 px-4 py-2.5 backdrop-blur-md">
        <Link
          href={`/recipes/${recipe.id}`}
          className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Exit Cook Mode and return to recipe"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Exit Cook Mode</span>
        </Link>

        {/* Recipe title with optional image thumbnail */}
        <div className="flex flex-1 items-center justify-center gap-2 truncate px-2">
          {recipe.image_url && (
            <div className="hidden md:block h-7 w-7 rounded-lg overflow-hidden border border-border/70 shrink-0">
              <SafeImage
                src={recipe.image_url}
                alt={recipe.title}
                width={28}
                height={28}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <h1 className="truncate text-center font-serif text-base font-bold text-foreground sm:text-lg">
            {recipe.title}
          </h1>
        </div>

        {/* Controls: Wake lock badge + Serving selector */}
        <div className="flex items-center gap-2 shrink-0">
          {isLocked && (
            <>
              <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <Sun className="h-3 w-3 animate-spin-slow" />
                <span>Screen Awake</span>
              </span>
              <span
                title="Screen will stay awake while cooking"
                aria-label="Screen will stay awake while cooking"
                className="lg:hidden flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </span>
            </>
          )}

          <div className="shrink-0">
            <ServingSelector
              currentServings={servings}
              baseServings={baseServings}
              onChange={setServings}
              min={1}
              max={48}
            />
          </div>
        </div>
      </header>

      {/* ─── PROGRESS BAR ─── */}
      <div className="h-1 bg-muted/60">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label={`Step ${stepIndex + 1} of ${steps.length}`}
        />
      </div>

      {/* ─── STEP COUNTER & STATUS ─── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
            ✓
          </span>
          <span>
            {totalDone} of {steps.length} steps completed
          </span>
        </div>
        <span className="font-semibold text-foreground tracking-wide">
          Step {stepIndex + 1} of {steps.length}
        </span>
      </div>

      {/* ─── STEP PILLS (INTERACTIVE NAVIGATION) ─── */}
      <div
        role="navigation"
        aria-label="Recipe steps progression"
        className="flex items-center justify-center gap-1.5 px-4 py-2 flex-wrap"
      >
        {steps.map((s, i) => {
          const isCurrent = i === stepIndex
          const isDone = completedSteps[s.step_number]

          return (
            <button
              key={s.id ?? i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to step ${i + 1}`}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'relative flex items-center justify-center min-h-[32px] sm:min-h-[36px] min-w-[32px] rounded-full transition-all text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                isCurrent
                  ? 'bg-primary text-primary-foreground px-3 shadow-2xs ring-2 ring-primary/20'
                  : isDone
                    ? 'bg-emerald-600/90 text-white w-8'
                    : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20 w-8'
              )}
            >
              {isCurrent ? (
                <span>Step {i + 1}</span>
              ) : isDone ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span>{i + 1}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ─── MAIN STEP CONTENT (Standing-distance focus) ─── */}
      <main
        ref={stepContainerRef}
        tabIndex={-1}
        aria-live="polite"
        aria-atomic="true"
        className="flex-1 overflow-y-auto px-4 py-6 pb-36 focus:outline-none"
      >
        <div className="mx-auto max-w-3xl space-y-8 animate-fade-up">
          {/* Step Hero Display */}
          <div className="flex items-start gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => toggleStep(currentStep.step_number)}
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-base font-bold transition-all active:scale-95 shadow-2xs sm:h-16 sm:w-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                completedSteps[currentStep.step_number]
                  ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                  : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
              )}
              aria-label={`Mark step ${currentStep.step_number} as ${completedSteps[currentStep.step_number] ? 'incomplete' : 'complete'}`}
            >
              {completedSteps[currentStep.step_number] ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <span className="font-serif text-xl sm:text-2xl">{currentStep.step_number}</span>
              )}
            </button>

            <div className="flex-1 pt-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step {currentStep.step_number} of {steps.length}
                </span>
                {completedSteps[currentStep.step_number] && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" />
                    Completed
                  </span>
                )}
              </div>
              <p
                className={cn(
                  'text-xl sm:text-2xl md:text-3xl font-normal leading-relaxed sm:leading-relaxed tracking-tight transition-all',
                  completedSteps[currentStep.step_number]
                    ? 'text-muted-foreground/70 line-through decoration-emerald-500/50'
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
                <div className="space-y-3 pt-2">
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
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors min-h-[36px] flex items-center gap-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Remove timer
                      </button>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-4 sm:p-5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <span>Quick Step Timer:</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground/70">
                    Tap to start a countdown
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 3, 5, 8, 10, 15, 20].map((mins) => (
                    <Button
                      key={mins}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[40px] px-3.5 text-xs rounded-xl border-border/80 hover:border-primary/50 hover:bg-primary/5 font-semibold transition-all active:scale-95"
                      onClick={() =>
                        setManualTimers((prev) => ({
                          ...prev,
                          [currentStep.step_number]: mins * 60,
                        }))
                      }
                    >
                      {mins} min{mins !== 1 ? 's' : ''}
                    </Button>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </main>

      {/* ─── INGREDIENT PANEL BACKDROP (When open) ─── */}
      {showIngredients && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setShowIngredients(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── INGREDIENT PANEL (Slide-up bottom sheet) ─── */}
      <div
        id="ingredients-panel"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex flex-col bg-card border-t border-border rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out',
          showIngredients ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ maxHeight: '70dvh' }}
        aria-label="Ingredients checklist panel"
        aria-hidden={!showIngredients}
      >
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif text-base sm:text-lg font-bold text-foreground">
              Ingredients
            </h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {preppedIngredientsCount} of {scaledIngredients.length} prepped
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowIngredients(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="Close ingredients"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-3 divide-y divide-border/40 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          {scaledIngredients.map((ing, idx) => {
            const ingKey = ing.id ?? `ing-${idx}`
            const isDone = Boolean(completedIngredients[ingKey])

            return (
              <button
                key={ingKey}
                type="button"
                onClick={() => toggleIngredient(ingKey)}
                className="flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-muted/40 rounded-xl px-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={`${ing.name}: mark as ${isDone ? 'unprepped' : 'prepped'}`}
              >
                <div
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all',
                    isDone
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-muted-foreground/40 group-hover:border-primary/60 bg-background'
                  )}
                >
                  {isDone && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium transition-all leading-snug',
                      isDone
                        ? 'line-through text-muted-foreground/70'
                        : 'text-foreground'
                    )}
                  >
                    {ing.scaledQuantity && (
                      <span className="font-bold text-foreground">
                        {ing.scaledQuantity}{' '}
                      </span>
                    )}
                    {ing.unit && (
                      <span className="text-muted-foreground font-medium">
                        {ing.unit}{' '}
                      </span>
                    )}
                    <span>{ing.name}</span>
                  </p>
                  {ing.preparation_note && (
                    <p className="text-xs text-muted-foreground/80 mt-0.5">
                      {ing.preparation_note}
                    </p>
                  )}
                </div>

                {ing.is_optional && (
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground/60 tracking-wider shrink-0 mt-0.5">
                    Optional
                  </span>
                )}
              </button>
            )
          })}

          {scaledIngredients.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground italic">
              No ingredients listed for this recipe.
            </p>
          )}
        </div>
      </div>

      {/* ─── BOTTOM NAVIGATION (Dominant Next/Prev controls) ─── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          {/* Ingredients sheet toggle */}
          <button
            type="button"
            onClick={() => setShowIngredients((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/50 px-3.5 py-2.5 text-xs font-semibold text-foreground transition-all hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[44px]"
            aria-expanded={showIngredients}
            aria-controls="ingredients-panel"
          >
            {showIngredients ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
            <span>Ingredients</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                preppedIngredientsCount > 0
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {preppedIngredientsCount > 0
                ? `${preppedIngredientsCount}/${scaledIngredients.length}`
                : scaledIngredients.length}
            </span>
          </button>

          {/* Stepper Navigation */}
          <div className="flex items-center gap-3">
            {/* Previous */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => goTo(stepIndex - 1)}
              disabled={isFirst}
              className="min-h-[44px] px-4 rounded-xl font-medium border-border/80 disabled:opacity-30"
              aria-label="Previous step"
            >
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-1.5" />
              <span>Prev</span>
            </Button>

            {/* Next / Finish */}
            {isLast ? (
              <Button
                size="sm"
                onClick={handleFinish}
                className="min-h-[44px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-xl font-semibold shadow-xs"
              >
                <Check className="h-4 w-4 stroke-[2.5]" />
                <span>Finish Cooking</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  toggleStep(currentStep.step_number)
                  goTo(stepIndex + 1)
                }}
                className="min-h-[44px] px-6 gap-2 rounded-xl font-semibold shadow-xs"
                aria-label="Mark step done and go to next step"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── FINISH DIALOG (Celebration & Session History) ─── */}
      {showFinishDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="finish-dialog-title"
          aria-describedby="finish-dialog-desc"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 animate-fade-up">
            <div className="text-center space-y-2">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto shadow-2xs border border-emerald-500/20">
                <ChefHat className="h-8 w-8" />
              </div>
              <h2
                id="finish-dialog-title"
                className="font-serif text-2xl font-bold text-foreground"
              >
                Great cooking!
              </h2>
              <p
                id="finish-dialog-desc"
                className="text-sm text-muted-foreground leading-relaxed"
              >
                You just made <strong className="text-foreground">{recipe.title}</strong>. How did it go?
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
                    className="relative p-1.5 transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
                    aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                  >
                    <Star
                      className={cn(
                        'h-8 w-8 transition-colors',
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/30 hover:text-muted-foreground/60'
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
                placeholder="What did you change, substitute, or enjoy most?"
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </div>

            {saveError && (
              <p role="alert" className="text-xs text-destructive text-center font-medium">
                {saveError}
              </p>
            )}

            {sessionSaved ? (
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-semibold">Session saved!</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full min-h-[44px] rounded-xl font-medium"
                  onClick={() => router.push(`/recipes/${recipe.id}`)}
                >
                  Back to Recipe
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 pt-2">
                <Button
                  onClick={handleSaveSession}
                  disabled={isPending}
                  className="w-full min-h-[44px] rounded-xl font-semibold shadow-xs"
                >
                  {isPending ? 'Saving…' : 'Save & Finish'}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full min-h-[44px] rounded-xl text-muted-foreground"
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
