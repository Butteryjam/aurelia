'use client'

import Link from 'next/link'
import { Plus, BookOpen, Sparkles } from 'lucide-react'
import type { Recipe } from '@/types/database'
import type { FilterOptions } from '@/features/recipes/queries'
import { Button } from '@/components/ui/button'
import { RecipeCard } from './recipe-card'
import { RecipeSearchBar } from './recipe-search-bar'
import { RecipeSortSelect } from './recipe-sort-select'
import { RecipeFiltersSheet } from './recipe-filters-sheet'
import { useRecipeFilters } from '@/features/recipes/hooks/use-recipe-filters'
import { EmptyState } from '@/components/shared/empty-state'

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
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            Recipes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}{' '}
            {hasSearchOrFilters ? 'matching filters' : 'in your archive'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/recipes/import">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-primary/30 hover:bg-primary/5 text-xs font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Import with AI</span>
            </Button>
          </Link>
          <Link href="/recipes/new">
            <Button size="sm" className="gap-2 shadow-xs text-xs font-medium">
              <Plus className="h-4 w-4" />
              <span>Add Recipe</span>
            </Button>
          </Link>
        </div>
      </div>

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
            className="shrink-0 self-end sm:self-auto"
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
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-2xl p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {filters.q ? `No recipes found for "${filters.q}"` : 'No recipes match your filters'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-5">
              Try adjusting your search terms or clearing some filters to see more results.
            </p>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear all filters
            </Button>
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No recipes yet"
            description="Your archive is waiting for its first culinary masterpiece. Add a recipe to get started!"
          >
            <Link href="/recipes/new">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Recipe
              </Button>
            </Link>
          </EmptyState>
        )
      ) : (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-200 ${
            isPending ? 'opacity-60' : 'opacity-100'
          }`}
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
