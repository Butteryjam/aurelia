'use client'

import { ChevronLeft, ChevronRight, ShoppingCart, Trash2, Plus, Calendar } from 'lucide-react'
import type { WeekRange } from '../types'
import { Button } from '@/components/ui/button'

interface WeekHeaderProps {
  weekRange: WeekRange
  onNavigateWeek: (targetDate: string) => void
  onOpenAddMeal: () => void
  onOpenGenerateShopping: () => void
  onClearWeek: () => void
  isClearing?: boolean
}

export function WeekHeader({
  weekRange,
  onNavigateWeek,
  onOpenAddMeal,
  onOpenGenerateShopping,
  onClearWeek,
  isClearing,
}: WeekHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs">
      {/* Week Navigator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-border/80 bg-background/80 p-0.5 shadow-2xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateWeek(weekRange.prevWeekDate)}
            className="h-8.5 w-8.5 sm:h-8 sm:w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateWeek(weekRange.currentWeekDate)}
            className="h-8.5 px-3 sm:h-8 sm:px-2.5 text-xs font-semibold rounded-lg text-foreground hover:bg-muted/80 touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Today
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateWeek(weekRange.nextWeekDate)}
            className="h-8.5 w-8.5 sm:h-8 sm:w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 pl-0.5">
          <Calendar className="h-4 w-4 text-muted-foreground hidden sm:inline" />
          <h2 className="font-serif text-base sm:text-lg font-bold text-foreground tracking-tight">
            {weekRange.formattedRange}
          </h2>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenGenerateShopping}
          className="h-9 px-3.5 gap-1.5 text-xs rounded-xl border-border/80 hover:border-primary/40 hover:bg-primary/5 text-foreground hover:text-primary font-medium shadow-2xs transition-all touch-target"
        >
          <ShoppingCart className="h-3.5 w-3.5 text-primary" />
          <span>Add to Shopping List</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onClearWeek}
          disabled={isClearing}
          className="h-9 px-3 gap-1.5 text-xs rounded-xl border-border/80 text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 font-medium shadow-2xs transition-all touch-target"
          aria-label="Clear Week"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Clear Week</span>
        </Button>

        <Button
          size="sm"
          onClick={onOpenAddMeal}
          className="h-9 px-4 gap-1.5 text-xs font-semibold rounded-xl shadow-2xs transition-all touch-target"
        >
          <Plus className="h-4 w-4" />
          <span>Plan Meal</span>
        </Button>
      </div>
    </div>
  )
}
