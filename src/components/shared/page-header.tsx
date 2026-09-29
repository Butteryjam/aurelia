import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  subtitle?: React.ReactNode
  breadcrumb?: React.ReactNode
  badge?: React.ReactNode
  primaryAction?: React.ReactNode
  secondaryActions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  subtitle,
  breadcrumb,
  badge,
  primaryAction,
  secondaryActions,
  children,
  className,
}: PageHeaderProps) {
  const resolvedDescription = description ?? subtitle

  return (
    <div
      className={cn(
        'flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="space-y-1">
        {breadcrumb && (
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            {breadcrumb}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {badge && <div className="inline-flex shrink-0">{badge}</div>}
        </div>

        {resolvedDescription && (
          <div className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {resolvedDescription}
          </div>
        )}
      </div>

      {(primaryAction || secondaryActions || children) && (
        <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0 shrink-0">
          {secondaryActions}
          {primaryAction}
          {children}
        </div>
      )}
    </div>
  )
}
