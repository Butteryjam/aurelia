import { PageHeaderSkeleton, CollectionCardSkeleton } from '@/components/shared/skeletons'

export default function CollectionsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading Collections Archive"
      className="space-y-6 pb-16 animate-fade-in"
    >
      <span className="sr-only">Loading your curated cookbook collections…</span>

      {/* Page Header Skeleton */}
      <PageHeaderSkeleton hasBadge hasActions />

      {/* Collections Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {[...Array(6)].map((_, i) => (
          <CollectionCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
