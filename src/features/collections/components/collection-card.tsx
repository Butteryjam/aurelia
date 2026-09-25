'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Folder, Trash2, Edit, Loader2 } from 'lucide-react'
import type { CollectionWithRecipes } from '@/features/collections/queries'
import { Button } from '@/components/ui/button'
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

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xs transition-all duration-300 hover:shadow-md hover:border-border">
        {/* Cover Media */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          {collection.cover_image_url ? (
            <Image
              src={collection.cover_image_url}
              alt={collection.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-muted text-primary">
              <Folder className="h-12 w-12 opacity-80" />
            </div>
          )}

          {/* Recipe Count Badge */}
          <div className="absolute right-3 top-3 z-10">
            <span className="inline-flex items-center rounded-full bg-background/80 backdrop-blur-xs border border-border/50 px-2.5 py-0.5 text-xs font-semibold text-foreground shadow-xs">
              {collection.recipe_count ?? 0} {collection.recipe_count === 1 ? 'recipe' : 'recipes'}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary mb-1">
            <Link href={`/collections/${collection.id}`} className="focus:outline-none">
              <span className="absolute inset-0 z-0" aria-hidden="true" />
              {collection.name}
            </Link>
          </h3>

          {collection.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed mb-4">
              {collection.description}
            </p>
          )}

          {/* Footer Actions (z-10 so clicking them doesn't trigger card navigation) */}
          <div className="mt-auto flex items-center justify-end gap-1 pt-3 border-t border-border/50 z-10">
            <CollectionDialog
              mode="edit"
              collection={collection}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
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
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              aria-label={`Delete ${collection.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
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
    </>
  )
}
