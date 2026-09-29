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
          <Button size="default" className="gap-2 min-h-[44px] rounded-xl font-semibold shadow-xs">
            {mode === 'create' ? <FolderPlus className="h-4 w-4" /> : <Edit className="h-3.5 w-3.5" />}
            <span>{mode === 'create' ? 'New Collection' : 'Edit Collection'}</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg rounded-2xl border-border bg-card shadow-dialog">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-foreground">
              {mode === 'create' ? 'Create Collection' : 'Edit Collection'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Curate your recipes by theme, season, family favorites, or weekly prep routines.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-5">
            {error && (
              <div
                role="alert"
                className="rounded-xl bg-destructive/10 border border-destructive/25 p-3.5 text-xs text-destructive font-medium animate-fade-in"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="col-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Collection Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="col-name"
                placeholder="e.g. Weeknight Dinners, Tuscan Autumn, Sunday Baking"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 min-h-[44px] rounded-xl border-input bg-background/80 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="col-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Description <span className="text-muted-foreground/60 font-normal lowercase">(optional)</span>
              </Label>
              <Textarea
                id="col-desc"
                placeholder="What culinary moments or traditions belong in this volume?…"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl border-input bg-background/80 text-sm focus-visible:ring-2 focus-visible:ring-ring resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cover Image <span className="text-muted-foreground/60 font-normal lowercase">(optional)</span>
              </Label>
              <ImageUpload
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                onRemove={() => setCoverImageUrl('')}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2.5 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="min-h-[44px] rounded-xl font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="gap-2 min-h-[44px] rounded-xl font-semibold shadow-xs"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{mode === 'create' ? 'Create Collection' : 'Save Changes'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
