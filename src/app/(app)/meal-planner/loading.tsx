import { Skeleton } from '@/components/ui/skeleton'
import { PageHeaderSkeleton } from '@/components/shared/skeletons'

export default function MealPlannerLoading() {
  return (
    <div
      role="status"
      aria-label="Loading Weekly Meal Planner"
      className="space-y-6 pb-16 animate-fade-in"
    >
      <span className="sr-only">Preparing weekly meal plan…</span>

      {/* Page Header Skeleton */}
      <PageHeaderSkeleton hasBadge />

      {/* Week Navigation Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-2xs">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-40 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-9 w-16 rounded-xl" />
        </div>
        <Skeleton className="h-9 w-44 rounded-xl" />
      </div>

      {/* Mobile Day Tabs Skeleton (visible on mobile only) */}
      <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto pb-1">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-12 rounded-xl shrink-0" />
        ))}
      </div>

      {/* 7-Day Week Columns Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 sm:gap-3.5">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-2xl border border-border/70 bg-card/60 p-3 space-y-3 shadow-2xs',
              // On mobile, show only the first day column to prevent vertical stacking bloat
              i > 0 && 'hidden sm:block'
            )}
          >
            {/* Day Header */}
            <div className="border-b border-border/60 pb-2 flex sm:flex-col items-center justify-between sm:justify-center gap-1">
              <Skeleton className="h-3.5 w-12 rounded-md" />
              <Skeleton className="h-6 w-8 rounded-full" />
            </div>

            {/* 4 Meal Slots: Breakfast, Lunch, Dinner, Snack */}
            <div className="space-y-2.5">
              {[...Array(4)].map((_, slotIdx) => (
                <div key={slotIdx} className="space-y-1">
                  <div className="flex items-center">
                    <Skeleton className="h-3 w-12 rounded-md" />
                  </div>
                  <div className="h-16 w-full rounded-xl border border-dashed border-border/80 bg-muted/20 p-2 flex items-center justify-center">
                    <Skeleton className="h-3 w-14 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}
