import Link from 'next/link'
import { Plus, Sparkles, BookOpen, Heart, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/features/auth/queries'
import {
  getRecentRecipes,
  getFavoriteRecipes,
  getUserFavoriteRecipeIds,
} from '@/features/recipes/queries'
import { getUpcomingMeals } from '@/features/meal-planner/queries'
import { getRecentCookingSessions } from '@/features/cook-mode/queries'
import { DashboardHeader } from '@/features/dashboard/components/dashboard-header'
import { QuickActions } from '@/features/dashboard/components/quick-actions'
import { UpcomingMealsSection } from '@/features/dashboard/components/upcoming-meals-section'
import { RecentCookingSection } from '@/features/dashboard/components/recent-cooking-section'
import { RecipeCard } from '@/features/recipes/components/recipe-card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'

export const metadata = {
  title: 'Dashboard | Aurelia',
  description: 'Your personalized culinary dashboard with recent recipes, planned meals, and cooking activity.',
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Concurrent server-side fetching using existing query infrastructure
  const [
    profile,
    recentRecipes,
    favoriteRecipes,
    userFavoriteIds,
    upcomingMeals,
    recentCookingSessions,
  ] = await Promise.all([
    getProfile(),
    getRecentRecipes(6),
    getFavoriteRecipes(),
    getUserFavoriteRecipeIds(),
    getUpcomingMeals(4),
    getRecentCookingSessions(4),
  ])

  const favoriteIdSet = new Set(userFavoriteIds)

  return (
    <div className="space-y-10 sm:space-y-12 pb-16 max-w-6xl mx-auto">
      {/* 1. Personalized Header & Micro-Stats */}
      <DashboardHeader
        displayName={profile?.display_name}
        email={user?.email}
        stats={{
          recipeCount: recentRecipes.length,
          favoriteCount: favoriteRecipes.length,
          upcomingMealCount: upcomingMeals.length,
          cookingSessionCount: recentCookingSessions.length,
        }}
      />

      {/* 2. Quick Actions */}
      <QuickActions />

      {/* 3. Upcoming Planned Meals */}
      <UpcomingMealsSection meals={upcomingMeals} />

      {/* 4. Recent Recipes Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-foreground">
              Recent Recipes
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Dishes recently added or crafted in your kitchen
            </p>
          </div>
          <Link
            href="/recipes"
            className="text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 group"
          >
            <span>View all ({recentRecipes.length})</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {recentRecipes.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={BookOpen}
            title="Your cookbook is empty"
            description="Start building your collection by crafting a signature recipe or importing with AI."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href="/recipes/import">
                  <Button size="sm" variant="outline" className="h-8.5 gap-1.5 text-xs">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Import with AI</span>
                  </Button>
                </Link>
                <Link href="/recipes/new">
                  <Button size="sm" variant="default" className="h-8.5 gap-1.5 text-xs font-semibold shadow-xs">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Recipe</span>
                  </Button>
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {recentRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isFavorite={favoriteIdSet.has(recipe.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. Favorites / Quick Access */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-foreground">
              Favorites &amp; Quick Access
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Your most-loved dishes and weekly staples
            </p>
          </div>
          {favoriteRecipes.length > 0 && (
            <Link
              href="/recipes?favorite=true"
              className="text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 group"
            >
              <span>View all favorites ({favoriteRecipes.length})</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {favoriteRecipes.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={Heart}
            title="No favorite recipes yet"
            description="Tap the heart icon on any dish to keep your culinary favorites right here for quick access."
            action={
              <Link href="/recipes">
                <Button size="sm" variant="outline" className="h-8.5 gap-1.5 text-xs">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span>Browse Recipes</span>
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {favoriteRecipes.slice(0, 3).map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} isFavorite={true} />
            ))}
          </div>
        )}
      </section>

      {/* 6. Recent Cooking Activity */}
      <RecentCookingSection sessions={recentCookingSessions} />
    </div>
  )
}
