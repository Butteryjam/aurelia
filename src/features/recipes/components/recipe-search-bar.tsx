'use client'

import { useRef, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface RecipeSearchBarProps {
  value: string
  onChange: (val: string) => void
  isPending?: boolean
  className?: string
  placeholder?: string
}

export function RecipeSearchBar({
  value,
  onChange,
  isPending = false,
  className,
  placeholder = 'Search recipes by title, ingredients, cuisine, or tags…',
}: RecipeSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut: Press "/" to focus search input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={cn('relative flex-1', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />

      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-14 h-10 bg-background/80 backdrop-blur-xs text-sm"
        aria-label="Search recipes"
      />

      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : value ? (
          <button
            type="button"
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            /
          </kbd>
        )}
      </div>
    </div>
  )
}
