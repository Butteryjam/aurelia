'use client'

import { useState } from 'react'
import { Filter, X, Heart, Clock, ChefHat, Sparkles, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { FilterOptions } from '@/features/recipes/queries'
import { cn } from '@/lib/utils'

interface RecipeFiltersSheetProps {
  options: FilterOptions
  activeFilters: {
    category: string
    cuisine: string
    difficulty: string
    maxTime: number | null
    tag: string
    favorite: boolean
  }
  activeCount: number
  onCategoryChange: (cat: string) => void
  onCuisineChange: (cui: string) => void
  onDifficultyChange: (diff: string) => void
  onMaxTimeChange: (time: number | null) => void
  onTagChange: (tag: string) => void
  onFavoriteChange: (fav: boolean) => void
  onClearAll: () => void
}

const TIME_PRESETS = [
  { label: 'Under 15 mins', value: 15 },
  { label: 'Under 30 mins', value: 30 },
  { label: 'Under 45 mins', value: 45 },
  { label: 'Under 60 mins', value: 60 },
]

export function RecipeFiltersSheet({
  options,
  activeFilters,
  activeCount,
  onCategoryChange,
  onCuisineChange,
  onDifficultyChange,
  onMaxTimeChange,
  onTagChange,
  onFavoriteChange,
  onClearAll,
}: RecipeFiltersSheetProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-3">
      {/* Filter Toolbar Row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {/* Main Filter Dialog Trigger */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="default"
              className={cn(
                'h-11 min-h-[44px] shrink-0 gap-2 rounded-xl border border-input bg-card/70 dark:bg-card/60 backdrop-blur-md px-4 text-xs sm:text-sm font-medium shadow-2xs transition-all hover:bg-card hover:border-border/90',
                activeCount > 0 && 'border-primary/50 bg-primary/5 text-foreground'
              )}
              aria-label="Open filter options"
            >
              <Filter className={cn('h-4 w-4', activeCount > 0 ? 'text-primary' : 'text-muted-foreground')} />
              <span>Filters</span>
              {activeCount > 0 && (
                <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border-border bg-card shadow-dialog">
            <DialogHeader className="space-y-1">
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="text-xl font-serif font-bold tracking-tight text-foreground">
                  Filter Recipes
                </DialogTitle>
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset all ({activeCount})
                  </button>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Refine your culinary archive by cuisine, category, cook time, and tags.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Favorites Filter */}
              <label
                className={cn(
                  'flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none',
                  activeFilters.favorite
                    ? 'border-rose-500/40 bg-rose-500/10 text-foreground'
                    : 'border-border/80 bg-muted/30 hover:bg-muted/50 text-muted-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                      activeFilters.favorite
                        ? 'bg-rose-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Heart
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        activeFilters.favorite && 'fill-current scale-110'
                      )}
                    />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground block">
                      Favorites only
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Show only saved recipes
                    </span>
                  </div>
                </div>

                <div className="relative flex items-center p-2">
                  <input
                    type="checkbox"
                    checked={activeFilters.favorite}
                    onChange={(e) => onFavoriteChange(e.target.checked)}
                    className="h-5 w-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    aria-label="Filter by favorites only"
                  />
                </div>
              </label>

              {/* Cooking Time */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Max Cooking Time</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_PRESETS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() =>
                        onMaxTimeChange(activeFilters.maxTime === t.value ? null : t.value)
                      }
                      className={cn(
                        'h-11 min-h-[44px] rounded-xl border px-3 text-xs font-medium transition-all text-left flex items-center justify-between',
                        activeFilters.maxTime === t.value
                          ? 'border-primary bg-primary/10 text-primary font-semibold shadow-2xs'
                          : 'border-border/80 bg-background/80 hover:bg-muted/70 text-foreground'
                      )}
                    >
                      <span>{t.label}</span>
                      {activeFilters.maxTime === t.value && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ChefHat className="h-3.5 w-3.5 text-primary" />
                  <span>Difficulty</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((d) => {
                    const isSelected = activeFilters.difficulty === d
                    const activeClasses = {
                      easy: 'border-emerald-600/35 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-semibold shadow-2xs',
                      medium: 'border-amber-600/35 bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold shadow-2xs',
                      hard: 'border-rose-600/35 bg-rose-500/15 text-rose-800 dark:text-rose-300 font-semibold shadow-2xs',
                    }

                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          onDifficultyChange(isSelected ? '' : d)
                        }
                        className={cn(
                          'h-11 min-h-[44px] rounded-xl border text-xs font-medium capitalize transition-all text-center flex items-center justify-center',
                          isSelected
                            ? activeClasses[d]
                            : 'border-border/80 bg-background/80 hover:bg-muted/70 text-foreground'
                        )}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Category */}
              {options.categories.length > 0 && (
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {options.categories.map((c) => {
                      const isSelected = activeFilters.category.toLowerCase() === c.toLowerCase()
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => onCategoryChange(isSelected ? '' : c)}
                          className={cn(
                            'relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-all after:absolute after:-inset-1 after:content-[""]',
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                              : 'border border-border/80 bg-background/80 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                          )}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Cuisine */}
              {options.cuisines.length > 0 && (
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cuisine
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {options.cuisines.map((cui) => {
                      const isSelected = activeFilters.cuisine.toLowerCase() === cui.toLowerCase()
                      return (
                        <button
                          key={cui}
                          type="button"
                          onClick={() => onCuisineChange(isSelected ? '' : cui)}
                          className={cn(
                            'relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-all after:absolute after:-inset-1 after:content-[""]',
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                              : 'border border-border/80 bg-background/80 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                          )}
                        >
                          {cui}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tags */}
              {options.tags.length > 0 && (
                <div className="space-y-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Tags</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {options.tags.map((t) => {
                      const isSelected = activeFilters.tag.toLowerCase() === t.toLowerCase()
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => onTagChange(isSelected ? '' : t)}
                          className={cn(
                            'relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-all after:absolute after:-inset-1 after:content-[""]',
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                              : 'border border-border/80 bg-background/80 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                          )}
                        >
                          #{t}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-border/60 flex items-center justify-between gap-3">
              {activeCount > 0 ? (
                <Button
                  variant="ghost"
                  size="default"
                  onClick={onClearAll}
                  className="min-h-[44px] text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              ) : <div />}
              <Button
                size="default"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto min-h-[44px] shadow-xs"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Favorites Toolbar Pill */}
        <button
          type="button"
          onClick={() => onFavoriteChange(!activeFilters.favorite)}
          className={cn(
            'h-11 min-h-[44px] shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 text-xs sm:text-sm font-medium transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeFilters.favorite
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold'
              : 'border-input bg-card/70 dark:bg-card/60 backdrop-blur-md text-muted-foreground hover:text-foreground hover:bg-card'
          )}
          aria-pressed={activeFilters.favorite}
          aria-label="Filter favorites"
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              activeFilters.favorite ? 'fill-rose-500 text-rose-500 scale-105' : 'text-muted-foreground'
            )}
          />
          <span>Favorites</span>
        </button>

        {/* Quick Category Pills (Desktop / Tablet) */}
        {options.categories.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            <button
              type="button"
              onClick={() => onCategoryChange('')}
              className={cn(
                'h-11 min-h-[44px] rounded-xl px-3.5 text-xs sm:text-sm font-medium transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !activeFilters.category
                  ? 'bg-secondary text-secondary-foreground font-semibold shadow-2xs border border-border/60'
                  : 'border border-input bg-card/70 dark:bg-card/60 backdrop-blur-md text-muted-foreground hover:bg-card hover:text-foreground'
              )}
            >
              All Categories
            </button>
            {options.categories.map((cat) => {
              const isSelected = activeFilters.category.toLowerCase() === cat.toLowerCase()
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onCategoryChange(isSelected ? '' : cat)}
                  className={cn(
                    'h-11 min-h-[44px] rounded-xl px-3.5 text-xs sm:text-sm font-medium transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'border border-input bg-card/70 dark:bg-card/60 backdrop-blur-md text-muted-foreground hover:bg-card hover:text-foreground'
                  )}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 animate-fade-in">
          <span className="text-xs text-muted-foreground font-medium mr-1 select-none">
            Active filters:
          </span>

          {activeFilters.favorite && (
            <Badge
              variant="outline"
              className="gap-1.5 py-1 px-2.5 text-xs border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 font-medium"
            >
              <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
              <span>Favorites</span>
              <button
                type="button"
                onClick={() => onFavoriteChange(false)}
                className="relative ml-0.5 -mr-1 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors after:absolute after:-inset-2.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Remove favorites filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {activeFilters.category && (
            <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-medium">
              <span>Category: {activeFilters.category}</span>
              <button
                type="button"
                onClick={() => onCategoryChange('')}
                className="relative ml-0.5 -mr-1 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors after:absolute after:-inset-2.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Remove category filter ${activeFilters.category}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {activeFilters.cuisine && (
            <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-medium">
              <span>Cuisine: {activeFilters.cuisine}</span>
              <button
                type="button"
                onClick={() => onCuisineChange('')}
                className="relative ml-0.5 -mr-1 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors after:absolute after:-inset-2.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Remove cuisine filter ${activeFilters.cuisine}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {activeFilters.difficulty && (
            <Badge
              variant={
                activeFilters.difficulty === 'easy'
                  ? 'difficulty-easy'
                  : activeFilters.difficulty === 'medium'
                    ? 'difficulty-medium'
                    : 'difficulty-hard'
              }
              className="gap-1.5 py-1 px-2.5 text-xs capitalize font-medium"
            >
              <span>Difficulty: {activeFilters.difficulty}</span>
              <button
                type="button"
                onClick={() => onDifficultyChange('')}
                className="relative ml-0.5 -mr-1 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors after:absolute after:-inset-2.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Remove difficulty filter ${activeFilters.difficulty}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {activeFilters.maxTime && (
            <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-medium">
              <span>Under {activeFilters.maxTime} mins</span>
              <button
                type="button"
                onClick={() => onMaxTimeChange(null)}
                className="relative ml-0.5 -mr-1 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors after:absolute after:-inset-2.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Remove max time filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {activeFilters.tag && (
            <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs font-medium">
              <span>#{activeFilters.tag}</span>
              <button
                type="button"
                onClick={() => onTagChange('')}
                className="relative ml-0.5 -mr-1 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors after:absolute after:-inset-2.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Remove tag filter ${activeFilters.tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-primary font-semibold hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
