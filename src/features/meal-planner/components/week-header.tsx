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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4 shadow-xs">
      {/* Week Navigator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-xl border border-border bg-background p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateWeek(weekRange.prevWeekDate)}
            className="h-8 w-8 p-0"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateWeek(weekRange.currentWeekDate)}
            className="h-8 px-2.5 text-xs font-semibold"
          >
            Today
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateWeek(weekRange.nextWeekDate)}
            className="h-8 w-8 p-0"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 pl-1">
          <Calendar className="h-4 w-4 text-muted-foreground hidden sm:inline" />
          <h2 className="font-serif text-base sm:text-lg font-bold text-foreground">
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
          className="h-9 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>Add to Shopping List</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onClearWeek}
          disabled={isClearing}
          className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Clear Week</span>
        </Button>

        <Button
          size="sm"
          onClick={onOpenAddMeal}
          className="h-9 gap-1.5 text-xs font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Plan Meal</span>
        </Button>
      </div>
    </div>
  )
}
