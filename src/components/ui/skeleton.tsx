import * as React from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse motion-reduce:animate-none rounded-xl bg-muted/70 dark:bg-muted/40 border border-border/30 transition-colors',
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
