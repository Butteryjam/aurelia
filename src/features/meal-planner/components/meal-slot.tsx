'use client'

import { Plus, Sun, Sunrise, Sunset, Coffee } from 'lucide-react'
import type { MealPlanItemWithRecipe, MealType } from '../types'
import { PlannedMealCard } from './planned-meal-card'

interface MealSlotProps {
  date: string
  mealType: MealType
  items: MealPlanItemWithRecipe[]
  onAddMeal: (date: string, mealType: MealType) => void
  onEditMeal: (item: MealPlanItemWithRecipe) => void
  onDeleteMeal: (id: string) => void
  onToggleCooked: (id: string, current: boolean) => void
}

const SLOT_CONFIG: Record<MealType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  breakfast: { label: 'Breakfast', icon: Sunrise },
  lunch: { label: 'Lunch', icon: Sun },
  dinner: { label: 'Dinner', icon: Sunset },
  snack: { label: 'Snacks', icon: Coffee },
}

export function MealSlot({
  date,
  mealType,
  items,
  onAddMeal,
  onEditMeal,
  onDeleteMeal,
  onToggleCooked,
}: MealSlotProps) {
  const config = SLOT_CONFIG[mealType]
  const Icon = config.icon

  return (
    <div
      data-date={date}
      data-slot={mealType}
      className="flex flex-col gap-1"
    >
      {/* Slot Header */}
      <div className="w-full flex items-center text-[10px] font-medium text-muted-foreground pt-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="h-3 w-3 text-primary/80 shrink-0" />
          <span className="uppercase tracking-wider font-semibold text-[9.5px] text-muted-foreground truncate">
            {config.label}
          </span>
          {items.length > 0 && (
            <span className="text-[9px] text-muted-foreground/70 font-semibold tabular-nums">
              · {items.length}
            </span>
          )}
        </div>
      </div>

      {/* Planned Meals list */}
      {items.length > 0 ? (
        <div className="w-full space-y-1.5">
          {items.map((item) => (
            <PlannedMealCard
              key={item.id}
              item={item}
              onEdit={onEditMeal}
              onDelete={onDeleteMeal}
              onToggleCooked={onToggleCooked}
            />
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onAddMeal(date, mealType)}
          data-date={date}
          data-slot={mealType}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/80 bg-background/40 hover:bg-primary/5 hover:border-primary/40 py-1.5 px-2 text-center text-[10px] text-muted-foreground/60 hover:text-primary transition-all group min-h-[30px]"
        >
          <Plus className="h-2.5 w-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
          <span className="group-hover:underline font-medium">Add {config.label.toLowerCase()}</span>
        </button>
      )}
    </div>
  )
}
