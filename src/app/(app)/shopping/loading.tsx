import { Skeleton } from '@/components/ui/skeleton'
import { PageHeaderSkeleton, ShoppingRowSkeleton } from '@/components/shared/skeletons'

export default function ShoppingLoading() {
  return (
    <div
      role="status"
      aria-label="Loading Shopping List"
      className="space-y-6 pb-16 animate-fade-in"
    >
      <span className="sr-only">Preparing your kitchen shopping provisions…</span>

      {/* Page Header Skeleton */}
      <PageHeaderSkeleton hasBadge />

      {/* List Selector & Action Controls Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/80 bg-card shadow-2xs">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Progress Summary Card Skeleton */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card/80 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-4 w-12 rounded-md" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Add Manual Item Input Skeleton */}
      <div className="flex flex-col sm:flex-row gap-2.5 p-3 rounded-2xl border border-border/70 bg-card/40">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>

      {/* Grouped Category Sections Skeleton */}
      <div className="space-y-6 pt-2">
        {[...Array(2)].map((_, catIdx) => (
          <div key={catIdx} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Skeleton className="h-5 w-24 rounded-lg" />
              <Skeleton className="h-4 w-8 rounded-full" />
            </div>
            <div className="space-y-2">
              {[...Array(3)].map((_, itemIdx) => (
                <ShoppingRowSkeleton key={itemIdx} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
