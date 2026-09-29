import type { Metadata } from 'next'
import { CalendarDays } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
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
        title="Meal Planner"
        description="Your personal weekly menu, balancing daily nourishment, culinary rhythm, and kitchen provisions."
        badge={
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-0.5 text-xs font-medium">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span>Weekly Menu</span>
          </Badge>
        }
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
