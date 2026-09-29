import Link from 'next/link'
import { UtensilsCrossed, Star, ChefHat, Clock } from 'lucide-react'
import type { CookingSessionWithRecipe } from '@/features/cook-mode/queries'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SafeImage } from '@/components/shared/safe-image'
import { EmptyState } from '@/components/shared/empty-state'

interface RecentCookingSectionProps {
  sessions: CookingSessionWithRecipe[]
}

export function RecentCookingSection({ sessions }: RecentCookingSectionProps) {
  function formatSessionDate(dateStr: string | null) {
    if (!dateStr) return 'Recently'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Cooked today'
    if (diffDays === 1) return 'Cooked yesterday'
    if (diffDays < 7) return `Cooked ${diffDays} days ago`

    return `Cooked ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-foreground">
            Recent Cooking Activity
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Your kitchen history, ratings, and culinary notes
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={UtensilsCrossed}
          title="No cooking history yet"
          description="Launch hands-free Cook Mode on any recipe to time steps, log ratings, and record chef notes."
          action={
            <Link href="/recipes">
              <Button size="sm" variant="outline" className="h-8.5 gap-1.5 text-xs">
                <ChefHat className="h-3.5 w-3.5 text-primary" />
                <span>Browse Recipes</span>
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {sessions.map((session) => {
            const time =
              session.recipe?.total_time ??
              ((session.recipe?.prep_time || 0) + (session.recipe?.cook_time || 0) > 0
                ? (session.recipe?.prep_time || 0) + (session.recipe?.cook_time || 0)
                : null)

            return (
              <Card
                key={session.id}
                variant="default"
                className="group relative flex flex-col justify-between overflow-hidden p-4 shadow-card hover:shadow-hover hover:border-border/80 transition-all duration-200"
              >
                <div>
                  {/* Top Badge: Date & Rating */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {formatSessionDate(session.completed_at || session.started_at)}
                    </span>

                    {session.rating && session.rating > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <Star className="h-3 w-3 fill-amber-500" />
                        <span>{session.rating}/5</span>
                      </span>
                    )}
                  </div>

                  {/* Thumbnail & Title */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
                      <SafeImage
                        src={session.recipe?.image_url}
                        alt={session.recipe?.title || 'Dish'}
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
                        href={`/recipes/${session.recipe_id}`}
                        className="text-sm font-semibold text-foreground line-clamp-1 hover:text-primary transition-colors"
                      >
                        {session.recipe?.title ?? 'Recipe'}
                      </Link>
                      {time && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 text-primary" />
                          <span>{time} mins</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes Snippet if available */}
                  {session.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic bg-muted/40 p-2.5 rounded-xl border border-border/50 mb-3">
                      &ldquo;{session.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-2.5 border-t border-border/50 flex items-center justify-between">
                  <Link
                    href={`/recipes/${session.recipe_id}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View recipe
                  </Link>

                  <Link href={`/recipes/${session.recipe_id}/cook`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7.5 px-2.5 text-xs gap-1 font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-[0.98] transition-colors"
                    >
                      <UtensilsCrossed className="h-3 w-3" />
                      <span>Cook again</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
