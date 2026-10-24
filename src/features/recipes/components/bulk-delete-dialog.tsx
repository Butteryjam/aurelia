'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, Utensils } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { bulkDeleteRecipes } from '@/features/recipes/actions'

interface BulkDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedRecipes: Array<{ id: string; title: string }>
  onSuccess?: (deletedIds: string[]) => void
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  selectedRecipes,
  onSuccess,
}: BulkDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const count = selectedRecipes.length
  const titleText = `Delete ${count} ${count === 1 ? 'recipe' : 'recipes'}?`
  const actionButtonText = `Delete ${count} ${count === 1 ? 'Recipe' : 'Recipes'}`

  async function handleDelete() {
    if (isDeleting || count === 0) return
    setIsDeleting(true)
    setError(null)

    try {
      const ids = selectedRecipes.map((r) => r.id)
      const res = await bulkDeleteRecipes(ids)

      if (res.error) {
        setError(res.error)
        setIsDeleting(false)
        return
      }

      const deletedCount = res.data?.count ?? count
      toast.success(
        deletedCount === 1 ? 'Recipe deleted.' : `${deletedCount} recipes deleted.`
      )

      onOpenChange(false)
      setIsDeleting(false)

      if (onSuccess && res.data?.deletedIds) {
        onSuccess(res.data.deletedIds)
      }

      router.refresh()
    } catch (err: unknown) {
      console.error('Bulk delete recipes error:', err)
      setError(err instanceof Error ? err.message : 'Could not delete selected recipes.')
      setIsDeleting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isDeleting) {
          if (!nextOpen) setError(null)
          onOpenChange(nextOpen)
        }
      }}
    >
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-destructive font-semibold flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive shrink-0" />
            <span>{titleText}</span>
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm text-muted-foreground leading-relaxed">
            The selected recipes will be permanently deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Selected recipes preview list for user review */}
        {count > 0 && (
          <div className="space-y-2 py-1">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Recipes to be deleted ({count}):</span>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border/80 bg-muted/40 p-2.5">
              <ul className="space-y-1.5 text-xs text-foreground">
                {selectedRecipes.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 truncate">
                    <Utensils className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate font-medium">{r.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium"
          >
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || count === 0}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              actionButtonText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
