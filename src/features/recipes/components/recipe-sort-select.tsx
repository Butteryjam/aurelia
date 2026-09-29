'use client'

import { ArrowUpDown, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RecipeSortSelectProps {
  value: string
  onChange: (sort: string) => void
  className?: string
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Recently Added' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'alpha', label: 'Alphabetical (A–Z)' },
  { value: 'quickest', label: 'Quickest Cook Time' },
  { value: 'rating', label: 'Highest Rated' },
]

export function RecipeSortSelect({ value, onChange, className }: RecipeSortSelectProps) {
  return (
    <div className={cn('relative inline-flex items-center group', className)}>
      <ArrowUpDown
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-foreground pointer-events-none"
        aria-hidden="true"
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 min-h-[44px] w-full sm:w-auto rounded-xl border border-input bg-card/70 dark:bg-card/60 backdrop-blur-md pl-9 pr-9 py-2 text-xs sm:text-sm font-medium text-foreground appearance-none shadow-2xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/80 hover:border-border/90 cursor-pointer"
        aria-label="Sort recipes"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-background text-foreground py-1">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />
    </div>
  )
}
