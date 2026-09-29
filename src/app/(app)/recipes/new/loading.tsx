import { Skeleton } from '@/components/ui/skeleton'

export default function NewRecipeLoading() {
  return (
    <div
      role="status"
      aria-label="Loading Recipe Creator"
      className="max-w-4xl mx-auto space-y-6 pb-24 animate-fade-in"
    >
      <span className="sr-only">Preparing recipe creator…</span>

      {/* AI Assistant Callout Banner Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-3 w-64 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-xl shrink-0" />
      </div>

      {/* Section 1: The Essentials Skeleton */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 space-y-5 shadow-xs">
        <div className="border-b border-border/60 pb-3.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-6 rounded-md" />
            <Skeleton className="h-6 w-36 rounded-lg" />
          </div>
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* Section 2: Timing & Yield Skeleton */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 space-y-5 shadow-xs">
        <div className="border-b border-border/60 pb-3.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-6 rounded-md" />
            <Skeleton className="h-6 w-44 rounded-lg" />
          </div>
          <Skeleton className="h-3.5 w-56 rounded-md" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Ingredients Archive Skeleton */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-6 rounded-md" />
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/60">
              <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
              <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
