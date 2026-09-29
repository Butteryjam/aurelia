import { Skeleton } from '@/components/ui/skeleton'
import { PageHeaderSkeleton, RecipeCardSkeleton } from '@/components/shared/skeletons'

export default function RecipesLoading() {
  return (
    <div
      role="status"
      aria-label="Loading Recipes Archive"
      className="space-y-6 pb-16 animate-fade-in"
    >
      <span className="sr-only">Loading your recipe archive…</span>

      {/* Page Header Skeleton */}
      <PageHeaderSkeleton hasBadge hasActions />

      {/* Search Bar & Quick Filter Controls */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <div className="flex gap-2 shrink-0">
            <Skeleton className="h-11 w-28 rounded-xl" />
            <Skeleton className="h-11 w-32 rounded-xl" />
          </div>
        </div>

        {/* Quick Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
          <Skeleton className="h-7 w-20 rounded-full shrink-0" />
          <Skeleton className="h-7 w-16 rounded-full shrink-0" />
          <Skeleton className="h-7 w-20 rounded-full shrink-0" />
          <Skeleton className="h-7 w-16 rounded-full shrink-0" />
          <Skeleton className="h-7 w-24 rounded-full shrink-0" />
          <Skeleton className="h-7 w-16 rounded-full shrink-0" />
        </div>
      </div>

      {/* Recipe Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {[...Array(6)].map((_, i) => (
          <RecipeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
