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

      {/* Quick Summary Pill Bar */}
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Utensils className="h-3.5 w-3.5 text-primary" />
            {totalPlannedMeals} {totalPlannedMeals === 1 ? 'meal' : 'meals'} planned
          </span>
          <span>•</span>
          <span>Click any slot or &ldquo;+&rdquo; button to schedule</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-primary font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Cook Mode &amp; Smart Shopping integrated</span>
        </div>
      </div>

      {/* Mobile Day Selector (Visible on < lg screens) */}
      <div className="block lg:hidden space-y-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
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
                onClick={() => setSelectedMobileDayIndex(idx)}
                className={cn(
                  'flex flex-col items-center justify-center min-w-13.5 flex-1 py-2 px-1 rounded-xl border transition-all text-center relative',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30 font-semibold'
                    : 'border-border/70 bg-card text-muted-foreground hover:border-border'
                )}
              >
                <span className="text-[11px] uppercase tracking-wider">
                  {day.dayShort}
                </span>
                <span className="text-base font-bold text-foreground">
                  {day.dayNumber}
                </span>
                {count > 0 ? (
                  <span
                    className={cn(
                      'mt-0.5 rounded-full px-1.5 py-0.2 text-[9px] font-bold leading-none',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {count}
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-border/40 mt-1" />
                )}
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
      <div className="hidden lg:grid lg:grid-cols-7 gap-2 xl:gap-2.5">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold">
              Clear Week&apos;s Meal Plan?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove all planned meals for{' '}
              {weekRange.formattedRange}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearConfirmOpen(false)}
              disabled={isClearing}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmClearWeek}
              disabled={isClearing}
              className="text-xs"
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
