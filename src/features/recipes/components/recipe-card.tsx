'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Clock, ChefHat, Check, MoreVertical, Trash2 } from 'lucide-react'
import type { Recipe } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { FavoriteButton } from './favorite-button'
import { SafeImage } from '@/components/shared/safe-image'
import { DeleteRecipeDialog } from './delete-recipe-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface RecipeCardProps {
  recipe: Recipe
  isFavorite?: boolean
  className?: string
  action?: React.ReactNode
  isSelectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (recipeId: string) => void
  onDeleteSuccess?: (recipeId: string) => void
}

export const RecipeCard = React.memo(function RecipeCard({
  recipe,
  isFavorite = false,
  className,
  action,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onDeleteSuccess,
}: RecipeCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const difficultyVariantMap: Record<string, 'difficulty-easy' | 'difficulty-medium' | 'difficulty-hard'> = {
    easy: 'difficulty-easy',
    medium: 'difficulty-medium',
    hard: 'difficulty-hard',
  }

  const timeDisplay =
    recipe.total_time ??
    ((recipe.prep_time || 0) + (recipe.cook_time || 0) > 0
      ? (recipe.prep_time || 0) + (recipe.cook_time || 0)
      : null)

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault()
      e.stopPropagation()
      onToggleSelect?.(recipe.id)
    }
  }

  const handleCheckboxKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onToggleSelect?.(recipe.id)
    }
  }

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-card transition-all duration-200',
        isSelectionMode
          ? 'cursor-pointer select-none hover:border-primary/60'
          : 'hover:shadow-hover hover:border-border/90 active:scale-[0.995]',
        isSelected
          ? 'ring-2 ring-primary border-primary bg-primary/[0.02]'
          : 'border-border',
        className
      )}
    >
      {/* Selection Mode Indicator Checkbox */}
      {isSelectionMode && (
        <div className="absolute left-3 top-3 z-30">
          <div
            role="checkbox"
            tabIndex={0}
            aria-checked={isSelected}
            aria-label={isSelected ? `Deselect ${recipe.title}` : `Select ${recipe.title}`}
            onKeyDown={handleCheckboxKeyDown}
            className={cn(
              'h-6 w-6 rounded-md border flex items-center justify-center transition-all duration-150 shadow-md backdrop-blur-md',
              isSelected
                ? 'bg-primary border-primary text-primary-foreground'
                : 'bg-background/90 border-border/80 text-transparent hover:border-primary'
            )}
          >
            <Check className={cn('h-3.5 w-3.5 stroke-[3]', isSelected ? 'opacity-100' : 'opacity-0')} />
          </div>
        </div>
      )}

      {/* Card Media */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <SafeImage
          src={recipe.image_url}
          alt={recipe.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-muted/70 text-muted-foreground/40">
              <ChefHat className="h-12 w-12 stroke-[1.5]" />
            </div>
          }
        />

        {/* Subtle Scrim for Top Badges */}
        <div
          className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 via-black/10 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Floating Controls: Favorite & Contextual Menu (hidden in selection mode) */}
        {!isSelectionMode && (
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
            <FavoriteButton
              recipeId={recipe.id}
              initialFavorite={isFavorite}
              size="sm"
              className="shadow-card"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Options for ${recipe.title}`}
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8 rounded-full bg-background/85 dark:bg-card/85 backdrop-blur-md border border-border/80 shadow-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteDialogOpen(true)
                  }}
                  className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Recipe</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Difficulty Badge (offset in selection mode so checkbox is clear) */}
        {recipe.difficulty && (
          <div className={cn('absolute top-3 z-10', isSelectionMode ? 'left-11' : 'left-3')}>
            <Badge
              variant={difficultyVariantMap[recipe.difficulty] || 'tag-neutral'}
              size="sm"
              className="backdrop-blur-md bg-background/85 dark:bg-card/85 shadow-2xs font-semibold capitalize border"
            >
              {recipe.difficulty}
            </Badge>
          </div>
        )}

        {/* Optional Action Overlay (e.g. contextual remove button) */}
        {action && !isSelectionMode && (
          <div className="absolute bottom-2.5 left-2.5 z-20">
            {action}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Eyebrow metadata */}
        <div className="flex items-center gap-1.5 text-[11px] font-sans font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
          {recipe.cuisine && <span>{recipe.cuisine}</span>}
          {recipe.cuisine && recipe.category && <span aria-hidden="true">•</span>}
          {recipe.category && <span>{recipe.category}</span>}
          {!recipe.cuisine && !recipe.category && <span>Culinary Note</span>}
        </div>

        {/* Title: Editorial serif font with consistent height */}
        <h3 className="line-clamp-2 text-base sm:text-lg font-serif font-bold tracking-tight text-foreground transition-colors group-hover:text-primary mb-2 min-h-[3rem] leading-snug">
          {isSelectionMode ? (
            <span className="focus-visible:outline-none">
              {recipe.title}
            </span>
          ) : (
            <Link href={`/recipes/${recipe.id}`} className="focus-visible:outline-none">
              <span className="absolute inset-0 z-0" aria-hidden="true" />
              {recipe.title}
            </Link>
          )}
        </h3>

        {/* Description: Clean 2-line clamp with consistent height */}
        <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed mb-4 min-h-[2.25rem]">
          {recipe.description || 'No description provided for this culinary entry.'}
        </p>

        {/* Card Footer: Metadata alignment */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/60 text-xs text-muted-foreground">
          {timeDisplay ? (
            <div className="flex items-center gap-1.5 font-medium text-foreground/80">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{timeDisplay} mins</span>
            </div>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}

          {recipe.servings ? (
            <span className="font-medium text-muted-foreground">
              {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Contextual Delete Dialog from Card */}
      {deleteDialogOpen && (
        <DeleteRecipeDialog
          recipeId={recipe.id}
          recipeTitle={recipe.title}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          redirectTo={null}
          onSuccess={() => onDeleteSuccess?.(recipe.id)}
        />
      )}
    </article>
  )
})
