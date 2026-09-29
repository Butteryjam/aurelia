'use client'

import Link from 'next/link'
import { Plus, BookOpen, Sparkles, RotateCcw } from 'lucide-react'
import type { Recipe } from '@/types/database'
import type { FilterOptions } from '@/features/recipes/queries'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { RecipeCard } from './recipe-card'
import { RecipeSearchBar } from './recipe-search-bar'
import { RecipeSortSelect } from './recipe-sort-select'
import { RecipeFiltersSheet } from './recipe-filters-sheet'
import { useRecipeFilters } from '@/features/recipes/hooks/use-recipe-filters'
import { cn } from '@/lib/utils'

interface RecipesViewProps {
  recipes: Recipe[]
  favoriteIds: string[]
  filterOptions: FilterOptions
}

export function RecipesView({ recipes, favoriteIds, filterOptions }: RecipesViewProps) {
  const {
    filters,
    isPending,
    activeFilterCount,
    setSearchInput,
    setCategory,
    setCuisine,
    setDifficulty,
    setMaxTime,
    setTag,
    setFavorite,
    setSort,
    clearFilters,
  } = useRecipeFilters()

  const hasSearchOrFilters = activeFilterCount > 0 || Boolean(filters.q.trim())

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Editorial Page Header Primitive */}
      <PageHeader
        title="Recipes"
        badge={
          <Badge variant="tag-neutral" size="sm" className="font-semibold">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
          </Badge>
        }
        description={
          hasSearchOrFilters
            ? `Showing ${recipes.length} ${recipes.length === 1 ? 'recipe' : 'recipes'} matching active search and filters.`
            : 'Your personal culinary archive and living collection of recipes, notes, and heirloom techniques.'
        }
        primaryAction={
          <Link href="/recipes/new">
            <Button
              size="default"
              className="gap-2 shadow-xs min-h-[44px] text-xs sm:text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>Add Recipe</span>
            </Button>
          </Link>
        }
        secondaryActions={
          <Link href="/recipes/import">
            <Button
              variant="outline"
              size="default"
              className="gap-2 min-h-[44px] text-xs sm:text-sm font-medium border-border/80 hover:border-primary/40 hover:bg-primary/5"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Import with AI</span>
            </Button>
          </Link>
        }
      />

      {/* Search, Filter & Sort Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <RecipeSearchBar
            value={filters.q}
            onChange={setSearchInput}
            isPending={isPending}
            className="flex-1"
          />
          <RecipeSortSelect
            value={filters.sort}
            onChange={setSort}
            className="shrink-0 self-stretch sm:self-auto"
          />
        </div>

        <RecipeFiltersSheet
          options={filterOptions}
          activeFilters={{
            category: filters.category,
            cuisine: filters.cuisine,
            difficulty: filters.difficulty,
            maxTime: filters.maxTime,
            tag: filters.tag,
            favorite: filters.favorite,
          }}
          activeCount={activeFilterCount}
          onCategoryChange={setCategory}
          onCuisineChange={setCuisine}
          onDifficultyChange={setDifficulty}
          onMaxTimeChange={setMaxTime}
          onTagChange={setTag}
          onFavoriteChange={setFavorite}
          onClearAll={clearFilters}
        />
      </div>

      {/* Recipe Grid or Empty States */}
      {recipes.length === 0 ? (
        hasSearchOrFilters ? (
          /* No-Results State */
          <EmptyState
            icon={Sparkles}
            variant="standard"
            title={
              filters.q
                ? `No recipes found for "${filters.q}"`
                : 'No recipes match your filters'
            }
            description="We couldn't find any recipes matching your current search or filter criteria. Try adjusting keywords or resetting filters."
            className="my-8"
          >
            <Button
              variant="outline"
              size="default"
              onClick={clearFilters}
              className="gap-2 min-h-[44px] shadow-2xs"
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <span>Clear All Filters</span>
            </Button>
          </EmptyState>
        ) : (
          /* Empty Cookbook State */
          <EmptyState
            icon={BookOpen}
            variant="editorial"
            title="Your Culinary Archive"
            description="Every great meal begins with a single note. Add your cherished family recipes, weekly meal foundations, or experiment with AI import."
            className="my-8"
          >
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/recipes/new">
                <Button size="default" className="gap-2 shadow-card min-h-[44px]">
                  <Plus className="h-4 w-4" />
                  <span>Add Your First Recipe</span>
                </Button>
              </Link>
              <Link href="/recipes/import">
                <Button variant="outline" size="default" className="gap-2 min-h-[44px]">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Import with AI</span>
                </Button>
              </Link>
            </div>
          </EmptyState>
        )
      ) : (
        /* Curated Cookbook Grid */
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200',
            isPending && 'opacity-60 pointer-events-none'
          )}
        >
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorite={favoriteIds.includes(recipe.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
