import Link from 'next/link'
import Image from 'next/image'
import { Utensils, Star, ChefHat, Play, Clock } from 'lucide-react'
import type { CookingSessionWithRecipe } from '@/features/cook-mode/queries'
import { Button } from '@/components/ui/button'

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
          <h2 className="text-lg font-serif font-bold tracking-tight text-foreground">
            Recent Cooking Activity
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your kitchen history, ratings, and culinary notes
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-dashed border-border/80 bg-card/40 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No cooking sessions recorded yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Launch hands-free Cook Mode on any recipe to time steps, log ratings, and save notes.
              </p>
            </div>
          </div>
          <Link href="/recipes">
            <Button size="sm" variant="outline" className="text-xs gap-1.5 shrink-0">
              <ChefHat className="h-3.5 w-3.5" />
              <span>Browse recipes</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {sessions.map((session) => {
            const time =
              session.recipe?.total_time ??
              ((session.recipe?.prep_time || 0) + (session.recipe?.cook_time || 0) > 0
                ? (session.recipe?.prep_time || 0) + (session.recipe?.cook_time || 0)
                : null)

            return (
              <div
                key={session.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs hover:shadow-sm transition-all"
              >
                <div>
                  {/* Top Badge: Date & Rating */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {formatSessionDate(session.completed_at || session.started_at)}
                    </span>

                    {session.rating && session.rating > 0 && (
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <Star className="h-3 w-3 fill-amber-500" />
                        <span>{session.rating}/5</span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail & Title */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/50">
                      {session.recipe?.image_url ? (
                        <Image
                          src={session.recipe.image_url}
                          alt={session.recipe.title}
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
                    <p className="text-xs text-muted-foreground line-clamp-2 italic bg-muted/30 p-2 rounded-lg border border-border/40 mb-3">
                      &ldquo;{session.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <Link
                    href={`/recipes/${session.recipe_id}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    View recipe
                  </Link>

                  <Link href={`/recipes/${session.recipe_id}/cook`}>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2.5 text-xs gap-1 font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Cook again</span>
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
