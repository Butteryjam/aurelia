import Link from 'next/link'
import { Clock, ChefHat } from 'lucide-react'
import type { Recipe } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { FavoriteButton } from './favorite-button'
import { SafeImage } from '@/components/shared/safe-image'
import { cn } from '@/lib/utils'

interface RecipeCardProps {
  recipe: Recipe
  isFavorite?: boolean
  className?: string
  action?: React.ReactNode
}

export function RecipeCard({ recipe, isFavorite = false, className, action }: RecipeCardProps) {
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

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-card transition-all duration-200 hover:shadow-hover hover:border-border/90 active:scale-[0.995]',
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

        {/* Favorite Floating Button */}
        <div className="absolute right-3 top-3 z-10">
          <FavoriteButton
            recipeId={recipe.id}
            initialFavorite={isFavorite}
            size="sm"
            className="shadow-card"
          />
        </div>

        {/* Difficulty Badge */}
        {recipe.difficulty && (
          <div className="absolute left-3 top-3 z-10">
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
        {action && (
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
          <Link href={`/recipes/${recipe.id}`} className="focus-visible:outline-none">
            <span className="absolute inset-0 z-0" aria-hidden="true" />
            {recipe.title}
          </Link>
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
    </article>
  )
}
