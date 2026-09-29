import Link from 'next/link'
import { Plus, Sparkles, ChefHat, Calendar, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function QuickActions() {
  const actions = [
    {
      title: 'Add Recipe',
      description: 'Craft a new signature dish from scratch',
      href: '/recipes/new',
      icon: Plus,
      badge: 'Create',
      isPrimary: true,
    },
    {
      title: 'Import Recipe',
      description: 'Extract dishes from web URLs or photos',
      href: '/recipes/import',
      icon: Sparkles,
      badge: 'AI Import',
    },
    {
      title: 'Ask AI Chef',
      description: 'Substitutions, pairings & culinary advice',
      href: '/ai-chef',
      icon: ChefHat,
      badge: 'Consultant',
    },
    {
      title: 'Plan Meals',
      description: 'Organize your weekly dinner calendar',
      href: '/meal-planner',
      icon: Calendar,
      badge: 'Schedule',
    },
  ]

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {actions.map((act) => {
          const Icon = act.icon
          return (
            <Link key={act.href} href={act.href} className="group block focus:outline-none">
              <Card
                variant="interactive"
                className={cn(
                  'relative flex flex-col justify-between p-4 sm:p-5 h-full min-h-[110px] transition-all duration-200',
                  act.isPrimary
                    ? 'border-primary/30 bg-card hover:border-primary/60'
                    : 'border-border bg-card hover:border-border/80'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 group-hover:scale-105',
                      act.isPrimary
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-primary/10 text-primary border-primary/20'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>

                <div className="mt-3.5 space-y-0.5">
                  <p className="text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {act.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {act.description}
                  </p>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
