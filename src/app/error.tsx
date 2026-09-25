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
    // Log sanitized error message for diagnostics
    console.error('[Application Error Boundary caught error]:', error.message)
  }, [error])

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md space-y-6">
        {/* Warning Icon Badge */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-8 ring-destructive/5">
          <AlertCircle className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-destructive">
            Something went wrong
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A mishap in the kitchen
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We encountered an unexpected error while processing this request. Your saved recipes and
            data remain completely secure.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button onClick={() => reset()} variant="default" className="w-full sm:w-auto">
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>

          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/recipes" className="inline-flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Return to Recipes
            </Link>
          </Button>
        </div>

        <div className="pt-4 border-t border-border">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
