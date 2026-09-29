'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, Trash2, Edit, Loader2, ArrowRight } from 'lucide-react'
import type { CollectionWithRecipes } from '@/features/collections/queries'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SafeImage } from '@/components/shared/safe-image'
import { CollectionDialog } from './collection-dialog'
import { deleteCollection } from '@/features/collections/actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CollectionCardProps {
  collection: CollectionWithRecipes
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteCollection(collection.id)
      setDeleteOpen(false)
      router.refresh()
    } catch (e) {
      console.error('Failed to delete collection:', e)
    } finally {
      setIsDeleting(false)
    }
  }

  const recipeCount = collection.recipe_count ?? 0

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-card transition-all duration-300 hover:shadow-hover hover:border-border/90 active:scale-[0.995]">
        {/* Cover Media - Editorial Cookbook Volume Cover */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {collection.cover_image_url ? (
            <>
              <SafeImage
                src={collection.cover_image_url}
                alt={collection.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-stone-100 dark:bg-stone-900 text-muted-foreground/50">
                    <BookOpen className="h-10 w-10 stroke-[1.5]" />
                  </div>
                }
              />
              {/* Subtle top scrim for badge legibility */}
              <div
                className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 via-black/10 to-transparent pointer-events-none"
                aria-hidden="true"
              />
            </>
          ) : (
            /* Editorial Cookbook Volume Cover Placeholder */
            <div className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-stone-100 via-amber-50/40 to-stone-200 dark:from-stone-900 dark:via-stone-900/60 dark:to-stone-950 p-6 overflow-hidden select-none">
              {/* Decorative Debossed Book Spine Edge */}
              <div
                className="absolute inset-y-0 left-0 w-3 sm:w-3.5 bg-primary/15 dark:bg-primary/20 border-r border-primary/25"
                aria-hidden="true"
              />

              {/* Volume Seal / Emblem */}
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/90 dark:bg-card/90 backdrop-blur-xs border border-border/80 text-primary shadow-xs transition-transform duration-300 group-hover:scale-105">
                <BookOpen className="h-6 w-6 stroke-[1.75]" />
              </div>

              {/* Subtle Volume Label */}
              <span className="mt-3 text-[10px] font-sans font-bold uppercase tracking-widest text-muted-foreground/70">
                Culinary Volume
              </span>
            </div>
          )}

          {/* Recipe Count Badge */}
          <div className="absolute right-3 top-3 z-10">
            <Badge
              variant="outline"
              size="sm"
              className="backdrop-blur-md bg-background/85 dark:bg-card/85 font-semibold text-xs border border-border/60 shadow-2xs text-foreground"
            >
              {recipeCount} {recipeCount === 1 ? 'recipe' : 'recipes'}
            </Badge>
          </div>
        </div>

        {/* Card Body */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {/* Eyebrow */}
          <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground/80 mb-1.5">
            Curated Collection
          </div>

          {/* Title: Editorial serif font with consistent line height (up to 2 lines) */}
          <h3 className="line-clamp-2 text-base sm:text-lg font-serif font-bold tracking-tight text-foreground transition-colors group-hover:text-primary mb-1.5 min-h-[2.75rem] leading-snug">
            <Link
              href={`/collections/${collection.id}`}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xs"
            >
              <span className="absolute inset-0 z-0" aria-hidden="true" />
              {collection.name}
            </Link>
          </h3>

          {/* Description: Clean 2-line clamp with consistent height */}
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed mb-4 min-h-[2.25rem]">
            {collection.description ? (
              collection.description
            ) : (
              <span className="italic text-muted-foreground/50">
                No volume description provided.
              </span>
            )}
          </p>

          {/* Footer Actions (z-10 so clicking them does not trigger card navigation) */}
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/60 z-10 relative">
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
              <span>View recipes</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>

            <div className="flex items-center gap-1">
              <CollectionDialog
                mode="edit"
                collection={collection}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 min-h-[32px] min-w-[32px] p-0 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg"
                    aria-label={`Edit ${collection.name}`}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                }
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="h-8 w-8 min-h-[32px] min-w-[32px] p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                aria-label={`Delete ${collection.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
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
    </>
  )
}
