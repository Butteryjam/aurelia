'use client'

import Link from 'next/link'
import {
  ChefHat,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  Users,
  Clock,
} from 'lucide-react'
import type { MealPlanItemWithRecipe } from '../types'
import { Button } from '@/components/ui/button'
import { SafeImage } from '@/components/shared/safe-image'
import { cn } from '@/lib/utils'

interface PlannedMealCardProps {
  item: MealPlanItemWithRecipe
  onEdit: (item: MealPlanItemWithRecipe) => void
  onDelete: (id: string) => void
  onToggleCooked: (id: string, current: boolean) => void
}

export function PlannedMealCard({
  item,
  onEdit,
  onDelete,
  onToggleCooked,
}: PlannedMealCardProps) {
  const displayTitle = item.recipe?.title ?? item.title
  const displayImage = item.recipe?.image_url ?? item.recipe_image_url_snapshot
  const isVaultRecipe = Boolean(item.recipe_id)

  return (
    <div
      className={cn(
        'w-full group relative flex flex-col gap-1.5 rounded-xl border p-2 transition-all duration-200 shadow-2xs hover:border-border hover:shadow-xs overflow-hidden',
        item.is_cooked
          ? 'border-emerald-500/25 bg-emerald-500/[0.04] text-muted-foreground'
          : 'border-border/80 bg-card hover:bg-card/90'
      )}
    >
      {/* Recipe Image Banner (if available) */}
      {displayImage && (
        <div className="relative h-12 w-full shrink-0 overflow-hidden rounded-lg bg-muted/60 border border-border/40">
          <SafeImage
            src={displayImage}
            alt={displayTitle}
            fill
            className={cn(
              'object-cover transition-transform duration-300 group-hover:scale-105',
              item.is_cooked && 'opacity-60 grayscale-[30%]'
            )}
            sizes="(max-width: 768px) 100vw, 180px"
          />
        </div>
      )}

      {/* 1. Meal / Recipe Title (max 2 lines, wraps cleanly) */}
      <div className="min-w-0 px-0.5">
        {isVaultRecipe ? (
          <Link
            href={`/recipes/${item.recipe_id}`}
            className={cn(
              'font-medium text-xs text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug break-normal',
              item.is_cooked && 'line-through text-muted-foreground hover:text-foreground'
            )}
            title={displayTitle}
          >
            {displayTitle}
          </Link>
        ) : (
          <span
            className={cn(
              'font-medium text-xs text-foreground line-clamp-2 leading-snug break-normal',
              item.is_cooked && 'line-through text-muted-foreground'
            )}
            title={displayTitle}
          >
            {displayTitle}
          </span>
        )}
      </div>

      {/* 2. Metadata & Status Row (Servings + Cooked toggle) */}
      <div className="flex items-center justify-between gap-1 px-0.5 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1 min-w-0">
          <span className="inline-flex items-center gap-0.5 font-medium text-foreground/80 truncate">
            <Users className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="tabular-nums font-semibold">{item.servings}p</span>
          </span>
          {item.recipe?.total_time ? (
            <>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-0.5 text-[9.5px] text-muted-foreground shrink-0 tabular-nums">
                <Clock className="h-2.5 w-2.5 shrink-0" />
                <span>{item.recipe.total_time}m</span>
              </span>
            </>
          ) : null}
        </div>

        {/* Cooked Toggle Button */}
        <button
          type="button"
          onClick={() => onToggleCooked(item.id, item.is_cooked)}
          className={cn(
            'relative inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold transition-colors border shrink-0 touch-target after:absolute after:-inset-1.5 after:content-[\'\'] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            item.is_cooked
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'
              : 'bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground'
          )}
          title={item.is_cooked ? 'Mark as uncooked' : 'Mark as cooked'}
          aria-label={item.is_cooked ? `Mark ${displayTitle} as uncooked` : `Mark ${displayTitle} as cooked`}
        >
          {item.is_cooked ? (
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
          ) : (
            <Circle className="h-2.5 w-2.5 text-muted-foreground/60 shrink-0" />
          )}
          <span>{item.is_cooked ? 'Cooked' : 'Cook'}</span>
        </button>
      </div>

      {/* Optional User Notes */}
      {item.notes && (
        <p className="text-[9.5px] text-muted-foreground line-clamp-1 italic px-0.5 border-l-2 border-primary/40 pl-1.5 py-0.2 break-normal">
          &ldquo;{item.notes}&rdquo;
        </p>
      )}

      {/* 3. Actions Toolbar */}
      <div className="flex items-center justify-between gap-1 border-t border-border/40 pt-1.5 mt-0.5 px-0.5">
        {isVaultRecipe ? (
          <Link href={`/recipes/${item.recipe_id}/cook`} className="shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1.5 text-[9.5px] gap-1 font-medium text-primary hover:bg-primary/10 hover:text-primary rounded-md"
              title="Launch Cook Mode"
            >
              <ChefHat className="h-3 w-3" />
              <span>Cook Mode</span>
            </Button>
          </Link>
        ) : (
          <span className="text-[9px] text-muted-foreground/50 italic font-sans">
            Custom
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="relative h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors touch-target after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            title="Edit meal"
            aria-label={`Edit ${displayTitle}`}
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="relative h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors touch-target after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
            title="Remove meal"
            aria-label={`Remove ${displayTitle} from meal plan`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
