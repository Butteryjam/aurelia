import type { MealPlan, MealPlanItem, MealType, Json } from '@/types/database'

export type { MealPlan, MealPlanItem, MealType }

export interface MealPlanRecipeSummary {
  id: string
  title: string
  image_url: string | null
  prep_time: number | null
  cook_time: number | null
  total_time: number | null
  servings: number | null
  difficulty: 'easy' | 'medium' | 'hard' | null
  cuisine: string | null
  nutrition_facts: Json
}

export interface MealPlanItemWithRecipe extends MealPlanItem {
  recipe?: MealPlanRecipeSummary | null
}

export interface DayMeals {
  date: string // YYYY-MM-DD
  dayName: string // e.g. "Monday"
  dayShort: string // e.g. "Mon"
  dayNumber: number // e.g. 21
  monthShort: string // e.g. "Sep"
  isToday: boolean
  slots: {
    breakfast: MealPlanItemWithRecipe[]
    lunch: MealPlanItemWithRecipe[]
    dinner: MealPlanItemWithRecipe[]
    snack: MealPlanItemWithRecipe[]
  }
}

export interface DayNutritionSummary {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  hasData: boolean
}

export interface WeekRange {
  startDate: string // YYYY-MM-DD (Monday)
  endDate: string // YYYY-MM-DD (Sunday)
  formattedRange: string // "Sep 21 – Sep 27, 2026"
  prevWeekDate: string // Date string to navigate back 1 week
  nextWeekDate: string // Date string to navigate forward 1 week
  currentWeekDate: string // Current Monday date string
}
