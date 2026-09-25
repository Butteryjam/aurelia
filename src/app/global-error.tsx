'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCcw, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log sanitized error message for diagnostics without leaking credentials or stack
    console.error('[Critical Application Error caught by global-error]:', error.message)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-950 text-neutral-100 font-sans antialiased flex items-center justify-center p-4">
        <div className="mx-auto max-w-md w-full space-y-6 text-center">
          {/* Warning Icon Badge */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 ring-8 ring-red-500/5">
            <AlertCircle className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
              Application Error
            </p>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
              A mishap in the kitchen
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Aurelia encountered a critical issue while rendering the application shell.
              Your recipes, meal plans, and culinary notes remain safely stored.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              onClick={() => reset()}
              variant="default"
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white border-none"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>

            <Button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload()
                }
              }}
              variant="outline"
              className="w-full sm:w-auto border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 hover:text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Application
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
