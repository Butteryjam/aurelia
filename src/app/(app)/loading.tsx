import { Skeleton } from '@/components/ui/skeleton'
import { RecipeCardSkeleton } from '@/components/shared/skeletons'

export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Loading Kitchen Dashboard"
      className="space-y-10 sm:space-y-12 pb-16 max-w-6xl mx-auto animate-fade-in"
    >
      <span className="sr-only">Preparing your personal culinary dashboard…</span>

      {/* 1. Header & Micro-Stats */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-64 sm:w-80 rounded-xl" />
            <Skeleton className="h-4 w-48 rounded-lg" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-border/70 bg-card/60 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-12 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Quick Actions */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-28 rounded-md" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-border/70 bg-card/60 shadow-2xs flex items-center gap-3"
            >
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Upcoming Meals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-36 rounded-lg" />
            <Skeleton className="h-3.5 w-48 rounded-md" />
          </div>
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-border/70 bg-card/60 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4 rounded-lg" />
              <Skeleton className="h-3.5 w-1/2 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Recent Recipes Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-3.5 w-56 rounded-md" />
          </div>
          <Skeleton className="h-8 w-24 rounded-xl" />
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
