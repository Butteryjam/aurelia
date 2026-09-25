'use client'

import type { DayMeals, MealPlanItemWithRecipe, MealType } from '../types'
import { calculateDayNutrition } from '../utils'
import { DailyNutritionSummary } from './daily-nutrition-summary'
import { MealSlot } from './meal-slot'
import { cn } from '@/lib/utils'

interface DayColumnProps {
  day: DayMeals
  onAddMeal: (date: string, mealType: MealType) => void
  onEditMeal: (item: MealPlanItemWithRecipe) => void
  onDeleteMeal: (id: string) => void
  onToggleCooked: (id: string, current: boolean) => void
}

export function DayColumn({
  day,
  onAddMeal,
  onEditMeal,
  onDeleteMeal,
  onToggleCooked,
}: DayColumnProps) {
  const allDayMeals: MealPlanItemWithRecipe[] = [
    ...day.slots.breakfast,
    ...day.slots.lunch,
    ...day.slots.dinner,
    ...day.slots.snack,
  ]

  const nutritionSummary = calculateDayNutrition(allDayMeals)

  return (
    <div
      data-day-short={day.dayShort}
      data-date={day.date}
      className={cn(
        'flex flex-col rounded-xl border p-2 space-y-2 transition-colors shadow-2xs',
        day.isToday
          ? 'border-primary/80 ring-1 ring-primary/20 bg-card'
          : 'border-border/60 bg-card/60 hover:border-border/80'
      )}
    >
      {/* Day Header */}
      <div className="flex items-center justify-between pb-1 border-b border-border/40">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-serif font-bold text-sm sm:text-base text-foreground">
              {day.dayShort}
            </span>
            <span className="text-xs text-muted-foreground">
              {day.monthShort} {day.dayNumber}
            </span>
          </div>
        </div>

        {day.isToday && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary tracking-wide uppercase">
            Today
          </span>
        )}
      </div>

      {/* Daily Nutrition Summary */}
      <DailyNutritionSummary summary={nutritionSummary} />

      {/* 4 Meal Slots */}
      <div className="space-y-2.5">
        <MealSlot
          date={day.date}
          mealType="breakfast"
          items={day.slots.breakfast}
          onAddMeal={onAddMeal}
          onEditMeal={onEditMeal}
          onDeleteMeal={onDeleteMeal}
          onToggleCooked={onToggleCooked}
        />
        <MealSlot
          date={day.date}
          mealType="lunch"
          items={day.slots.lunch}
          onAddMeal={onAddMeal}
          onEditMeal={onEditMeal}
          onDeleteMeal={onDeleteMeal}
          onToggleCooked={onToggleCooked}
        />
        <MealSlot
          date={day.date}
          mealType="dinner"
          items={day.slots.dinner}
          onAddMeal={onAddMeal}
          onEditMeal={onEditMeal}
          onDeleteMeal={onDeleteMeal}
          onToggleCooked={onToggleCooked}
        />
        <MealSlot
          date={day.date}
          mealType="snack"
          items={day.slots.snack}
          onAddMeal={onAddMeal}
          onEditMeal={onEditMeal}
          onDeleteMeal={onDeleteMeal}
          onToggleCooked={onToggleCooked}
        />
      </div>
    </div>
  )
}
