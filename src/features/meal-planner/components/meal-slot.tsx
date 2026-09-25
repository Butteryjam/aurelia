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
      <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground px-0.5 pt-0.5">
        <div className="flex items-center gap-1">
          <Icon className="h-3 w-3 text-primary/70 shrink-0" />
          <span className="uppercase tracking-wider font-semibold text-[9px] text-muted-foreground">
            {config.label}
          </span>
          {items.length > 0 && (
            <span className="text-[9px] text-muted-foreground/60 font-mono">
              · {items.length}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onAddMeal(date, mealType)}
          data-date={date}
          data-slot={mealType}
          className="relative flex h-4 w-4 items-center justify-center rounded text-muted-foreground/50 hover:bg-primary/10 hover:text-primary transition-colors after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          title={`Add ${config.label}`}
          aria-label={`Add ${config.label}`}
        >
          <Plus className="h-2.5 w-2.5" />
        </button>
      </div>

      {/* Planned Meals list */}
      {items.length > 0 ? (
        <div className="space-y-1.5">
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
          className="w-full flex items-center justify-center gap-1 rounded-md border border-dashed border-border/40 py-1 text-center text-[10px] text-muted-foreground/45 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all group"
        >
          <Plus className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100" />
          <span className="group-hover:underline">+ Add meal</span>
        </button>
      )}
    </div>
  )
}
