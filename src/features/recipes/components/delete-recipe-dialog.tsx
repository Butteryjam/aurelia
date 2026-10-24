'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
  redirectTo?: string | null
}

export function DeleteRecipeDialog({
  recipeId,
  recipeTitle,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
  redirectTo = '/recipes',
}: DeleteRecipeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null)
    }
    if (isControlled) {
      controlledOnOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  async function handleDelete() {
    if (isDeleting) return
    setIsDeleting(true)
    setError(null)

    try {
      const res = await deleteRecipe(recipeId)
      if (res.error) {
        setError(res.error)
        setIsDeleting(false)
        return
      }

      toast.success('Recipe deleted.')
      setOpen(false)
      setIsDeleting(false)

      if (onSuccess) {
        onSuccess()
      }

      if (redirectTo) {
        router.push(redirectTo)
        router.refresh()
      } else {
        router.refresh()
      }
    } catch (err: unknown) {
      console.error('Delete recipe error:', err)
      setError(err instanceof Error ? err.message : 'Could not delete recipe.')
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-destructive font-semibold">Delete this recipe?</DialogTitle>
          <DialogDescription className="pt-2 text-sm text-muted-foreground">
            {recipeTitle ? (
              <span className="block mb-1 font-medium text-foreground">
                &ldquo;{recipeTitle}&rdquo;
              </span>
            ) : null}
            This recipe will be permanently deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

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
              'Delete Recipe'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
