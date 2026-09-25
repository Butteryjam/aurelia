import Link from 'next/link'
import { Compass, ArrowLeft, BookOpen, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md space-y-6">
        {/* Culinary Icon Badge */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-8 ring-amber-500/5">
          <Compass className="h-10 w-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            404 — Recipe Not Found
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            This dish seems off the menu
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page or recipe you are looking for may have been moved, renamed, or simmered away.
            Let&apos;s guide you back to your culinary workspace.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild variant="default" className="w-full sm:w-auto">
            <Link href="/recipes" className="inline-flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              View My Recipes
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/meal-planner" className="inline-flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Meal Planner
            </Link>
          </Button>
        </div>

        <div className="pt-4 border-t border-border">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
