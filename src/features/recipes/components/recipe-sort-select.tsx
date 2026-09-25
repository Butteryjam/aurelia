'use client'

import { ArrowUpDown } from 'lucide-react'
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
    <div className={cn('relative inline-flex items-center', className)}>
      <ArrowUpDown className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-input bg-background/80 pl-8 pr-8 py-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        aria-label="Sort recipes"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
