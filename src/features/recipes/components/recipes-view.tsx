'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus,
  BookOpen,
  Sparkles,
  RotateCcw,
  CheckSquare,
  Trash2,
  X,
  Check,
  Minus,
} from 'lucide-react'
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
import dynamic from 'next/dynamic'
import { useRecipeFilters } from '@/features/recipes/hooks/use-recipe-filters'
import { cn } from '@/lib/utils'

const BulkDeleteDialog = dynamic(
  () => import('./bulk-delete-dialog').then((m) => m.BulkDeleteDialog),
  { ssr: false }
)

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

  // Track locally deleted recipes for instantaneous UI update without waiting for RSC revalidation
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  // Visible recipes considering local deletions
  const visibleRecipes = useMemo(
    () => recipes.filter((r) => !deletedIds.has(r.id)),
    [recipes, deletedIds]
  )

  const hasSearchOrFilters = activeFilterCount > 0 || Boolean(filters.q.trim())

  // Select all calculations scoped to current visible matching recipes
  const allSelected =
    visibleRecipes.length > 0 && visibleRecipes.every((r) => selectedIds.has(r.id))
  const someSelected =
    visibleRecipes.some((r) => selectedIds.has(r.id)) && !allSelected

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visibleRecipes.map((r) => r.id)))
    }
  }

  const handleToggleRecipe = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false)
    setSelectedIds(new Set())
  }

  const handleBulkDeleteSuccess = (newlyDeletedIds: string[]) => {
    setDeletedIds((prev) => new Set([...prev, ...newlyDeletedIds]))
    setSelectedIds(new Set())
    setIsSelectionMode(false)
  }

  const handleSingleDeleteSuccess = (recipeId: string) => {
    setDeletedIds((prev) => new Set([...prev, recipeId]))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(recipeId)
      return next
    })
  }

  const selectedRecipesForDialog = useMemo(() => {
    return visibleRecipes
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({ id: r.id, title: r.title }))
  }, [visibleRecipes, selectedIds])

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Editorial Page Header Primitive */}
      <PageHeader
        title="Recipes"
        badge={
          <Badge variant="tag-neutral" size="sm" className="font-semibold">
            {visibleRecipes.length} {visibleRecipes.length === 1 ? 'recipe' : 'recipes'}
          </Badge>
        }
        description={
          hasSearchOrFilters
            ? `Showing ${visibleRecipes.length} ${visibleRecipes.length === 1 ? 'recipe' : 'recipes'} matching active search and filters.`
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
        secondaryActions={[
          <Button
            key="select"
            variant={isSelectionMode ? 'default' : 'outline'}
            size="default"
            onClick={() => {
              if (isSelectionMode) {
                handleExitSelectionMode()
              } else {
                setIsSelectionMode(true)
                setSelectedIds(new Set())
              }
            }}
            disabled={visibleRecipes.length === 0}
            className={cn(
              'gap-2 min-h-[44px] text-xs sm:text-sm font-medium transition-colors',
              isSelectionMode
                ? 'bg-primary text-primary-foreground'
                : 'border-border/80 hover:border-primary/40 hover:bg-primary/5'
            )}
          >
            <CheckSquare className="h-4 w-4" />
            <span>{isSelectionMode ? 'Done' : 'Select'}</span>
          </Button>,
          <Link key="import" href="/recipes/import">
            <Button
              variant="outline"
              size="default"
              className="gap-2 min-h-[44px] text-xs sm:text-sm font-medium border-border/80 hover:border-primary/40 hover:bg-primary/5"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Import with AI</span>
            </Button>
          </Link>,
        ]}
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

      {/* Bulk Selection Control Toolbar */}
      {isSelectionMode && visibleRecipes.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border border-primary/20 bg-primary/5 backdrop-blur-md shadow-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleSelectAll}
              className="h-8 gap-2 text-xs font-semibold bg-background border-border hover:bg-accent"
            >
              <div
                className={cn(
                  'h-4 w-4 rounded-sm border flex items-center justify-center transition-colors',
                  allSelected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground/60'
                )}
              >
                {allSelected ? (
                  <Check className="h-3 w-3 stroke-[3]" />
                ) : someSelected ? (
                  <Minus className="h-3 w-3 stroke-[3] text-primary" />
                ) : null}
              </div>
              <span>{allSelected ? 'Deselect All' : `Select All (${visibleRecipes.length})`}</span>
            </Button>
            <span className="text-xs sm:text-sm font-medium text-foreground">
              {selectedIds.size} {selectedIds.size === 1 ? 'recipe' : 'recipes'} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setBulkDeleteDialogOpen(true)}
              className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleExitSelectionMode}
              className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </Button>
          </div>
        </div>
      )}

      {/* Recipe Grid or Empty States */}
      {visibleRecipes.length === 0 ? (
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
          {visibleRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorite={favoriteIds.includes(recipe.id)}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(recipe.id)}
              onToggleSelect={handleToggleRecipe}
              onDeleteSuccess={handleSingleDeleteSuccess}
            />
          ))}
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {bulkDeleteDialogOpen && (
        <BulkDeleteDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          selectedRecipes={selectedRecipesForDialog}
          onSuccess={handleBulkDeleteSuccess}
        />
      )}
    </div>
  )
}
