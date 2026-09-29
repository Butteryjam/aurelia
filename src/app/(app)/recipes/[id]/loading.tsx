import { Skeleton } from '@/components/ui/skeleton'

export default function RecipeDetailLoading() {
  return (
    <div
      role="status"
      aria-label="Loading Recipe Detail"
      className="space-y-8 pb-16 max-w-5xl mx-auto animate-fade-in"
    >
      <span className="sr-only">Preparing recipe details…</span>

      {/* Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Skeleton className="h-4 w-28 rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>

      {/* Title & Editorial Description */}
      <div className="space-y-3">
        <Skeleton className="h-9 sm:h-12 w-4/5 sm:w-2/3 rounded-xl" />
        <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
        <Skeleton className="h-4 w-4/5 max-w-xl rounded-md" />

        {/* Tag Pills */}
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>

      {/* Hero Media Banner */}
      <div className="relative aspect-16/9 sm:aspect-21/9 w-full rounded-2xl overflow-hidden bg-muted/60 border border-border/80 shadow-card">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>

      {/* Timing & Yield Metadata Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 rounded-2xl border border-border/80 bg-card shadow-2xs">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1.5 p-2">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>
        ))}
      </div>

      {/* 2-Column Layout: Ingredients & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Ingredients Archive Column */}
        <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <Skeleton className="h-4 w-4 rounded-md shrink-0" />
                <Skeleton className="h-4 w-14 rounded-md" />
                <Skeleton className="h-4 flex-1 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Instructions Method Column */}
        <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-5 shadow-card">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <Skeleton className="h-6 w-36 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="space-y-2 flex-1 min-w-0 pt-0.5">
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-5/6 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
