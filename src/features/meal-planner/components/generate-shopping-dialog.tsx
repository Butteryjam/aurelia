'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SafeImage } from '@/components/shared/safe-image'
import {
  ShoppingCart,
  Check,
  Loader2,
  Utensils,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import type { DayMeals, MealPlanItemWithRecipe } from '../types'
import type { ShoppingList } from '@/types/database'
import { generateShoppingListFromMealPlan } from '../actions'
import { createShoppingList } from '@/features/shopping/actions'
import { cn } from '@/lib/utils'

interface GenerateShoppingDialogProps {
  isOpen: boolean
  onClose: () => void
  days: DayMeals[]
  formattedWeekRange: string
  existingLists: ShoppingList[]
}

export function GenerateShoppingDialog({
  isOpen,
  onClose,
  days,
  formattedWeekRange,
  existingLists,
}: GenerateShoppingDialogProps) {
  const router = useRouter()
  // Collect all items across all days that have a recipe attached
  const recipeMeals: { item: MealPlanItemWithRecipe; dayName: string }[] = []
  for (const day of days) {
    const slots = [
      ...day.slots.breakfast,
      ...day.slots.lunch,
      ...day.slots.dinner,
      ...day.slots.snack,
    ]
    for (const item of slots) {
      if (item.recipe_id) {
        recipeMeals.push({ item, dayName: `${day.dayShort} ${item.meal_type}` })
      }
    }
  }

  // Selected item IDs (default to all selected)
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    recipeMeals.map((m) => m.item.id)
  )

  // Target list mode: 'existing' or 'new'
  const [listMode, setListMode] = useState<'existing' | 'new'>(
    existingLists.length > 0 ? 'existing' : 'new'
  )
  const [selectedListId, setSelectedListId] = useState<string>(
    existingLists[0]?.id || ''
  )
  const [newListName, setNewListName] = useState(
    `Meal Plan (${formattedWeekRange})`
  )

  const [error, setError] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<{
    addedCount: number
    listId: string
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  function handleSelectAll() {
    if (selectedIds.length === recipeMeals.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(recipeMeals.map((m) => m.item.id))
    }
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessInfo(null)

    if (selectedIds.length === 0) {
      setError('Please select at least one meal to export.')
      return
    }

    startTransition(async () => {
      let targetListId = selectedListId

      // If creating new list
      if (listMode === 'new') {
        const createResult = await createShoppingList(newListName)
        if (createResult.error || !createResult.data) {
          setError(createResult.error || 'Failed to create shopping list.')
          return
        }
        targetListId = createResult.data.id
      }

      if (!targetListId) {
        setError('Please select or specify a shopping list.')
        return
      }

      // Generate shopping items from selected planned meals
      const res = await generateShoppingListFromMealPlan(
        targetListId,
        selectedIds
      )

      if (res.error) {
        setError(res.error)
      } else {
        setSuccessInfo({
          addedCount: res.data?.added || 0,
          listId: targetListId,
        })
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <DialogTitle className="font-serif text-lg font-bold">
              Generate Smart Shopping List
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Export ingredients from your planned meals directly into Smart Shopping.
            Ingredients are scaled to your planned servings and consolidated safely.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive font-medium">
            {error}
          </div>
        )}

        {successInfo ? (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Check className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Shopping List Updated!
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Successfully processed and consolidated ingredients from{' '}
                {selectedIds.length} planned meals into your list.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-9 px-3.5 text-xs rounded-xl font-medium border-border/80"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onClose()
                  router.push(`/shopping?list=${successInfo.listId}`)
                }}
                className="h-9 px-4 text-xs gap-1.5 rounded-xl font-semibold shadow-2xs"
              >
                <span>View Shopping List</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleGenerate}
            className="flex-1 overflow-y-auto space-y-4 pr-1"
          >
            {/* Target List Selection */}
            <div className="space-y-2 rounded-xl border border-border/70 bg-muted/30 p-3">
              <Label className="text-xs font-semibold text-foreground">
                Target Shopping List
              </Label>

              <div className="flex gap-2">
                {existingLists.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setListMode('existing')}
                    className={cn(
                      'flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-all touch-target',
                      listMode === 'existing'
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border/60 hover:border-border text-muted-foreground'
                    )}
                  >
                    Add to Existing List
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setListMode('new')}
                  className={cn(
                    'flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-1 touch-target',
                    listMode === 'new'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border/60 hover:border-border text-muted-foreground'
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create New List</span>
                </button>
              </div>

              {listMode === 'existing' && existingLists.length > 0 ? (
                <div className="pt-1">
                  <select
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {existingLists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="pt-1">
                  <Input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name (e.g. Weekly Groceries)"
                    className="h-9 text-xs rounded-xl border-border/80"
                    required
                  />
                </div>
              )}
            </div>

            {/* Meal Items Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Select Meals ({selectedIds.length} of {recipeMeals.length})
                </Label>
                {recipeMeals.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    {selectedIds.length === recipeMeals.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                )}
              </div>

              {recipeMeals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center bg-card/40">
                  <Utensils className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground">
                    No recipe-based meals found in this week&apos;s plan.
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 mt-1">
                    Add meals from your culinary archive to generate grocery lists.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {recipeMeals.map(({ item, dayName }) => {
                    const isSelected = selectedIds.includes(item.id)
                    const title = item.recipe?.title ?? item.title
                    const image =
                      item.recipe?.image_url ?? item.recipe_image_url_snapshot

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          'w-full flex items-center justify-between gap-2.5 p-2 rounded-xl border text-left transition-all touch-target',
                          isSelected
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border/60 hover:border-border bg-card'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Checkbox indicator */}
                          <div
                            className={cn(
                              'h-4 w-4 shrink-0 rounded flex items-center justify-center border transition-colors',
                              isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-muted-foreground/40 bg-background'
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>

                          {/* Image */}
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted border border-border/50">
                            {image ? (
                              <SafeImage
                                src={image}
                                alt={title}
                                fill
                                className="object-cover"
                                sizes="36px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <Utensils className="h-4 w-4" />
                              </div>
                            )}
                          </div>

                          {/* Meal Info */}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate">
                              {title}
                            </p>
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {dayName} • {item.servings} servings
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
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
                disabled={isPending || recipeMeals.length === 0 || selectedIds.length === 0}
                className="h-9 px-4 text-xs min-w-28 gap-1.5 rounded-xl font-semibold shadow-2xs"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShoppingCart className="h-3.5 w-3.5" />
                )}
                <span>Generate List</span>
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
