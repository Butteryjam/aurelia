'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderPlus, Loader2, Edit } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImageUpload } from '@/components/shared/image-upload'
import { createCollection, updateCollection } from '@/features/collections/actions'
import type { Collection } from '@/types/database'

interface CollectionDialogProps {
  collection?: Collection
  mode?: 'create' | 'edit'
  trigger?: React.ReactNode
  onSuccess?: (id: string) => void
}

export function CollectionDialog({
  collection,
  mode = 'create',
  trigger,
  onSuccess,
}: CollectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(collection?.name ?? '')
  const [description, setDescription] = useState(collection?.description ?? '')
  const [coverImageUrl, setCoverImageUrl] = useState(collection?.cover_image_url ?? '')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Collection name is required.')
      return
    }

    setIsPending(true)
    setError(null)

    try {
      let res
      if (mode === 'create') {
        res = await createCollection({
          name: name.trim(),
          description: description.trim() || null,
          coverImageUrl: coverImageUrl || null,
        })
      } else if (collection?.id) {
        res = await updateCollection(collection.id, {
          name: name.trim(),
          description: description.trim() || null,
          coverImageUrl: coverImageUrl || null,
        })
      }

      if (res?.error) {
        setError(res.error)
        setIsPending(false)
        return
      }

      setOpen(false)
      router.refresh()
      if (onSuccess && res?.data?.id) {
        onSuccess(res.data.id)
      }
    } catch (err: unknown) {
      console.error('Collection dialog error:', err)
      setError(err instanceof Error ? err.message : 'Could not save collection.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            {mode === 'create' ? <FolderPlus className="h-4 w-4" /> : <Edit className="h-3.5 w-3.5" />}
            <span>{mode === 'create' ? 'New Collection' : 'Edit Collection'}</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Create Collection' : 'Edit Collection'}</DialogTitle>
            <DialogDescription>
              Organize your recipes by theme, meal, occasion, or family favorites.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="col-name" className="text-sm font-semibold">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="col-name"
                placeholder="e.g. Weeknight Dinners, Italian Classics"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="col-desc" className="text-sm font-semibold">
                Description
              </Label>
              <Textarea
                id="col-desc"
                placeholder="What belongs in this collection?…"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Cover Photo (Optional)</Label>
              <ImageUpload
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                onRemove={() => setCoverImageUrl('')}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create Collection' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
