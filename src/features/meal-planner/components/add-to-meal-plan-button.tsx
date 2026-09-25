'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
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
import { Textarea } from '@/components/ui/textarea'
import {
  CalendarDays,
  CalendarPlus,
  Calendar,
  Check,
  Loader2,
  Minus,
  Plus,
  ArrowRight,
} from 'lucide-react'
import type { MealType } from '../types'
import { addMealPlanItem } from '../actions'
import { cn } from '@/lib/utils'

interface AddToMealPlanButtonProps {
  recipeId: string
  recipeTitle: string
  recipeServings?: number | null
}

const MEAL_TYPES: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snack', label: 'Snack' },
]

export function AddToMealPlanButton({
  recipeId,
  recipeTitle,
  recipeServings,
}: AddToMealPlanButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const todayStr = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(todayStr)
  const [mealType, setMealType] = useState<MealType>('dinner')
  const [servings, setServings] = useState(
    recipeServings && recipeServings > 0 ? recipeServings : 2
  )
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setDate(new Date().toISOString().split('T')[0])
    setMealType('dinner')
    setServings(recipeServings && recipeServings > 0 ? recipeServings : 2)
    setNotes('')
    setError(null)
    setIsSuccess(false)
    setIsOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const res = await addMealPlanItem({
        recipeId,
        date,
        mealType,
        servings,
        notes: notes.trim() || null,
      })

      if (res.error) {
        setError(res.error)
      } else {
        setIsSuccess(true)
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
        title="Add this recipe to your weekly meal plan"
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        <span>Plan Meal</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <CalendarDays className="h-5 w-5" />
              <DialogTitle className="font-serif text-lg font-bold">
                Add to Meal Plan
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Schedule <span className="font-semibold text-foreground">{recipeTitle}</span> into your weekly meal plan.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive font-medium">
              {error}
            </div>
          )}

          {isSuccess ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Check className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Scheduled to Meal Plan!
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Added for {date} ({mealType}) with {servings} planned servings.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Link href={`/meal-planner?week=${date}`}>
                  <Button size="sm" className="text-xs gap-1.5">
                    <span>View Meal Planner</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="plan-recipe-date" className="text-xs">
                  Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="plan-recipe-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Meal Slot */}
              <div className="space-y-1.5">
                <Label className="text-xs">Meal Slot</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {MEAL_TYPES.map((type) => (
                    <button
                      key={type.type}
                      type="button"
                      onClick={() => setMealType(type.type)}
                      className={cn(
                        'py-1.5 rounded-lg border text-xs font-medium transition-all capitalize',
                        mealType === type.type
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border/60 hover:border-border text-muted-foreground'
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Servings */}
              <div className="space-y-1.5">
                <Label className="text-xs">Planned Servings</Label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-border bg-card">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="relative h-8 w-8 rounded-r-none after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-10"
                      onClick={() => setServings((s) => Math.max(1, s - 1))}
                      disabled={servings <= 1}
                      aria-label="Decrease servings"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <div className="flex w-12 items-center justify-center text-xs font-semibold">
                      {servings}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="relative h-8 w-8 rounded-l-none after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-10"
                      onClick={() => setServings((s) => Math.min(50, s + 1))}
                      aria-label="Increase servings"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Recipe default: {recipeServings || 2}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="plan-recipe-notes" className="text-xs">
                  Notes (optional)
                </Label>
                <Textarea
                  id="plan-recipe-notes"
                  placeholder="e.g. Prep side salad, reduce spice"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="resize-none text-xs"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="h-8 text-xs min-w-24 gap-1.5"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CalendarPlus className="h-3.5 w-3.5" />
                  )}
                  <span>Plan Meal</span>
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
