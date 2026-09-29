'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, RotateCcw, BookOpen, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log sanitized error message for diagnostics without leaking credentials
    console.error('[Application Error Boundary caught error]:', error.message)
  }, [error])

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12 text-center animate-fade-in">
      <div className="mx-auto max-w-md space-y-6">
        {/* Warning Icon Badge */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-card">
          <AlertCircle className="h-10 w-10 stroke-[1.8]" />
        </div>

        {/* Editorial Text */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-sans font-bold uppercase tracking-widest text-destructive">
            Something Went Awry
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A mishap in the kitchen
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Aurelia encountered an unexpected error while preparing this view. Your saved recipes,
            meal plans, and culinary archive remain completely secure.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto h-10 px-5 rounded-xl gap-2 text-xs font-semibold shadow-xs"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>

          <Button asChild variant="outline" className="w-full sm:w-auto h-10 px-5 rounded-xl gap-2 text-xs font-semibold">
            <Link href="/recipes">
              <BookOpen className="h-4 w-4" />
              <span>Return to Recipes</span>
            </Link>
          </Button>
        </div>

        {/* Home Escape Route */}
        <div className="pt-4 border-t border-border/80">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Kitchen Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
