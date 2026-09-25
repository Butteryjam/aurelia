'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Trash2, Folder, X, Loader2 } from 'lucide-react'
import type { CollectionWithRecipes } from '@/features/collections/queries'
import { Button } from '@/components/ui/button'
import { RecipeCard } from '@/features/recipes/components/recipe-card'
import { CollectionDialog } from './collection-dialog'
import { removeRecipeFromCollection, deleteCollection } from '@/features/collections/actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'

interface CollectionDetailViewProps {
  collection: CollectionWithRecipes
  favoriteIds: string[]
}

export function CollectionDetailView({ collection, favoriteIds }: CollectionDetailViewProps) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteCollection(collection.id)
      router.push('/collections')
      router.refresh()
    } catch (e) {
      console.error('Failed to delete collection:', e)
      setIsDeleting(false)
    }
  }

  async function handleRemoveRecipe(recipeId: string) {
    setRemovingId(recipeId)
    try {
      await removeRecipeFromCollection(collection.id, recipeId)
      router.refresh()
    } catch (e) {
      console.error('Failed to remove recipe:', e)
    } finally {
      setRemovingId(null)
    }
  }

  const recipes = collection.recipes ?? []

  return (
    <div className="space-y-8 pb-16">
      {/* Back button & Action Header */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/collections"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>All collections</span>
        </Link>

        <div className="flex items-center gap-2">
          <CollectionDialog mode="edit" collection={collection} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
        {collection.cover_image_url && (
          <div className="absolute inset-0 -z-10 opacity-20">
            <Image
              src={collection.cover_image_url}
              alt={collection.name}
              fill
              className="object-cover blur-xs"
            />
            <div className="absolute inset-0 bg-background/80" />
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Folder className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              {collection.name}
            </h1>

            {collection.description && (
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
                {collection.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recipes in Collection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-foreground">Recipes in this Collection</h2>
          <Link href="/recipes">
            <Button variant="ghost" size="sm" className="text-xs text-primary">
              Browse recipe library →
            </Button>
          </Link>
        </div>

        {recipes.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Collection is empty"
            description="Add recipes to this collection by clicking 'Add to Collection' on any recipe card or recipe detail page."
          >
            <Link href="/recipes">
              <Button size="sm">Browse Recipes</Button>
            </Link>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="relative group/item">
                <RecipeCard
                  recipe={recipe}
                  isFavorite={favoriteIds.includes(recipe.id)}
                />

                {/* Quick Remove Overlay Button */}
                <div className="absolute left-3 top-3 z-20">
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipe(recipe.id)}
                    disabled={removingId === recipe.id}
                    className="flex h-7 items-center gap-1 rounded-full bg-background/90 backdrop-blur-xs border border-border px-2 text-[11px] font-medium text-muted-foreground shadow-xs hover:text-destructive hover:border-destructive/30 transition-colors"
                    aria-label={`Remove ${recipe.title} from collection`}
                  >
                    {removingId === recipe.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-destructive font-semibold">Delete Collection</DialogTitle>
            <DialogDescription className="pt-2 text-sm">
              Are you sure you want to delete <strong className="text-foreground">{collection.name}</strong>?
              Your recipes will not be deleted, only removed from this collection.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete collection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
