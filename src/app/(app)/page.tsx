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
    <div className="space-y-10 pb-12">
      {/* 1. Personalized Header */}
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold tracking-tight text-foreground">
              Recent Recipes
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dishes recently added or crafted in your kitchen
            </p>
          </div>
          <Link
            href="/recipes"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
          >
            <span>View all ({recentRecipes.length})</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentRecipes.length === 0 ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-dashed border-border/80 bg-card/40 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Your cookbook is empty</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Start building your collection by creating a recipe or importing one with AI.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/recipes/import">
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Import with AI</span>
                </Button>
              </Link>
              <Link href="/recipes/new">
                <Button size="sm" variant="default" className="text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add recipe</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isFavorite={favoriteIdSet.has(recipe.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. Favorites / Quick Access */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold tracking-tight text-foreground">
              Favorites &amp; Quick Access
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your most-loved dishes and weekly staples
            </p>
          </div>
          {favoriteRecipes.length > 0 && (
            <Link
              href="/recipes?favorite=true"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
            >
              <span>View all favorites ({favoriteRecipes.length})</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {favoriteRecipes.length === 0 ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-dashed border-border/80 bg-card/40 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Heart className="h-5 w-5 fill-rose-500/20" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No favorite recipes yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tap the heart on any recipe to keep your go-to dishes right here for quick access.
                </p>
              </div>
            </div>
            <Link href="/recipes">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 shrink-0">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Browse recipes</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {favoriteRecipes.slice(0, 3).map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} isFavorite={true} />
            ))}
          </div>
        )}
      </div>

      {/* 6. Recent Cooking Activity */}
      <RecentCookingSection sessions={recentCookingSessions} />
    </div>
  )
}
