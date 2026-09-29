'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SafeImage } from '@/components/shared/safe-image'
import {
  Clock,
  ChefHat,
  Share2,
  Edit,
  Check,
  Timer,
  CheckCircle2,
  Flame,
  ArrowLeft,
  UtensilsCrossed,
  FolderPlus,
  Trash2,
} from 'lucide-react'
import type { RecipeWithDetails, NutritionFacts } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ActionToolbar } from '@/components/shared/action-toolbar'
import { FavoriteButton } from './favorite-button'
import { ServingSelector } from './serving-selector'
import { DeleteRecipeDialog } from './delete-recipe-dialog'
import { AddToCollectionDialog } from '@/features/collections/components/add-to-collection-dialog'
import { AddToMealPlanButton } from '@/features/meal-planner/components/add-to-meal-plan-button'
import { RecipeAiActionsModal } from '@/features/ai/components/recipe-ai-actions-modal'
import { scaleQuantity } from '@/lib/utils/quantity-scaler'
import { cn } from '@/lib/utils'

interface RecipeDetailViewProps {
  recipe: RecipeWithDetails & { is_owner: boolean }
}

export function RecipeDetailView({ recipe }: RecipeDetailViewProps) {
  const [servings, setServings] = useState<number>(recipe.servings || 4)
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({})
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({})
  const [copied, setCopied] = useState(false)

  const baseServings = recipe.servings || 4
  const hasInstructions = Boolean(recipe.recipe_instructions && recipe.recipe_instructions.length > 0)
  const nutrition = (recipe.nutrition_facts ?? {}) as NutritionFacts

  const difficultyVariantMap: Record<string, 'difficulty-easy' | 'difficulty-medium' | 'difficulty-hard'> = {
    easy: 'difficulty-easy',
    medium: 'difficulty-medium',
    hard: 'difficulty-hard',
  }

  function toggleIngredient(id: string) {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleStep(stepNum: number) {
    setCompletedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }))
  }

  async function handleShare() {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: recipe.title,
          text: recipe.description || `Check out this recipe for ${recipe.title} on Aurelia!`,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      try {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // clipboard access denied
      }
    }
  }

  return (
    <article className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* ─── TOP NAVIGATION & ACTION TOOLBAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/60">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
          <span>Back to recipes</span>
        </Link>

        {/* Action Controls Cluster */}
        <ActionToolbar
          className="self-end sm:self-auto"
          primaryAction={
            hasInstructions ? (
              <Link href={`/recipes/${recipe.id}/cook`}>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8.5 px-3.5 gap-1.5 text-xs font-semibold shadow-xs hover:shadow-card active:scale-[0.98]"
                >
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  <span>Cook Mode</span>
                </Button>
              </Link>
            ) : null
          }
          secondaryActions={[
            <FavoriteButton key="favorite" recipeId={recipe.id} initialFavorite={recipe.is_favorite} size="md" />,
            <Link key="chef" href={`/ai-chef?recipeId=${recipe.id}`} className="hidden sm:inline-flex">
              <Button variant="outline" size="sm" className="h-8.5 gap-1.5 text-xs">
                <ChefHat className="h-3.5 w-3.5 text-primary" />
                <span>Ask Chef</span>
              </Button>
            </Link>,
            <div key="meal-plan" className="hidden sm:inline-flex">
              <AddToMealPlanButton
                recipeId={recipe.id}
                recipeTitle={recipe.title}
                recipeServings={servings}
              />
            </div>,
            <div key="collection" className="hidden sm:inline-flex">
              <AddToCollectionDialog recipeId={recipe.id} />
            </div>,
            recipe.is_owner ? (
              <div key="ai-actions" className="hidden md:inline-flex">
                <RecipeAiActionsModal recipeId={recipe.id} recipeTitle={recipe.title} />
              </div>
            ) : null,
            recipe.is_owner ? (
              <Link key="edit" href={`/recipes/${recipe.id}/edit`} className="hidden sm:inline-flex">
                <Button variant="outline" size="sm" className="h-8.5 gap-1.5 text-xs">
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
              </Link>
            ) : null,
          ].filter(Boolean)}
          overflowContent={
            <>
              <DropdownMenuItem onClick={handleShare} className="gap-2">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
                <span>{copied ? 'Link Copied' : 'Share Recipe'}</span>
              </DropdownMenuItem>

              {/* Mobile fallback for Add to Collection */}
              <div className="sm:hidden">
                <AddToCollectionDialog
                  recipeId={recipe.id}
                  trigger={
                    <button className="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent rounded-lg transition-colors text-left">
                      <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Add to Collection</span>
                    </button>
                  }
                />
              </div>

              {/* Mobile fallbacks for actions hidden on small screens */}
              <div className="sm:hidden">
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/ai-chef?recipeId=${recipe.id}`} className="gap-2">
                    <ChefHat className="h-3.5 w-3.5 text-primary" />
                    <span>Ask Chef</span>
                  </Link>
                </DropdownMenuItem>
              </div>

              {recipe.is_owner && (
                <>
                  <DropdownMenuSeparator />
                  <div className="sm:hidden">
                    <DropdownMenuItem asChild>
                      <Link href={`/recipes/${recipe.id}/edit`} className="gap-2">
                        <Edit className="h-3.5 w-3.5" />
                        <span>Edit Recipe</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>
                  <DeleteRecipeDialog
                    recipeId={recipe.id}
                    recipeTitle={recipe.title}
                    trigger={
                      <button className="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors text-left">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Recipe</span>
                      </button>
                    }
                  />
                </>
              )}
            </>
          }
        />
      </div>

      {/* ─── HERO MEDIA & TITLE SECTION ─── */}
      <div className="space-y-6">
        {recipe.image_url ? (
          <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-card group">
            <SafeImage
              src={recipe.image_url}
              alt={recipe.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.01]"
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card via-muted/40 to-card text-muted-foreground/30">
                  <ChefHat className="h-16 w-16" />
                </div>
              }
            />
          </div>
        ) : null}

        {/* Recipe Title & Metadata Eyebrow */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {recipe.cuisine && <Badge variant="tag-neutral">{recipe.cuisine}</Badge>}
            {recipe.category && <Badge variant="outline">{recipe.category}</Badge>}
            {recipe.difficulty && (
              <Badge variant={difficultyVariantMap[recipe.difficulty] || 'outline'}>
                {recipe.difficulty}
              </Badge>
            )}
            {recipe.rating && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                ★ {recipe.rating}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-foreground leading-[1.15]">
            {recipe.title}
          </h1>

          {recipe.description && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-normal max-w-3xl">
              {recipe.description}
            </p>
          )}
        </div>

        {/* ─── RECIPE QUICK STATS BAR ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 rounded-2xl border border-border bg-card text-card-foreground shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-sans font-bold uppercase tracking-wider text-muted-foreground">Prep Time</p>
              <p className="text-sm font-semibold text-foreground">{recipe.prep_time ? `${recipe.prep_time} mins` : '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0 border border-amber-500/20">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-sans font-bold uppercase tracking-wider text-muted-foreground">Cook Time</p>
              <p className="text-sm font-semibold text-foreground">{recipe.cook_time ? `${recipe.cook_time} mins` : '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-sans font-bold uppercase tracking-wider text-muted-foreground">Total Time</p>
              <p className="text-sm font-semibold text-foreground">{recipe.total_time ? `${recipe.total_time} mins` : '—'}</p>
            </div>
          </div>

          <div className="flex items-center justify-start sm:justify-end">
            <ServingSelector
              currentServings={servings}
              baseServings={baseServings}
              onChange={setServings}
            />
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT GRID: INGREDIENTS & INSTRUCTIONS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2 items-start">
        {/* Left Column: Ingredients (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card sticky top-20 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-border/80">
              <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">Ingredients</h2>
              <Badge variant="tag-neutral">
                {recipe.recipe_ingredients?.length ?? 0} items
              </Badge>
            </div>

            <div className="divide-y divide-border/40">
              {recipe.recipe_ingredients?.map((ing, idx) => {
                const scaled = scaleQuantity(ing.quantity, baseServings, servings)
                const isChecked = checkedIngredients[ing.id || idx]

                return (
                  <label
                    key={ing.id || idx}
                    className={cn(
                      'flex items-start gap-3 py-3 cursor-pointer select-none group transition-opacity duration-150',
                      isChecked && 'opacity-55'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={!!isChecked}
                      onChange={() => toggleIngredient(ing.id || idx.toString())}
                      className="mt-0.5 rounded-md border-border text-primary focus:ring-primary h-4.5 w-4.5 shrink-0 accent-primary cursor-pointer"
                    />

                    <div className="flex-1 text-sm leading-snug">
                      <span
                        className={cn(
                          'transition-all duration-150',
                          isChecked ? 'line-through text-muted-foreground' : 'text-foreground'
                        )}
                      >
                        {scaled && <strong className="font-semibold text-foreground">{scaled} </strong>}
                        {ing.unit && <span className="font-medium text-muted-foreground">{ing.unit} </span>}
                        <span>{ing.name}</span>
                        {ing.preparation_note && (
                          <span className="text-xs text-muted-foreground"> ({ing.preparation_note})</span>
                        )}
                        {ing.is_optional && (
                          <span className="text-xs italic text-muted-foreground ml-1">(optional)</span>
                        )}
                      </span>
                    </div>
                  </label>
                )
              })}

              {(!recipe.recipe_ingredients || recipe.recipe_ingredients.length === 0) && (
                <p className="text-xs text-muted-foreground py-4 italic">No ingredients listed.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Instructions & Notes (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Instructions Card */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-border/80">
              <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">Instructions</h2>
              <Badge variant="tag-neutral">
                {recipe.recipe_instructions?.length ?? 0} steps
              </Badge>
            </div>

            <div className="space-y-4">
              {recipe.recipe_instructions?.map((ins) => {
                const isDone = completedSteps[ins.step_number]
                const timerMinutes = ins.timer_duration ? Math.round(ins.timer_duration / 60) : null

                return (
                  <div
                    key={ins.id || ins.step_number}
                    className={cn(
                      'group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200',
                      isDone
                        ? 'border-emerald-600/25 bg-emerald-500/5 text-muted-foreground'
                        : 'border-border/70 bg-background/50 hover:border-border hover:bg-background/80'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleStep(ins.step_number)}
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-150',
                        isDone
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-primary/10 text-primary font-serif group-hover:bg-primary/20'
                      )}
                      aria-label={`Mark step ${ins.step_number} as ${isDone ? 'incomplete' : 'complete'}`}
                    >
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : ins.step_number}
                    </button>

                    <div className="flex-1 space-y-2">
                      <p
                        className={cn(
                          'text-sm leading-relaxed text-foreground transition-colors',
                          isDone && 'line-through text-muted-foreground'
                        )}
                      >
                        {ins.instruction}
                      </p>

                      {timerMinutes && (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          <Timer className="h-3 w-3" />
                          <span>{timerMinutes} min timer</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {(!recipe.recipe_instructions || recipe.recipe_instructions.length === 0) && (
                <p className="text-xs text-muted-foreground italic">No instructions provided.</p>
              )}
            </div>
          </div>

          {/* Chef's Notes */}
          {recipe.notes && (
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-2">
              <h3 className="font-serif text-base sm:text-lg font-semibold text-foreground">Chef&apos;s Notes</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {recipe.notes}
              </p>
            </div>
          )}

          {/* Nutrition Facts */}
          {Boolean(nutrition.calories || nutrition.protein_g || nutrition.carbs_g || nutrition.fat_g) && (
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-3">
              <h3 className="font-serif text-base font-semibold text-foreground">
                Nutrition Facts (per serving)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {nutrition.calories && (
                  <div className="rounded-xl border border-border/60 p-2.5 bg-background">
                    <p className="text-lg font-bold text-foreground">{nutrition.calories}</p>
                    <p className="text-xs text-muted-foreground">Calories</p>
                  </div>
                )}
                {nutrition.protein_g && (
                  <div className="rounded-xl border border-border/60 p-2.5 bg-background">
                    <p className="text-lg font-bold text-foreground">{nutrition.protein_g}g</p>
                    <p className="text-xs text-muted-foreground">Protein</p>
                  </div>
                )}
                {nutrition.carbs_g && (
                  <div className="rounded-xl border border-border/60 p-2.5 bg-background">
                    <p className="text-lg font-bold text-foreground">{nutrition.carbs_g}g</p>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                  </div>
                )}
                {nutrition.fat_g && (
                  <div className="rounded-xl border border-border/60 p-2.5 bg-background">
                    <p className="text-lg font-bold text-foreground">{nutrition.fat_g}g</p>
                    <p className="text-xs text-muted-foreground">Fat</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {recipe.tags.map((tag) => (
                <Badge key={tag.id} variant="tag-neutral" className="text-xs">
                  #{tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
