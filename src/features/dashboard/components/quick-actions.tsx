import Link from 'next/link'
import { Plus, Sparkles, Calendar, ShoppingCart, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function QuickActions() {
  const actions = [
    {
      title: 'Add Recipe',
      description: 'Create or import dish',
      href: '/recipes/new',
      icon: Plus,
      badge: 'Create',
      bgHover: 'hover:border-primary/50 hover:bg-primary/5',
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      title: 'AI Chef',
      description: 'Substitutions & ideas',
      href: '/ai-chef',
      icon: Sparkles,
      badge: 'AI Assistant',
      bgHover: 'hover:border-purple-500/50 hover:bg-purple-500/5',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Plan Meal',
      description: 'Weekly schedule & prep',
      href: '/meal-planner',
      icon: Calendar,
      badge: 'Planner',
      bgHover: 'hover:border-amber-500/50 hover:bg-amber-500/5',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Shopping List',
      description: 'Ingredients & grocery checklist',
      href: '/shopping',
      icon: ShoppingCart,
      badge: 'Pantry',
      bgHover: 'hover:border-emerald-500/50 hover:bg-emerald-500/5',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((act) => {
          const Icon = act.icon
          return (
            <Link
              key={act.href}
              href={act.href}
              className={cn(
                'group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card transition-all duration-200 shadow-2xs hover:shadow-sm min-h-[96px]',
                act.bgHover
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    'h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105',
                    act.iconBg
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>

              <div className="mt-3">
                <p className="text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                  {act.title}
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                  {act.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
