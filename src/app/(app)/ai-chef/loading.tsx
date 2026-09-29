import { Skeleton } from '@/components/ui/skeleton'
import { PageHeaderSkeleton } from '@/components/shared/skeletons'

export default function AIChefLoading() {
  return (
    <div
      role="status"
      aria-label="Loading AI Chef"
      className="space-y-4 pb-16 animate-fade-in"
    >
      <span className="sr-only">Connecting to culinary intelligence…</span>

      {/* Page Header Skeleton */}
      <PageHeaderSkeleton hasBadge />

      {/* 2-Column Chat Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
        {/* Left Sidebar: Conversations Skeleton */}
        <div className="hidden lg:block lg:col-span-4 rounded-2xl border border-border/80 bg-card p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-2.5 rounded-xl border border-border/50 space-y-1.5">
                <Skeleton className="h-4 w-4/5 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Main Chat Area Skeleton */}
        <div className="lg:col-span-8 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-card flex flex-col justify-between min-h-[520px]">
          {/* Chat Messages Placeholder */}
          <div className="space-y-6">
            {/* Assistant Welcome Message */}
            <div className="flex items-start gap-3 max-w-xl">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32 rounded-md" />
                <div className="p-4 rounded-2xl rounded-tl-sm bg-muted/40 border border-border/60 space-y-2">
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-5/6 rounded-md" />
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                </div>
              </div>
            </div>

            {/* User Message */}
            <div className="flex items-start justify-end gap-3">
              <div className="p-3.5 rounded-2xl rounded-tr-sm bg-primary/10 border border-primary/20 space-y-1.5 max-w-md w-full">
                <Skeleton className="h-4 w-4/5 rounded-md ml-auto" />
                <Skeleton className="h-4 w-1/2 rounded-md ml-auto" />
              </div>
            </div>
          </div>

          {/* Prompt Input Bar Skeleton */}
          <div className="pt-6 border-t border-border/60">
            <div className="flex gap-2">
              <Skeleton className="h-12 flex-1 rounded-xl" />
              <Skeleton className="h-12 w-14 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
