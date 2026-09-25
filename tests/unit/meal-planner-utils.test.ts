import { describe, it, expect } from 'vitest'
import {
  formatDateToISO,
  getWeekRange,
  calculateDayNutrition,
} from '@/features/meal-planner/utils'
import type { MealPlanItemWithRecipe } from '@/features/meal-planner/types'

describe('Meal Planner Utils - Date, Week Grouping & Nutrition', () => {
  describe('formatDateToISO', () => {
    it('formats dates to YYYY-MM-DD format with padding', () => {
      const d1 = new Date(2026, 0, 5) // Jan 5, 2026
      expect(formatDateToISO(d1)).toBe('2026-01-05')

      const d2 = new Date(2026, 11, 25) // Dec 25, 2026
      expect(formatDateToISO(d2)).toBe('2026-12-25')
    })
  })

  describe('getWeekRange', () => {
    it('computes Monday-to-Sunday range for a midweek Wednesday', () => {
      // 2026-09-23 is Wednesday
      const range = getWeekRange('2026-09-23')
      expect(range.startDate).toBe('2026-09-21') // Monday
      expect(range.endDate).toBe('2026-09-27') // Sunday
      expect(range.prevWeekDate).toBe('2026-09-14')
      expect(range.nextWeekDate).toBe('2026-09-28')
    })

    it('computes correct week range when reference date is Monday', () => {
      // 2026-09-21 is Monday
      const range = getWeekRange('2026-09-21')
      expect(range.startDate).toBe('2026-09-21')
      expect(range.endDate).toBe('2026-09-27')
    })

    it('computes correct week range when reference date is Sunday (edge case)', () => {
      // 2026-09-27 is Sunday -> should resolve to the week ending on that Sunday (starts Mon 2026-09-21)
      const range = getWeekRange('2026-09-27')
      expect(range.startDate).toBe('2026-09-21')
      expect(range.endDate).toBe('2026-09-27')
    })

    it('handles month rollover weeks properly', () => {
      // 2026-04-01 is Wednesday -> week starts Mon Mar 30, ends Sun Apr 5
      const range = getWeekRange('2026-04-01')
      expect(range.startDate).toBe('2026-03-30')
      expect(range.endDate).toBe('2026-04-05')
      expect(range.formattedRange).toContain('Mar 30 – Apr 5, 2026')
    })

    it('defaults to current week if reference date is undefined or invalid', () => {
      const rangeDefault = getWeekRange()
      expect(rangeDefault.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(rangeDefault.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      const rangeInvalid = getWeekRange('not-a-date')
      expect(rangeInvalid.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('calculateDayNutrition', () => {
    it('aggregates nutrition macros and scales according to planned servings', () => {
      const mockItems: MealPlanItemWithRecipe[] = [
        {
          id: 'item-1',
          user_id: 'u1',
          meal_plan_id: null,
          recipe_id: 'r1',
          title: 'Oatmeal',
          recipe_image_url_snapshot: null,
          date: '2026-09-23',
          meal_type: 'breakfast',
          servings: 2, // planned 2 servings
          notes: null,
          order_index: 0,
          is_cooked: false,
          cooking_session_id: null,
          created_at: '',
          updated_at: '',
          recipe: {
            id: 'r1',
            title: 'Oatmeal',
            image_url: null,
            prep_time: 5,
            cook_time: 10,
            total_time: 15,
            servings: 1, // base 1 serving
            difficulty: 'easy',
            cuisine: 'American',
            nutrition_facts: {
              calories: 300,
              protein_g: 10,
              carbs_g: 50,
              fat_g: 5,
            },
          },
        },
        {
          id: 'item-2',
          user_id: 'u1',
          meal_plan_id: null,
          recipe_id: 'r2',
          title: 'Salmon Salad',
          recipe_image_url_snapshot: null,
          date: '2026-09-23',
          meal_type: 'dinner',
          servings: 2, // planned 2 servings
          notes: null,
          order_index: 0,
          is_cooked: false,
          cooking_session_id: null,
          created_at: '',
          updated_at: '',
          recipe: {
            id: 'r2',
            title: 'Salmon Salad',
            image_url: null,
            prep_time: 10,
            cook_time: 15,
            total_time: 25,
            servings: 2, // base 2 servings (scale factor = 1)
            difficulty: 'medium',
            cuisine: 'Mediterranean',
            nutrition_facts: {
              calories: 500,
              protein_g: 40,
              carbs_g: 15,
              fat_g: 20,
            },
          },
        },
      ]

      // Oatmeal (base 1 -> planned 2): 300*2 = 600 cal, 20g protein, 100g carbs, 10g fat
      // Salmon Salad (base 2 -> planned 2): 500 cal, 40g protein, 15g carbs, 20g fat
      // Totals: 1100 cal, 60g protein, 115g carbs, 30g fat
      const summary = calculateDayNutrition(mockItems)
      expect(summary.hasData).toBe(true)
      expect(summary.calories).toBe(1100)
      expect(summary.protein_g).toBe(60)
      expect(summary.carbs_g).toBe(115)
      expect(summary.fat_g).toBe(30)
    })

    it('returns hasData=false and 0s when no recipe nutrition facts exist', () => {
      const mockItems: MealPlanItemWithRecipe[] = [
        {
          id: 'item-1',
          user_id: 'u1',
          meal_plan_id: null,
          recipe_id: null,
          title: 'Quick Snack',
          recipe_image_url_snapshot: null,
          date: '2026-09-23',
          meal_type: 'snack',
          servings: 1,
          notes: null,
          order_index: 0,
          is_cooked: false,
          cooking_session_id: null,
          created_at: '',
          updated_at: '',
          recipe: null,
        },
      ]

      const summary = calculateDayNutrition(mockItems)
      expect(summary.hasData).toBe(false)
      expect(summary.calories).toBe(0)
    })
  })
})
