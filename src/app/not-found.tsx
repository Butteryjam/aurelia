import Link from 'next/link'
import { ChefHat, ArrowLeft, BookOpen, Calendar, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Page Not Found | Aurelia',
  description: 'The requested culinary page or recipe could not be found.',
}

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12 text-center animate-fade-in">
      <div className="mx-auto max-w-md space-y-6">
        {/* Luxury Culinary Emblem */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-card">
          <ChefHat className="h-10 w-10 stroke-[1.8]" />
        </div>

        {/* Editorial Text Hierarchy */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-sans font-bold uppercase tracking-widest text-primary">
            404 — Recipe Not Found
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            This dish seems off the menu
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page, recipe, or culinary collection you are looking for may have been moved,
            renamed, or simmered away. Let&apos;s guide you back to your personal archive.
          </p>
        </div>

        {/* Action Buttons using established design tokens */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild className="w-full sm:w-auto h-10 px-5 rounded-xl gap-2 text-xs font-semibold shadow-xs">
            <Link href="/recipes">
              <BookOpen className="h-4 w-4" />
              <span>View Recipe Archive</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full sm:w-auto h-10 px-5 rounded-xl gap-2 text-xs font-semibold">
            <Link href="/">
              <Home className="h-4 w-4" />
              <span>Kitchen Dashboard</span>
            </Link>
          </Button>
        </div>

        {/* Breadcrumb / Back Link */}
        <div className="pt-4 border-t border-border/80 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link
            href="/meal-planner"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Meal Planner</span>
          </Link>
          <span aria-hidden="true">•</span>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
