'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SafeImage } from '@/components/shared/safe-image'
import {
  Minus,
  Plus,
  Loader2,
  Trash2,
  Utensils,
  CheckCircle2,
  Circle,
  Calendar,
} from 'lucide-react'
import type { MealPlanItemWithRecipe, MealType } from '../types'
import { updateMealPlanItem, deleteMealPlanItem } from '../actions'

interface EditMealDialogProps {
  item: MealPlanItemWithRecipe | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const MEAL_TYPES: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snack', label: 'Snack' },
]

function EditMealForm({
  item,
  onClose,
  onSuccess,
}: {
  item: MealPlanItemWithRecipe
  onClose: () => void
  onSuccess?: () => void
}) {
  const [date, setDate] = useState(item.date)
  const [mealType, setMealType] = useState<MealType>(item.meal_type)
  const [servings, setServings] = useState(item.servings || 2)
  const [notes, setNotes] = useState(item.notes || '')
  const [isCooked, setIsCooked] = useState(item.is_cooked)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState(false)

  const displayTitle = item.recipe?.title ?? item.title
  const displayImage = item.recipe?.image_url ?? item.recipe_image_url_snapshot

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await updateMealPlanItem(item.id, {
        date,
        mealType,
        servings,
        notes: notes.trim() || null,
        isCooked,
      })

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess?.()
        onClose()
      }
    })
  }

  function handleDelete() {
    setError(null)
    setIsDeleting(true)

    startTransition(async () => {
      const result = await deleteMealPlanItem(item.id)
      setIsDeleting(false)

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess?.()
        onClose()
      }
    })
  }

  return (
    <>
      {error && (
        <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive font-medium">
          {error}
        </div>
      )}

      {/* Meal Preview Banner */}
      <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/40 p-2.5">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted border border-border/40">
          {displayImage ? (
            <SafeImage
              src={displayImage}
              alt={displayTitle}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Utensils className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-sm text-foreground truncate">
            {displayTitle}
          </h4>
          <p className="text-xs text-muted-foreground">
            {item.recipe_id ? 'Archived recipe' : 'Custom meal'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Date Picker */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-meal-date" className="text-xs font-medium text-muted-foreground">
            Date
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="edit-meal-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl border-border/80"
              required
            />
          </div>
        </div>

        {/* Meal Slot Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Meal Slot</Label>
          <div className="grid grid-cols-4 gap-1 p-1 bg-muted/80 border border-border/60 rounded-xl">
            {MEAL_TYPES.map((type) => (
              <button
                key={type.type}
                type="button"
                onClick={() => setMealType(type.type)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  mealType === type.type
                    ? 'bg-background text-foreground shadow-2xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Servings Counter */}
        <div className="flex items-center justify-between border-t border-border/40 pt-3">
          <Label className="text-xs font-medium text-muted-foreground">Planned Servings</Label>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-border/80 bg-card">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-r-none touch-target"
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                disabled={servings <= 1}
                aria-label="Decrease servings"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="flex w-10 items-center justify-center text-xs font-bold tabular-nums">
                {servings}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-l-none touch-target"
                onClick={() => setServings((s) => Math.min(50, s + 1))}
                aria-label="Increase servings"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">
              Scaling portions
            </span>
          </div>
        </div>

        {/* Cooking Status */}
        <div className="flex items-center justify-between rounded-xl border border-border/70 p-2.5 bg-muted/20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCooked(!isCooked)}
              className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary transition-colors touch-target"
            >
              {isCooked ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{isCooked ? 'Marked as Cooked' : 'Not Cooked Yet'}</span>
            </button>
          </div>
          {isCooked && (
            <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold">
              Completed
            </span>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="edit-meal-notes" className="text-xs font-medium text-muted-foreground">
            Notes / Prep Instructions
          </Label>
          <Textarea
            id="edit-meal-notes"
            placeholder="e.g. Marinate the chicken the night before..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="resize-none text-xs rounded-xl border-border/80"
          />
        </div>

        {/* Dialog Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending || isDeleting}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-9 px-3 text-xs gap-1.5 rounded-xl font-medium"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>Delete</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="h-9 px-3.5 text-xs rounded-xl font-medium border-border/80"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="h-9 px-4 text-xs font-semibold rounded-xl min-w-24 shadow-2xs"
            >
              {isPending && !isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}

export function EditMealDialog({
  item,
  isOpen,
  onClose,
  onSuccess,
}: EditMealDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold">
            Edit Planned Meal
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update date, meal type, planned servings, or custom notes for this scheduled meal.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <EditMealForm
            key={item.id}
            item={item}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
