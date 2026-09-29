'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  DayMeals,
  MealPlanItemWithRecipe,
  MealPlanRecipeSummary,
  MealType,
  WeekRange,
} from '../types'
import type { ShoppingList } from '@/types/database'
import { WeekHeader } from './week-header'
import { DayColumn } from './day-column'
import { AddMealDialog } from './add-meal-dialog'
import { EditMealDialog } from './edit-meal-dialog'
import { GenerateShoppingDialog } from './generate-shopping-dialog'
import { updateMealPlanItem, deleteMealPlanItem, clearWeekMealPlan } from '../actions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Utensils } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MealPlannerViewProps {
  initialDays: DayMeals[]
  weekRange: WeekRange
  recipes: MealPlanRecipeSummary[]
  shoppingLists: ShoppingList[]
}

export function MealPlannerView({
  initialDays,
  weekRange,
  recipes,
  shoppingLists,
}: MealPlannerViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Find today's index in the week, default to 0 (Monday) if today is not in this week
  const todayIndex = initialDays.findIndex((d) => d.isToday)
  const defaultSelectedDayIndex = todayIndex !== -1 ? todayIndex : 0
  const [selectedMobileDayIndex, setSelectedMobileDayIndex] = useState(
    defaultSelectedDayIndex
  )

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addDialogDate, setAddDialogDate] = useState(
    initialDays[defaultSelectedDayIndex]?.date || weekRange.startDate
  )
  const [addDialogMealType, setAddDialogMealType] = useState<MealType>('dinner')

  const [editingItem, setEditingItem] = useState<MealPlanItemWithRecipe | null>(null)
  const [isShoppingOpen, setIsShoppingOpen] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  // Synchronize mobile selected day and default addDialog fallback when week changes
  const [prevWeekStartDate, setPrevWeekStartDate] = useState(weekRange.startDate)
  if (weekRange.startDate !== prevWeekStartDate) {
    setPrevWeekStartDate(weekRange.startDate)
    setSelectedMobileDayIndex(defaultSelectedDayIndex)
    setAddDialogDate(initialDays[defaultSelectedDayIndex]?.date || weekRange.startDate)
    setAddDialogMealType('dinner')
  }

  // Handlers
  function handleNavigateWeek(targetDate: string) {
    startTransition(() => {
      router.push(`/meal-planner?week=${targetDate}`)
    })
  }

  function handleOpenAddMeal(date?: string, mealType?: MealType) {
    setAddDialogDate(
      date || initialDays[selectedMobileDayIndex]?.date || weekRange.startDate
    )
    setAddDialogMealType(mealType || 'dinner')
    setIsAddOpen(true)
  }

  function handleEditMeal(item: MealPlanItemWithRecipe) {
    setEditingItem(item)
  }

  function handleDeleteMeal(id: string) {
    startTransition(async () => {
      await deleteMealPlanItem(id)
      router.refresh()
    })
  }

  function handleToggleCooked(id: string, current: boolean) {
    startTransition(async () => {
      await updateMealPlanItem(id, { isCooked: !current })
      router.refresh()
    })
  }

  function handleConfirmClearWeek() {
    setIsClearing(true)
    startTransition(async () => {
      await clearWeekMealPlan(weekRange.startDate, weekRange.endDate)
      setIsClearing(false)
      setIsClearConfirmOpen(false)
      router.refresh()
    })
  }

  // Count total meals planned for this week
  const totalPlannedMeals = initialDays.reduce((acc, day) => {
    return (
      acc +
      day.slots.breakfast.length +
      day.slots.lunch.length +
      day.slots.dinner.length +
      day.slots.snack.length
    )
  }, 0)

  const activeMobileDay = initialDays[selectedMobileDayIndex] || initialDays[0]

  return (
    <div className="space-y-6">
      {/* Week Header with Navigation & Quick Actions */}
      <WeekHeader
        weekRange={weekRange}
        onNavigateWeek={handleNavigateWeek}
        onOpenAddMeal={() => handleOpenAddMeal()}
        onOpenGenerateShopping={() => setIsShoppingOpen(true)}
        onClearWeek={() => setIsClearConfirmOpen(true)}
        isClearing={isClearing}
      />

      {/* Quick Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-xs shadow-2xs backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Utensils className="h-3 w-3" />
            </span>
            <span>
              {totalPlannedMeals} {totalPlannedMeals === 1 ? 'meal' : 'meals'} planned this week
            </span>
          </span>
          <span className="hidden sm:inline text-muted-foreground/60">•</span>
          <span className="hidden sm:inline text-muted-foreground">
            {totalPlannedMeals === 0
              ? 'Click any slot below or use "+ Plan Meal" to begin'
              : 'Tap any meal card to view details or launch Cook Mode'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-[11px] sm:text-xs tracking-wide">
            Cook Mode &amp; Smart Shopping Ready
          </span>
        </div>
      </div>

      {/* When 0 meals are planned across the entire week, show an editorial invitation banner */}
      {totalPlannedMeals === 0 && (
        <div className="rounded-2xl border border-primary/20 bg-linear-to-r from-primary/5 via-accent/30 to-background p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h2 className="font-serif text-base sm:text-lg font-bold tracking-tight text-foreground">
                Your Weekly Culinary Canvas
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Planning in advance turns daily dinners into moments of calm creativity, reduces grocery waste, and synchronizes your shopping list with a single click.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <Button
                type="button"
                onClick={() => handleOpenAddMeal()}
                className="w-full sm:w-auto min-h-[44px] rounded-xl px-5 text-xs font-semibold shadow-xs"
              >
                <Utensils className="h-3.5 w-3.5 mr-1.5" />
                Plan First Meal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Day Selector (Visible on < lg screens) */}
      <div className="block lg:hidden space-y-3">
        <div
          role="tablist"
          aria-label="Days of the week"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        >
          {initialDays.map((day, idx) => {
            const count =
              day.slots.breakfast.length +
              day.slots.lunch.length +
              day.slots.dinner.length +
              day.slots.snack.length
            const isSelected = idx === selectedMobileDayIndex

            return (
              <button
                key={day.date}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`${day.dayName}, ${day.monthShort} ${day.dayNumber} — ${count} ${count === 1 ? 'meal' : 'meals'} scheduled`}
                onClick={() => setSelectedMobileDayIndex(idx)}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[50px] flex-1 min-h-[52px] py-2 px-1 rounded-xl border transition-all text-center relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30 font-semibold shadow-2xs'
                    : 'border-border/70 bg-card text-muted-foreground hover:border-border hover:bg-muted/40'
                )}
              >
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">
                  {day.dayShort}
                </span>
                <span className="text-sm sm:text-base font-bold text-foreground">
                  {day.dayNumber}
                </span>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {day.isToday && (
                    <span
                      aria-label="Today"
                      className="h-1.5 w-1.5 rounded-full bg-primary ring-1 ring-primary/20"
                    />
                  )}
                  {count > 0 ? (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        {/* Selected Single Day for Mobile */}
        {activeMobileDay && (
          <DayColumn
            day={activeMobileDay}
            onAddMeal={handleOpenAddMeal}
            onEditMeal={handleEditMeal}
            onDeleteMeal={handleDeleteMeal}
            onToggleCooked={handleToggleCooked}
          />
        )}
      </div>

      {/* Desktop 7-Day Grid (Visible on >= lg screens) */}
      <div className="hidden lg:grid lg:grid-cols-7 gap-2.5 xl:gap-3">
        {initialDays.map((day) => (
          <DayColumn
            key={day.date}
            day={day}
            onAddMeal={handleOpenAddMeal}
            onEditMeal={handleEditMeal}
            onDeleteMeal={handleDeleteMeal}
            onToggleCooked={handleToggleCooked}
          />
        ))}
      </div>

      {/* Add Meal Dialog */}
      <AddMealDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        defaultDate={addDialogDate}
        defaultMealType={addDialogMealType}
        recipes={recipes}
        onSuccess={() => {
          setIsAddOpen(false)
          router.refresh()
        }}
      />

      {/* Edit Meal Dialog */}
      <EditMealDialog
        item={editingItem}
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        onSuccess={() => {
          setEditingItem(null)
          router.refresh()
        }}
      />

      {/* Generate Shopping Dialog */}
      <GenerateShoppingDialog
        isOpen={isShoppingOpen}
        onClose={() => setIsShoppingOpen(false)}
        days={initialDays}
        formattedWeekRange={weekRange.formattedRange}
        existingLists={shoppingLists}
      />

      {/* Clear Week Confirmation Dialog */}
      <Dialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <DialogContent className="sm:max-w-md border-border/80 bg-card/95 backdrop-blur-xl p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold text-foreground">
              Clear Week&apos;s Meal Plan?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              Are you sure you want to remove all planned meals for{' '}
              <strong className="text-foreground">{weekRange.formattedRange}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2.5 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearConfirmOpen(false)}
              disabled={isClearing}
              className="min-h-[44px] rounded-xl px-4 text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmClearWeek}
              disabled={isClearing}
              className="min-h-[44px] rounded-xl px-4 text-xs font-semibold shadow-xs"
            >
              {isClearing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : null}
              Clear All Meals
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
