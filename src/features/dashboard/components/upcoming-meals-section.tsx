import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, ChefHat, Play, ArrowRight } from 'lucide-react'
import type { MealPlanItemWithRecipe } from '@/features/meal-planner/types'
import { formatDateToISO } from '@/features/meal-planner/utils'
import { Button } from '@/components/ui/button'

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

  const mealTypeColor: Record<string, string> = {
    breakfast: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    lunch: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    dinner: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    snack: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif font-bold tracking-tight text-foreground">
            Upcoming Planned Meals
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your schedule for today and the days ahead
          </p>
        </div>
        <Link
          href="/meal-planner"
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
        >
          <span>Open Planner</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {meals.length === 0 ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-dashed border-border/80 bg-card/40 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No upcoming meals scheduled</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Plan your meals for the week to keep grocery runs and prep organized.
              </p>
            </div>
          </div>
          <Link href="/meal-planner">
            <Button size="sm" variant="outline" className="text-xs gap-1.5 shrink-0">
              <Calendar className="h-3.5 w-3.5" />
              <span>Plan meals</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {meals.map((item) => {
            const time =
              item.recipe?.total_time ??
              ((item.recipe?.prep_time || 0) + (item.recipe?.cook_time || 0) > 0
                ? (item.recipe?.prep_time || 0) + (item.recipe?.cook_time || 0)
                : null)

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs hover:shadow-sm transition-all"
              >
                <div>
                  {/* Top Badge: Date & Meal Type */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-foreground">
                      {formatMealDate(item.date)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${
                        mealTypeColor[item.meal_type] || 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.meal_type}
                    </span>
                  </div>

                  {/* Thumbnail & Title */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/50">
                      {item.recipe?.image_url ? (
                        <Image
                          src={item.recipe.image_url}
                          alt={item.recipe.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                          <ChefHat className="h-5 w-5" />
                        </div>
                      )}
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
                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
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
                        variant="secondary"
                        className="h-7 px-2.5 text-xs gap-1 font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Cook</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
