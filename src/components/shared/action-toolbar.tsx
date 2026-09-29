'use client'

import * as React from 'react'
import Link from 'next/link'
import { MoreHorizontal, Loader2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface ToolbarAction {
  id: string
  label: string
  icon?: LucideIcon
  onClick?: () => void
  href?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
  disabled?: boolean
  loading?: boolean
  destructive?: boolean
  showInOverflowOnly?: boolean
  className?: string
}

export interface ActionToolbarProps {
  primaryAction?: ToolbarAction | React.ReactNode
  secondaryActions?: (ToolbarAction | React.ReactNode)[]
  /** Custom nodes to render inside the overflow dropdown (e.g., dialog triggers, custom items) */
  overflowContent?: React.ReactNode
  /**
   * Maximum secondary action buttons to render before grouping into the overflow dropdown.
   * Default is 3 on desktop and collapses to 1-2 on smaller viewports.
   */
  maxVisibleSecondary?: number
  overflowLabel?: string
  className?: string
  children?: React.ReactNode
}

function isToolbarAction(action: unknown): action is ToolbarAction {
  return typeof action === 'object' && action !== null && 'id' in action && 'label' in action
}

export function ActionToolbar({
  primaryAction,
  secondaryActions = [],
  overflowContent,
  maxVisibleSecondary = 3,
  overflowLabel = 'More',
  className,
  children,
}: ActionToolbarProps) {
  // Separate secondary actions into visible buttons vs dropdown items
  const visibleSecondary: React.ReactNode[] = []
  const overflowActions: ToolbarAction[] = []

  secondaryActions.forEach((action) => {
    if (isToolbarAction(action)) {
      if (action.showInOverflowOnly || visibleSecondary.length >= maxVisibleSecondary) {
        overflowActions.push(action)
      } else {
        const Icon = action.icon
        const buttonElement = (
          <Button
            key={action.id}
            variant={action.variant || 'outline'}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            className={cn('h-8.5 gap-1.5 text-xs', action.className)}
          >
            {action.loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              Icon && <Icon className="h-3.5 w-3.5" />
            )}
            <span>{action.label}</span>
          </Button>
        )

        visibleSecondary.push(
          action.href ? (
            <Link key={action.id} href={action.href} className={action.className}>
              {buttonElement}
            </Link>
          ) : (
            buttonElement
          )
        )
      }
    } else {
      // Custom ReactNode passed directly
      visibleSecondary.push(action)
    }
  })

  // Render primary action
  let renderedPrimary: React.ReactNode = null
  if (primaryAction) {
    if (isToolbarAction(primaryAction)) {
      const Icon = primaryAction.icon
      const buttonElement = (
        <Button
          variant={primaryAction.variant || 'default'}
          size="sm"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled || primaryAction.loading}
          className={cn('h-8.5 gap-1.5 text-xs font-semibold shadow-xs', primaryAction.className)}
        >
          {primaryAction.loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            Icon && <Icon className="h-3.5 w-3.5" />
          )}
          <span>{primaryAction.label}</span>
        </Button>
      )

      renderedPrimary = primaryAction.href ? (
        <Link href={primaryAction.href} className={primaryAction.className}>{buttonElement}</Link>
      ) : (
        buttonElement
      )
    } else {
      renderedPrimary = primaryAction
    }
  }

  return (
    <nav
      role="toolbar"
      aria-label="Action Toolbar"
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      {/* Primary Action is rendered with highest visual prominence */}
      {renderedPrimary}

      {/* Visible Secondary Actions */}
      {visibleSecondary}

      {/* Overflow Dropdown for remaining actions */}
      {(overflowActions.length > 0 || Boolean(overflowContent)) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8.5 px-2.5 gap-1 text-xs text-muted-foreground hover:text-foreground"
              aria-label={overflowLabel}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">{overflowLabel}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 p-1.5">
            {overflowActions.map((action) => {
              const Icon = action.icon
              const itemContent = (
                <div
                  className={cn(
                    'flex w-full items-center gap-2',
                    action.destructive && 'text-destructive focus:text-destructive'
                  )}
                >
                  {action.loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    Icon && <Icon className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{action.label}</span>
                </div>
              )

              return action.href ? (
                <DropdownMenuItem key={action.id} asChild disabled={action.disabled || action.loading}>
                  <Link href={action.href}>{itemContent}</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  key={action.id}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  className={action.destructive ? 'text-destructive focus:text-destructive' : ''}
                >
                  {itemContent}
                </DropdownMenuItem>
              )
            })}
            {overflowContent}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Any additional child elements */}
      {children}
    </nav>
  )
}
