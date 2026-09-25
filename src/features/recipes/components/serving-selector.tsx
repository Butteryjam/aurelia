'use client'

import { Minus, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ServingSelectorProps {
  currentServings: number
  baseServings: number
  onChange: (servings: number) => void
  min?: number
  max?: number
}

export function ServingSelector({
  currentServings,
  baseServings,
  onChange,
  min = 1,
  max = 48,
}: ServingSelectorProps) {
  function decrement() {
    if (currentServings > min) {
      onChange(currentServings - 1)
    }
  }

  function increment() {
    if (currentServings < max) {
      onChange(currentServings + 1)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/40 p-2 sm:px-4 sm:py-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Users className="h-4 w-4 text-primary" />
        <span>Servings:</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={decrement}
          disabled={currentServings <= min}
          className="h-7 w-7 p-0 rounded-lg text-xs"
          aria-label="Decrease servings"
        >
          <Minus className="h-3 w-3" />
        </Button>

        <span className="min-w-6 text-center text-sm font-semibold tabular-nums text-foreground">
          {currentServings}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={increment}
          disabled={currentServings >= max}
          className="h-7 w-7 p-0 rounded-lg text-xs"
          aria-label="Increase servings"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {currentServings !== baseServings && (
        <button
          type="button"
          onClick={() => onChange(baseServings)}
          className="text-xs text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          Reset ({baseServings})
        </button>
      )}
    </div>
  )
}
