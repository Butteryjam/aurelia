import { Skeleton } from '@/components/ui/skeleton'
import { RecipeCardSkeleton } from '@/components/shared/skeletons'

export default function CollectionDetailLoading() {
  return (
    <div
      role="status"
      aria-label="Loading Collection Volume"
      className="space-y-8 pb-16 animate-fade-in"
    >
      <span className="sr-only">Preparing curated collection volume…</span>

      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Editorial Cookbook Volume Banner Skeleton */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-card flex items-start gap-5">
        <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton className="h-3.5 w-32 rounded-full" />
          <Skeleton className="h-7 w-64 rounded-xl" />
          <Skeleton className="h-4 w-full max-w-xl rounded-md" />
        </div>
      </div>

      {/* Recipes in Collection Section Skeleton */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-3.5 w-60 rounded-md" />
          </div>
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <RecipeCardSkeleton />
          <RecipeCardSkeleton />
          <RecipeCardSkeleton />
        </div>
      </div>
    </div>
  )
}
