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
} from 'lucide-react'
import type { RecipeWithDetails, NutritionFacts } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

  const difficultyVariant = {
    easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    hard: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  }

  function toggleIngredient(id: string) {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleStep(stepNum: number) {
    setCompletedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }))
  }

  async function handleShare() {
    try {
      if (navigator.share) {
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
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const nutrition = (recipe.nutrition_facts ?? {}) as NutritionFacts

  return (
    <article className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Top Navigation & Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/recipes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to recipes</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Share button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="h-8 gap-1.5 text-xs"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
            <span>{copied ? 'Link Copied' : 'Share'}</span>
          </Button>

          {/* Cook Mode button */}
          {recipe.recipe_instructions && recipe.recipe_instructions.length > 0 && (
            <Link href={`/recipes/${recipe.id}/cook`}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/5 dark:text-emerald-400"
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
                <span>Cook Mode</span>
              </Button>
            </Link>
          )}

          {/* Ask Chef button */}
          <Link href={`/ai-chef?recipeId=${recipe.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs border-primary/30 hover:bg-primary/5"
            >
              <ChefHat className="h-3.5 w-3.5 text-primary" />
              <span>Ask Chef</span>
            </Button>
          </Link>

          {/* Add to Meal Plan button */}
          <AddToMealPlanButton
            recipeId={recipe.id}
            recipeTitle={recipe.title}
            recipeServings={servings}
          />

          {/* AI Modify Modal */}
          {recipe.is_owner && (
            <RecipeAiActionsModal recipeId={recipe.id} recipeTitle={recipe.title} />
          )}

          {/* Add to Collection */}
          <AddToCollectionDialog recipeId={recipe.id} />

          {/* Favorite button */}
          <FavoriteButton recipeId={recipe.id} initialFavorite={recipe.is_favorite} size="sm" />

          {/* Owner actions */}
          {recipe.is_owner && (
            <>
              <Link href={`/recipes/${recipe.id}/edit`}>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
              </Link>
              <DeleteRecipeDialog recipeId={recipe.id} recipeTitle={recipe.title} />
            </>
          )}
        </div>
      </div>

      {/* Hero Media & Title Section */}
      <div className="space-y-6">
        {recipe.image_url ? (
          <div className="relative aspect-[21/9] sm:aspect-[16/7] w-full overflow-hidden rounded-2xl border border-border/80 bg-muted shadow-xs">
            <SafeImage
              src={recipe.image_url}
              alt={recipe.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-cover"
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-muted/60 text-muted-foreground/40">
                  <ChefHat className="h-16 w-16" />
                </div>
              }
            />
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            {recipe.cuisine && <Badge variant="secondary">{recipe.cuisine}</Badge>}
            {recipe.category && <Badge variant="outline">{recipe.category}</Badge>}
            {recipe.difficulty && (
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
                  difficultyVariant[recipe.difficulty]
                )}
              >
                {recipe.difficulty}
              </span>
            )}
            {recipe.rating && (
              <span className="flex items-center gap-1 font-semibold text-amber-500">
                ★ {recipe.rating}
              </span>
            )}
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
            {recipe.title}
          </h1>

          {recipe.description && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-normal">
              {recipe.description}
            </p>
          )}
        </div>

        {/* Recipe Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prep Time</p>
              <p className="text-sm font-semibold">{recipe.prep_time ? `${recipe.prep_time} mins` : '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cook Time</p>
              <p className="text-sm font-semibold">{recipe.cook_time ? `${recipe.cook_time} mins` : '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Time</p>
              <p className="text-sm font-semibold">{recipe.total_time ? `${recipe.total_time} mins` : '—'}</p>
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

      {/* Main Content Grid: Ingredients & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* Left Column: Ingredients (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs sticky top-20">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="font-serif text-xl font-bold text-foreground">Ingredients</h2>
              <span className="text-xs text-muted-foreground font-medium">
                {recipe.recipe_ingredients?.length ?? 0} items
              </span>
            </div>

            <div className="divide-y divide-border/50 pt-2">
              {recipe.recipe_ingredients?.map((ing, idx) => {
                const scaled = scaleQuantity(ing.quantity, baseServings, servings)
                const isChecked = checkedIngredients[ing.id || idx]

                return (
                  <label
                    key={ing.id || idx}
                    className="flex items-start gap-3 py-3 cursor-pointer select-none group transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={!!isChecked}
                      onChange={() => toggleIngredient(ing.id || idx.toString())}
                      className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4 shrink-0"
                    />

                    <div className="flex-1 text-sm leading-snug">
                      <span
                        className={cn(
                          'transition-all duration-200',
                          isChecked ? 'line-through text-muted-foreground/60' : 'text-foreground'
                        )}
                      >
                        {scaled && <strong className="font-semibold">{scaled} </strong>}
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
          {/* Instructions */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h2 className="font-serif text-xl font-bold text-foreground">Instructions</h2>
              <span className="text-xs text-muted-foreground font-medium">
                {recipe.recipe_instructions?.length ?? 0} steps
              </span>
            </div>

            <div className="space-y-6">
              {recipe.recipe_instructions?.map((ins) => {
                const isDone = completedSteps[ins.step_number]
                const timerMinutes = ins.timer_duration ? Math.round(ins.timer_duration / 60) : null

                return (
                  <div
                    key={ins.id || ins.step_number}
                    className={cn(
                      'flex items-start gap-4 p-4 rounded-xl border transition-all duration-200',
                      isDone
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-muted-foreground'
                        : 'border-border/60 bg-background/50 hover:border-border'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleStep(ins.step_number)}
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                        isDone
                          ? 'bg-emerald-500 text-white'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      )}
                      aria-label={`Mark step ${ins.step_number} as ${isDone ? 'incomplete' : 'complete'}`}
                    >
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : ins.step_number}
                    </button>

                    <div className="flex-1 space-y-2">
                      <p
                        className={cn(
                          'text-sm leading-relaxed',
                          isDone && 'line-through text-muted-foreground'
                        )}
                      >
                        {ins.instruction}
                      </p>

                      {timerMinutes && (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary">
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
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-2">
              <h3 className="font-serif text-lg font-bold text-foreground">Chef&apos;s Notes</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {recipe.notes}
              </p>
            </div>
          )}

          {/* Nutrition Facts if available */}
          {Boolean(nutrition.calories || nutrition.protein_g || nutrition.carbs_g || nutrition.fat_g) && (
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
              <h3 className="font-serif text-base font-bold text-foreground">
                Nutrition Facts (per serving)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {nutrition.calories && (
                  <div className="rounded-xl border border-border/50 p-2.5 bg-background">
                    <p className="text-lg font-bold text-foreground">{nutrition.calories}</p>
                    <p className="text-xs text-muted-foreground">Calories</p>
                  </div>
                )}
                {nutrition.protein_g && (
                  <div className="rounded-xl border border-border/50 p-2.5 bg-background">
                    <p className="text-lg font-bold text-foreground">{nutrition.protein_g}g</p>
                    <p className="text-xs text-muted-foreground">Protein</p>
                  </div>
                )}
                {nutrition.carbs_g && (
                  <div className="rounded-xl border border-border/50 p-2.5 bg-background">
                    <p className="text-lg font-bold text-foreground">{nutrition.carbs_g}g</p>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                  </div>
                )}
                {nutrition.fat_g && (
                  <div className="rounded-xl border border-border/50 p-2.5 bg-background">
                    <p className="text-lg font-bold text-foreground">{nutrition.fat_g}g</p>
                    <p className="text-xs text-muted-foreground">Fat</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {recipe.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
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
