import Link from 'next/link'
import { Calendar, Clock, ChefHat, UtensilsCrossed, ArrowRight } from 'lucide-react'
import type { MealPlanItemWithRecipe } from '@/features/meal-planner/types'
import { formatDateToISO } from '@/features/meal-planner/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { SafeImage } from '@/components/shared/safe-image'
import { EmptyState } from '@/components/shared/empty-state'

interface UpcomingMealsSectionProps {
  meals: MealPlanItemWithRecipe[]
}

export function UpcomingMealsSection({ meals }: UpcomingMealsSectionProps) {
  const todayISO = formatDateToISO(new Date())
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = formatDateToISO(tomorrow)

  function formatMealDate(dateStr: string) {
    if (dateStr === todayISO) return 'Today'
    if (dateStr === tomorrowISO) return 'Tomorrow'
    const [y, m, d] = dateStr.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const mealTypeVariantMap: Record<string, 'meal-breakfast' | 'meal-lunch' | 'meal-dinner' | 'meal-snack'> = {
    breakfast: 'meal-breakfast',
    lunch: 'meal-lunch',
    dinner: 'meal-dinner',
    snack: 'meal-snack',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-foreground">
            Upcoming Planned Meals
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Your schedule for today and the days ahead
          </p>
        </div>
        <Link
          href="/meal-planner"
          className="text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 group"
        >
          <span>Open Planner</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {meals.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={Calendar}
          title="Plan your next meal"
          description="Schedule dishes for this week to keep groceries and prep effortlessly organized."
          action={
            <Link href="/meal-planner">
              <Button size="sm" variant="outline" className="h-8.5 gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Schedule a Meal</span>
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {meals.map((item) => {
            const time =
              item.recipe?.total_time ??
              ((item.recipe?.prep_time || 0) + (item.recipe?.cook_time || 0) > 0
                ? (item.recipe?.prep_time || 0) + (item.recipe?.cook_time || 0)
                : null)

            return (
              <Card
                key={item.id}
                variant="default"
                className="group relative flex flex-col justify-between overflow-hidden p-4 shadow-card hover:shadow-hover hover:border-border/80 transition-all duration-200"
              >
                <div>
                  {/* Top Badge: Date & Meal Type */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-foreground">
                      {formatMealDate(item.date)}
                    </span>
                    <Badge
                      variant={mealTypeVariantMap[item.meal_type] || 'tag-neutral'}
                      className="capitalize"
                    >
                      {item.meal_type}
                    </Badge>
                  </div>

                  {/* Thumbnail & Title */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
                      <SafeImage
                        src={item.recipe?.image_url}
                        alt={item.recipe?.title || 'Meal'}
                        fill
                        className="object-cover"
                        sizes="48px"
                        fallback={
                          <div className="flex h-full w-full items-center justify-center bg-muted/60 text-muted-foreground/40">
                            <ChefHat className="h-5 w-5" />
                          </div>
                        }
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={item.recipe_id ? `/recipes/${item.recipe_id}` : '/meal-planner'}
                        className="text-sm font-semibold text-foreground line-clamp-1 hover:text-primary transition-colors"
                      >
                        {item.recipe?.title || item.notes || 'Custom meal'}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {time && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-primary" />
                            {time}m
                          </span>
                        )}
                        <span>•</span>
                        <span>{item.servings} {item.servings === 1 ? 'serving' : 'servings'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2.5 border-t border-border/50 flex items-center justify-between">
                  <Link
                    href={item.recipe_id ? `/recipes/${item.recipe_id}` : '/meal-planner'}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View details
                  </Link>

                  {item.recipe_id && (
                    <Link href={`/recipes/${item.recipe_id}/cook`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7.5 px-2.5 text-xs gap-1 font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-[0.98] transition-colors"
                      >
                        <UtensilsCrossed className="h-3 w-3" />
                        <span>Cook</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
