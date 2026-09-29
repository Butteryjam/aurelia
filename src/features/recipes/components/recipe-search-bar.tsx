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
    <div className={cn('relative flex-1 group', className)}>
      <Search
        className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none"
        aria-hidden="true"
      />

      <Input
        ref={inputRef}
        type="text"
        id="recipe-library-search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-16 h-11 min-h-[44px] rounded-xl border-input bg-card/70 dark:bg-card/60 backdrop-blur-md text-sm text-foreground placeholder:text-muted-foreground/60 shadow-2xs transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/80"
        aria-label="Search recipes"
      />

      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {isPending ? (
          <div role="status" className="flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="sr-only">Searching recipes...</span>
          </div>
        ) : value ? (
          <button
            type="button"
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd
            className="hidden sm:inline-flex h-5 items-center justify-center rounded-md border border-border/80 bg-muted/60 px-1.5 font-mono text-[10px] font-semibold text-muted-foreground/80 select-none shadow-2xs"
            aria-hidden="true"
            title="Press / to focus search"
          >
            /
          </kbd>
        )}
      </div>
    </div>
  )
}
