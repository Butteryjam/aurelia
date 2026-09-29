import * as React from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  variant?: 'compact' | 'standard' | 'editorial'
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  variant = 'standard',
  action,
  children,
  className,
}: EmptyStateProps) {
  const contentAction = action ?? children

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-dashed border-border bg-card/50 text-center sm:text-left animate-fade-in',
          className
        )}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3.5 min-w-0">
          {Icon && (
            <div className="h-10 w-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0 border border-border/60">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">
              {title}
            </h4>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {contentAction && <div className="shrink-0">{contentAction}</div>}
      </div>
    )
  }

  if (variant === 'editorial') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-16 sm:py-24 px-6 text-center max-w-md mx-auto animate-fade-up',
          className
        )}
      >
        {Icon && (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5 shadow-card border border-primary/20">
            <Icon className="h-8 w-8" />
          </div>
        )}
        <h3 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {description}
          </p>
        )}
        {contentAction && <div>{contentAction}</div>}
      </div>
    )
  }

  // Default 'standard' variant
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-border/80 bg-card/60 shadow-2xs animate-fade-up',
        className
      )}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground mb-3.5 border border-border/60">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-base sm:text-lg font-serif font-semibold text-foreground mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed mb-4">
          {description}
        </p>
      )}
      {contentAction && <div className="mt-1">{contentAction}</div>}
    </div>
  )
}
