import * as React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Shared PageHeader skeleton matching PageHeader geometry.
 */
export function PageHeaderSkeleton({
  hasBadge = true,
  hasActions = false,
  className,
}: {
  hasBadge?: boolean
  hasActions?: boolean
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2', className)}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-44 sm:w-56 rounded-xl" />
          {hasBadge && <Skeleton className="h-5 w-20 rounded-full" />}
        </div>
        <Skeleton className="h-4 w-64 sm:w-80 rounded-lg" />
      </div>
      {hasActions && (
        <div className="flex items-center gap-2.5 shrink-0 pt-1 sm:pt-0">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      )}
    </div>
  )
}

/**
 * RecipeCardSkeleton matching RecipeCard aspect-4/3 and layout.
 */
export function RecipeCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-2xl border border-border/80 bg-card p-4 space-y-3.5 shadow-card overflow-hidden',
        className
      )}
    >
      {/* Media placeholder with aspect-4/3 */}
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-muted/60">
        <Skeleton className="h-full w-full rounded-xl" />
        {/* Floating badge skeleton */}
        <div className="absolute top-2.5 left-2.5">
          <Skeleton className="h-5 w-16 rounded-full bg-background/80" />
        </div>
        {/* Favorite button skeleton */}
        <div className="absolute top-2.5 right-2.5">
          <Skeleton className="h-7 w-7 rounded-full bg-background/80" />
        </div>
      </div>

      {/* Content lines */}
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-4/5 rounded-lg" />
        <Skeleton className="h-3.5 w-full rounded-md" />
        <Skeleton className="h-3.5 w-2/3 rounded-md" />
      </div>

      {/* Bottom meta strip */}
      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <Skeleton className="h-3.5 w-16 rounded-md" />
        <Skeleton className="h-3.5 w-20 rounded-md" />
      </div>
    </div>
  )
}

/**
 * CollectionCardSkeleton matching CollectionCard layout.
 */
export function CollectionCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-card overflow-hidden',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-24 rounded-full" />
            <Skeleton className="h-3.5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-5 w-3/4 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-4 w-full rounded-md" />
      <Skeleton className="h-4 w-5/6 rounded-md" />
      <div className="pt-3 border-t border-border/60 flex items-center justify-between">
        <Skeleton className="h-3 w-20 rounded-md" />
        <Skeleton className="h-3 w-16 rounded-md" />
      </div>
    </div>
  )
}

/**
 * ShoppingRowSkeleton matching shopping list item rows.
 */
export function ShoppingRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-card/60 shadow-2xs gap-3',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Skeleton className="h-5 w-5 rounded-md shrink-0" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-5 w-14 rounded-full shrink-0" />
      <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
    </div>
  )
}

/**
 * SettingsSectionSkeleton matching SettingsView section cards.
 */
export function SettingsSectionSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-2xl border border-border/80 bg-card p-6 space-y-5 shadow-card',
        className
      )}
    >
      <div className="space-y-1.5 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-md" />
          <Skeleton className="h-5 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-3.5 w-72 rounded-md" />
      </div>
      <div className="space-y-4 pt-1">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24 rounded-md" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
      <div className="pt-2 flex justify-end">
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
    </div>
  )
}
