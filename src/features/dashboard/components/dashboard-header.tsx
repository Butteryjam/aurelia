import { ChefHat, BookOpen, Heart, Calendar, Utensils } from 'lucide-react'

interface DashboardHeaderProps {
  displayName?: string | null
  email?: string | null
  stats: {
    recipeCount: number
    favoriteCount: number
    upcomingMealCount: number
    cookingSessionCount: number
  }
}

export function DashboardHeader({ displayName, email, stats }: DashboardHeaderProps) {
  const name = displayName?.trim() || (email ? email.split('@')[0] : 'Chef')

  // Time-aware greeting
  const hour = new Date().getHours()
  let greeting = 'Good morning'
  if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon'
  } else if (hour >= 17) {
    greeting = 'Good evening'
  }

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col gap-4 pb-2 border-b border-border/60">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            <span className="inline-flex items-center gap-1.5 text-primary font-semibold">
              <ChefHat className="h-3.5 w-3.5" />
              Kitchen Dashboard
            </span>
            <span>•</span>
            <span>{todayFormatted}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
            {greeting}, <span className="text-primary">{name}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back to your digital cookbook. Here is what is on the menu today.
          </p>
        </div>
      </div>

      {/* Summary Micro-Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-card/60 shadow-2xs">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-none">{stats.recipeCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">My Recipes</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-card/60 shadow-2xs">
          <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <Heart className="h-4 w-4 fill-rose-500/20" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-none">{stats.favoriteCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Favorites</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-card/60 shadow-2xs">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-none">{stats.upcomingMealCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Planned Meals</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-card/60 shadow-2xs">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Utensils className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-none">{stats.cookingSessionCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Dishes Cooked</p>
          </div>
        </div>
      </div>
    </div>
  )
}
