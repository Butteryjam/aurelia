'use client'

import { useState, useRef, useTransition } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { addManualItem } from '../actions'

interface ManualItemInputProps {
  listId: string
  onAdded?: () => void
}

/**
 * Inline input for adding manual shopping items.
 * Uses conservative natural-language parsing via addManualItem action.
 * If parsing is ambiguous, the full text is preserved as the item name.
 */
export function ManualItemInput({ listId, onAdded }: ManualItemInputProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return

    setError(null)
    startTransition(async () => {
      const result = await addManualItem(listId, trimmed)
      if (result.error) {
        setError(result.error)
      } else {
        setValue('')
        onAdded?.()
        inputRef.current?.focus()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='Add item, e.g. "2 cups flour" or "eggs"'
          disabled={isPending}
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          aria-label="Add manual shopping item"
        />
        <button
          type="submit"
          disabled={isPending || !value.trim()}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40 active:scale-95 after:absolute after:-inset-1 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Add item"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive font-medium">{error}</p>
      )}
    </form>
  )
}
