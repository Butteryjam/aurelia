'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Trash2, X, Loader2, Edit, ArrowRight } from 'lucide-react'
import type { CollectionWithRecipes } from '@/features/collections/queries'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { PageHeader } from '@/components/shared/page-header'
import { SafeImage } from '@/components/shared/safe-image'

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
      {/* Editorial Page Header with Breadcrumb and Actions */}
      <PageHeader
        breadcrumb={
          <Link
            href="/collections"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group py-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>All Collections</span>
          </Link>
        }
        title={collection.name}
        badge={
          <Badge variant="secondary" className="font-semibold text-xs tracking-normal">
            {recipes.length} {recipes.length === 1 ? 'Recipe' : 'Recipes'}
          </Badge>
        }
        description={collection.description || 'Curated personal cookbook volume in your culinary archive.'}
        secondaryActions={
          <div className="flex items-center gap-2">
            <CollectionDialog
              mode="edit"
              collection={collection}
              trigger={
                <Button variant="outline" size="sm" className="h-9 min-h-[36px] gap-1.5 font-medium">
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
              }
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="h-9 min-h-[36px] gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
              aria-label={`Delete ${collection.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        }
      />

      {/* Editorial Cookbook Volume Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-card">
        {collection.cover_image_url ? (
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <SafeImage
              src={collection.cover_image_url}
              alt={collection.name}
              fill
              className="object-cover blur-sm opacity-20 dark:opacity-15 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/70 dark:from-card dark:via-card/95 dark:to-card/85" />
          </div>
        ) : (
          <div className="absolute inset-y-0 left-0 w-3 sm:w-3.5 bg-primary/15 dark:bg-primary/20 border-r border-primary/25" />
        )}

        <div className="flex items-start gap-4 sm:gap-5">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
            <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 stroke-[1.75]" />
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground/80">
              <span>Curated Volume</span>
              <span aria-hidden="true">•</span>
              <span>
                {recipes.length} {recipes.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground line-clamp-2">
              {collection.name}
            </h2>

            {collection.description && (
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {collection.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recipes in Collection Section */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Recipes in this Collection
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dishes curated specifically for this culinary volume.
            </p>
          </div>

          <Link href="/recipes">
            <Button variant="ghost" size="sm" className="text-xs text-primary gap-1 font-medium hover:text-primary p-0 sm:px-3">
              <span>Browse recipe library</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {recipes.length === 0 ? (
          <EmptyState
            variant="editorial"
            icon={BookOpen}
            title="This volume is currently empty"
            description="Add recipes to this collection by clicking 'Add to Collection' on any recipe card or recipe detail page."
            action={
              <Link href="/recipes">
                <Button size="default" className="gap-2 min-h-[44px]">
                  <span>Browse Recipes</span>
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isFavorite={favoriteIds.includes(recipe.id)}
                action={
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipe(recipe.id)}
                    disabled={removingId === recipe.id}
                    className="inline-flex h-7 items-center gap-1 rounded-full bg-background/90 dark:bg-card/90 backdrop-blur-md border border-border/80 px-2.5 text-[11px] font-medium text-muted-foreground shadow-2xs hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive min-h-[28px]"
                    aria-label={`Remove ${recipe.title} from collection`}
                  >
                    {removingId === recipe.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-destructive" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    <span>Remove</span>
                  </button>
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl border border-border shadow-dialog p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="font-serif text-xl font-bold tracking-tight text-foreground">
              Delete Collection
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
              Are you sure you want to delete <strong className="text-foreground">{collection.name}</strong>?
              Your recipes will not be deleted, only removed from this collection volume.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-3 mt-5 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
              className="min-h-[44px] sm:min-h-[36px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="min-h-[44px] sm:min-h-[36px] gap-2"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete collection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
