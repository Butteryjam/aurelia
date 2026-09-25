import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { MealPlannerView } from '@/features/meal-planner/components/meal-planner-view'
import {
  getWeekRange,
  getMealPlanForWeek,
  getRecipesForMealPicker,
} from '@/features/meal-planner/queries'
import { getShoppingLists } from '@/features/shopping/queries'

export const metadata: Metadata = {
  title: 'Meal Planner | Aurelia',
  description:
    'Plan your meals for the week, balance daily nutrition, launch Cook Mode, and generate smart grocery shopping lists.',
}

interface MealPlannerPageProps {
  searchParams: Promise<{ week?: string }>
}

export default async function MealPlannerPage({
  searchParams,
}: MealPlannerPageProps) {
  const { week } = await searchParams

  const weekRange = getWeekRange(week)

  const [days, recipes, shoppingLists] = await Promise.all([
    getMealPlanForWeek(weekRange.startDate, weekRange.endDate),
    getRecipesForMealPicker(),
    getShoppingLists(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Meal Planner"
        description="Plan your week's meals, track daily nutrition, launch Cook Mode, and export grocery ingredients with one click."
      />

      <MealPlannerView
        initialDays={days}
        weekRange={weekRange}
        recipes={recipes}
        shoppingLists={shoppingLists}
      />
    </div>
  )
}
