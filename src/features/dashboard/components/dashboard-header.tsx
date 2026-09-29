import Link from 'next/link'
import { ChefHat, BookOpen, Heart, Calendar, Utensils, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <div className="space-y-6">
      {/* ─── HERO / WELCOME BANNER ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 text-primary">
              <ChefHat className="h-3.5 w-3.5" />
              Kitchen Dashboard
            </span>
            <span>•</span>
            <span>{todayFormatted}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-foreground leading-[1.15]">
            {greeting}, <span className="text-primary">{name}</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
            Welcome back to your culinary home. Here is what is on the menu today.
          </p>
        </div>

        {/* Primary Dashboard Actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-end">
          <Link href="/recipes/new">
            <Button
              variant="default"
              size="sm"
              className="h-9 px-4 gap-1.5 text-xs font-semibold shadow-xs hover:shadow-card active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Recipe</span>
            </Button>
          </Link>
          <Link href="/recipes/import">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3.5 gap-1.5 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Import with AI</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── MICRO-STATS COHESIVE GROUP ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Stat 1: My Recipes */}
        <Link
          href="/recipes"
          className="group rounded-2xl border border-border bg-card p-4 sm:p-4.5 shadow-card hover:border-border/80 hover:shadow-hover active:scale-[0.99] transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Recipes</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold font-sans text-foreground leading-none">{stats.recipeCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">Dishes in your cookbook</p>
          </div>
        </Link>

        {/* Stat 2: Favorites */}
        <Link
          href="/recipes?favorite=true"
          className="group rounded-2xl border border-border bg-card p-4 sm:p-4.5 shadow-card hover:border-border/80 hover:shadow-hover active:scale-[0.99] transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Favorites</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
              <Heart className="h-4 w-4 fill-rose-500/20" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold font-sans text-foreground leading-none">{stats.favoriteCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">Curated go-to dishes</p>
          </div>
        </Link>

        {/* Stat 3: Planned Meals */}
        <Link
          href="/meal-planner"
          className="group rounded-2xl border border-border bg-card p-4 sm:p-4.5 shadow-card hover:border-border/80 hover:shadow-hover active:scale-[0.99] transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Planned Meals</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold font-sans text-foreground leading-none">{stats.upcomingMealCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">Scheduled for this week</p>
          </div>
        </Link>

        {/* Stat 4: Dishes Cooked */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-4.5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dishes Cooked</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <Utensils className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold font-sans text-foreground leading-none">{stats.cookingSessionCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">Cook Mode sessions logged</p>
          </div>
        </div>
      </div>
    </div>
  )
}
