'use client'

import { useState, useEffect } from 'react'
import { FolderPlus, Check, Loader2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  addRecipeToCollection,
  removeRecipeFromCollection,
  getRecipeCollectionIds,
} from '@/features/collections/actions'
import { CollectionDialog } from './collection-dialog'
import type { Collection } from '@/types/database'

interface AddToCollectionDialogProps {
  recipeId: string
  trigger?: React.ReactNode
}

export function AddToCollectionDialog({ recipeId, trigger }: AddToCollectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({})

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setIsLoading(true)
    }
  }

  useEffect(() => {
    if (!open) return

    let isMounted = true

    async function loadData() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const [colsRes, activeIds] = await Promise.all([
          supabase.from('collections').select('*').eq('user_id', user.id).order('name'),
          getRecipeCollectionIds(recipeId),
        ])

        if (isMounted) {
          setCollections(colsRes.data ?? [])
          setSelectedIds(activeIds)
        }
      } catch (e) {
        console.error('Failed to load collections for recipe:', e)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [open, recipeId])

  async function handleToggle(collectionId: string) {
    const isCurrentlySelected = selectedIds.includes(collectionId)
    setPendingIds((prev) => ({ ...prev, [collectionId]: true }))

    // Optimistic toggle
    if (isCurrentlySelected) {
      setSelectedIds((prev) => prev.filter((id) => id !== collectionId))
      await removeRecipeFromCollection(collectionId, recipeId)
    } else {
      setSelectedIds((prev) => [...prev, collectionId])
      await addRecipeToCollection(collectionId, recipeId)
    }

    setPendingIds((prev) => ({ ...prev, [collectionId]: false }))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8.5 gap-1.5 text-xs">
            <FolderPlus className="h-3.5 w-3.5" />
            <span>Add to Collection</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md rounded-2xl border border-border shadow-dialog p-6">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="font-serif text-xl font-bold tracking-tight text-foreground">
            Organize in Collections
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Select collections to include or organize this recipe into.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Loading collections…</span>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-xl p-4 space-y-3">
              <p className="text-xs text-muted-foreground">You haven&apos;t created any collections yet.</p>
              <CollectionDialog
                mode="create"
                onSuccess={(newId) => {
                  setSelectedIds((prev) => [...prev, newId])
                }}
                trigger={
                  <Button size="sm" variant="default" className="gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    Create Your First Collection
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {collections.map((col) => {
                const isSelected = selectedIds.includes(col.id)
                const isItemPending = pendingIds[col.id]

                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => handleToggle(col.id)}
                    disabled={isItemPending}
                    className={`flex items-center justify-between w-full p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border/70 hover:border-border hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{col.name}</p>
                      {col.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {col.description}
                        </p>
                      )}
                    </div>

                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ml-3 ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {collections.length > 0 && (
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <CollectionDialog
              mode="create"
              onSuccess={(newId) => {
                setSelectedIds((prev) => [...prev, newId])
              }}
              trigger={
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Collection</span>
                </Button>
              }
            />

            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
