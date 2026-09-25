import Link from 'next/link'
import { Clock, ChefHat } from 'lucide-react'
import type { Recipe } from '@/types/database'
import { FavoriteButton } from './favorite-button'
import { SafeImage } from '@/components/shared/safe-image'
import { cn } from '@/lib/utils'

interface RecipeCardProps {
  recipe: Recipe
  isFavorite?: boolean
  className?: string
}

export function RecipeCard({ recipe, isFavorite = false, className }: RecipeCardProps) {
  const difficultyVariant = {
    easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    hard: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  }

  const timeDisplay =
    recipe.total_time ??
    ((recipe.prep_time || 0) + (recipe.cook_time || 0) > 0
      ? (recipe.prep_time || 0) + (recipe.cook_time || 0)
      : null)

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xs transition-all duration-300 hover:shadow-md hover:border-border',
        className
      )}
    >
      {/* Card Media */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <SafeImage
          src={recipe.image_url}
          alt={recipe.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-muted/60 text-muted-foreground/40">
              <ChefHat className="h-12 w-12" />
            </div>
          }
        />

        {/* Favorite Floating Button */}
        <div className="absolute right-3 top-3 z-10">
          <FavoriteButton recipeId={recipe.id} initialFavorite={isFavorite} size="sm" />
        </div>

        {/* Difficulty Badge */}
        {recipe.difficulty && (
          <div className="absolute left-3 top-3 z-10">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-xs capitalize',
                difficultyVariant[recipe.difficulty]
              )}
            >
              {recipe.difficulty}
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1.5">
          {recipe.cuisine && <span>{recipe.cuisine}</span>}
          {recipe.cuisine && recipe.category && <span>•</span>}
          {recipe.category && <span>{recipe.category}</span>}
        </div>

        <h3 className="line-clamp-2 text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary mb-2">
          <Link href={`/recipes/${recipe.id}`} className="focus:outline-none">
            <span className="absolute inset-0 z-0" aria-hidden="true" />
            {recipe.title}
          </Link>
        </h3>

        {recipe.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed mb-4">
            {recipe.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
          {timeDisplay ? (
            <div className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>{timeDisplay} mins</span>
            </div>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}

          {recipe.servings && (
            <span className="font-medium">
              {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
