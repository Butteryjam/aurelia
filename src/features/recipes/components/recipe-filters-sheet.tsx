'use client'

import { useState } from 'react'
import { Filter, X, Heart, Clock, ChefHat, Sparkles } from 'lucide-react'
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
      {/* Filter Trigger Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Mobile / Compact Filter Trigger */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-2 border-border bg-background/80"
              aria-label="Open filter options"
            >
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span>Filters</span>
              {activeCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-base">
                <span>Filter Recipes</span>
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Reset all ({activeCount})
                  </button>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Refine your culinary archive by cuisine, category, cook time, and tags.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Favorites Filter */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/40">
                <div className="flex items-center gap-2.5">
                  <Heart
                    className={`h-4 w-4 ${activeFilters.favorite ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}`}
                  />
                  <span className="text-sm font-medium">Favorites only</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeFilters.favorite}
                  onChange={(e) => onFavoriteChange(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
              </div>

              {/* Cooking Time */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
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
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-left ${
                        activeFilters.maxTime === t.value
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border/80 bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ChefHat className="h-3.5 w-3.5" />
                  <span>Difficulty</span>
                </label>
                <div className="flex gap-2">
                  {['easy', 'medium', 'hard'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        onDifficultyChange(activeFilters.difficulty === d ? '' : d)
                      }
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-colors text-center ${
                        activeFilters.difficulty === d
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border/80 bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              {options.categories.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {options.categories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          onCategoryChange(activeFilters.category === c ? '' : c)
                        }
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          activeFilters.category.toLowerCase() === c.toLowerCase()
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cuisine */}
              {options.cuisines.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cuisine
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {options.cuisines.map((cui) => (
                      <button
                        key={cui}
                        type="button"
                        onClick={() =>
                          onCuisineChange(activeFilters.cuisine === cui ? '' : cui)
                        }
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          activeFilters.cuisine.toLowerCase() === cui.toLowerCase()
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {cui}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {options.tags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Tags</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {options.tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          onTagChange(activeFilters.tag === t ? '' : t)
                        }
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          activeFilters.tag.toLowerCase() === t.toLowerCase()
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-border flex justify-end">
              <Button size="sm" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Category Bar (Desktop / Tablet) */}
        {options.categories.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => onCategoryChange('')}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors shrink-0 ${
                !activeFilters.category
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              All Categories
            </button>
            {options.categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  onCategoryChange(
                    activeFilters.category.toLowerCase() === cat.toLowerCase() ? '' : cat
                  )
                }
                className={`rounded-full px-3 py-1.5 font-medium transition-colors shrink-0 ${
                  activeFilters.category.toLowerCase() === cat.toLowerCase()
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 animate-fade-in">
          <span className="text-xs text-muted-foreground font-medium mr-1">Active filters:</span>

          {activeFilters.favorite && (
            <Badge variant="secondary" className="gap-1 text-xs py-1">
              <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
              <span>Favorites</span>
              <button
                type="button"
                onClick={() => onFavoriteChange(false)}
                className="hover:text-destructive transition-colors ml-1"
                aria-label="Remove favorites filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {activeFilters.category && (
            <Badge variant="secondary" className="gap-1 text-xs py-1">
              <span>Category: {activeFilters.category}</span>
              <button
                type="button"
                onClick={() => onCategoryChange('')}
                className="hover:text-destructive transition-colors ml-1"
                aria-label={`Remove category filter ${activeFilters.category}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {activeFilters.cuisine && (
            <Badge variant="secondary" className="gap-1 text-xs py-1">
              <span>Cuisine: {activeFilters.cuisine}</span>
              <button
                type="button"
                onClick={() => onCuisineChange('')}
                className="hover:text-destructive transition-colors ml-1"
                aria-label={`Remove cuisine filter ${activeFilters.cuisine}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {activeFilters.difficulty && (
            <Badge variant="secondary" className="gap-1 text-xs py-1 capitalize">
              <span>Difficulty: {activeFilters.difficulty}</span>
              <button
                type="button"
                onClick={() => onDifficultyChange('')}
                className="hover:text-destructive transition-colors ml-1"
                aria-label={`Remove difficulty filter ${activeFilters.difficulty}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {activeFilters.maxTime && (
            <Badge variant="secondary" className="gap-1 text-xs py-1">
              <span>Under {activeFilters.maxTime} mins</span>
              <button
                type="button"
                onClick={() => onMaxTimeChange(null)}
                className="hover:text-destructive transition-colors ml-1"
                aria-label="Remove max time filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {activeFilters.tag && (
            <Badge variant="secondary" className="gap-1 text-xs py-1">
              <span>#{activeFilters.tag}</span>
              <button
                type="button"
                onClick={() => onTagChange('')}
                className="hover:text-destructive transition-colors ml-1"
                aria-label={`Remove tag filter ${activeFilters.tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-primary font-medium hover:underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
