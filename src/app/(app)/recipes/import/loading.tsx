import { Skeleton } from '@/components/ui/skeleton'
import { PageHeaderSkeleton } from '@/components/shared/skeletons'

export default function RecipeImportLoading() {
  return (
    <div
      role="status"
      aria-label="Loading AI Recipe Import"
      className="space-y-6 pb-16 max-w-4xl mx-auto animate-fade-in"
    >
      <span className="sr-only">Preparing AI extraction workbench…</span>

      {/* Page Header Skeleton */}
      <PageHeaderSkeleton hasBadge />

      {/* Mode Switcher Tabs Skeleton */}
      <div className="flex items-center gap-2 p-1 rounded-xl border border-border/80 bg-muted/40 w-fit">
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Dropzone / Input Area Skeleton */}
      <div className="rounded-2xl border-2 border-dashed border-border/80 bg-card/60 p-8 sm:p-12 text-center space-y-4 shadow-xs">
        <Skeleton className="h-14 w-14 rounded-2xl mx-auto" />
        <div className="space-y-2 max-w-sm mx-auto">
          <Skeleton className="h-5 w-48 rounded-lg mx-auto" />
          <Skeleton className="h-3.5 w-64 rounded-md mx-auto" />
        </div>
        <div className="pt-2">
          <Skeleton className="h-10 w-40 rounded-xl mx-auto" />
        </div>
      </div>
    </div>
  )
}
