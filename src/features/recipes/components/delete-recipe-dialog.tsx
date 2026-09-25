'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteRecipe } from '@/features/recipes/actions'

interface DeleteRecipeDialogProps {
  recipeId: string
  recipeTitle: string
  trigger?: React.ReactNode
}

export function DeleteRecipeDialog({
  recipeId,
  recipeTitle,
  trigger,
}: DeleteRecipeDialogProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)

    try {
      const res = await deleteRecipe(recipeId)
      if (res.error) {
        setError(res.error)
        setIsDeleting(false)
        return
      }

      setOpen(false)
      router.push('/recipes')
      router.refresh()
    } catch (err: unknown) {
      console.error('Delete recipe error:', err)
      setError(err instanceof Error ? err.message : 'Could not delete recipe.')
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5 text-xs">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-destructive font-semibold">Delete Recipe</DialogTitle>
          <DialogDescription className="pt-2 text-sm">
            Are you sure you want to delete <strong className="text-foreground">{recipeTitle}</strong>?
            This action cannot be undone, and will permanently delete this recipe, its ingredients, and instructions.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
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
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete recipe'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
