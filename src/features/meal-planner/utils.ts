import type {
  MealPlanItemWithRecipe,
  DayNutritionSummary,
  WeekRange,
} from './types'

/**
 * Format a Date to YYYY-MM-DD in local time
 */
export function formatDateToISO(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Compute the Monday-to-Sunday week range for a given date
 */
export function getWeekRange(referenceDateStr?: string): WeekRange {
  let ref: Date
  if (referenceDateStr && /^\d{4}-\d{2}-\d{2}$/.test(referenceDateStr)) {
    const [y, m, d] = referenceDateStr.split('-').map(Number)
    ref = new Date(y, m - 1, d)
  } else {
    ref = new Date()
  }

  // Get day of week (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const day = ref.getDay()
  // Distance to previous or current Monday: if Sunday (0), distance is -6; else 1 - day
  const diffToMonday = day === 0 ? -6 : 1 - day

  const monday = new Date(ref)
  monday.setDate(ref.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const prevMonday = new Date(monday)
  prevMonday.setDate(monday.getDate() - 7)

  const nextMonday = new Date(monday)
  nextMonday.setDate(monday.getDate() + 7)

  // Current real today Monday
  const today = new Date()
  const todayDay = today.getDay()
  const todayDiff = todayDay === 0 ? -6 : 1 - todayDay
  const currentRealMonday = new Date(today)
  currentRealMonday.setDate(today.getDate() + todayDiff)

  const startStr = formatDateToISO(monday)
  const endStr = formatDateToISO(sunday)

  const startMonth = monday.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = sunday.toLocaleDateString('en-US', { month: 'short' })
  const startDay = monday.getDate()
  const endDay = sunday.getDate()
  const year = monday.getFullYear()

  const formattedRange =
    startMonth === endMonth
      ? `${startMonth} ${startDay} – ${endDay}, ${year}`
      : `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`

  return {
    startDate: startStr,
    endDate: endStr,
    formattedRange,
    prevWeekDate: formatDateToISO(prevMonday),
    nextWeekDate: formatDateToISO(nextMonday),
    currentWeekDate: formatDateToISO(currentRealMonday),
  }
}

/**
 * Calculate estimated daily calories and macronutrients for a day
 */
export function calculateDayNutrition(
  items: MealPlanItemWithRecipe[]
): DayNutritionSummary {
  let calories = 0
  let protein_g = 0
  let carbs_g = 0
  let fat_g = 0
  let hasData = false

  for (const item of items) {
    if (!item.recipe?.nutrition_facts) continue
    const nf = item.recipe.nutrition_facts as Record<string, unknown>

    const recipeServings =
      item.recipe.servings && item.recipe.servings > 0
        ? item.recipe.servings
        : 1
    const scaleFactor = item.servings / recipeServings

    if (typeof nf.calories === 'number') {
      calories += Math.round(nf.calories * scaleFactor)
      hasData = true
    }
    if (typeof nf.protein_g === 'number') {
      protein_g += Math.round(nf.protein_g * scaleFactor)
      hasData = true
    }
    if (typeof nf.carbs_g === 'number') {
      carbs_g += Math.round(nf.carbs_g * scaleFactor)
      hasData = true
    }
    if (typeof nf.fat_g === 'number') {
      fat_g += Math.round(nf.fat_g * scaleFactor)
      hasData = true
    }
  }

  return { calories, protein_g, carbs_g, fat_g, hasData }
}
