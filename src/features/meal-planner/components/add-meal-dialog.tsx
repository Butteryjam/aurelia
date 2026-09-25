'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
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
import {
  Search,
  Users,
  Minus,
  Plus,
  Loader2,
  Utensils,
  BookOpen,
  Calendar,
} from 'lucide-react'
import type { MealPlanRecipeSummary, MealType } from '../types'
import { addMealPlanItem } from '../actions'

interface AddMealDialogProps {
  isOpen: boolean
  onClose: () => void
  defaultDate: string
  defaultMealType: MealType
  recipes: MealPlanRecipeSummary[]
  onSuccess?: () => void
}

const MEAL_TYPES: { type: MealType; label: string }[] = [
  { type: 'breakfast', label: 'Breakfast' },
  { type: 'lunch', label: 'Lunch' },
  { type: 'dinner', label: 'Dinner' },
  { type: 'snack', label: 'Snack' },
]

export function AddMealDialog({
  isOpen,
  onClose,
  defaultDate,
  defaultMealType,
  recipes,
  onSuccess,
}: AddMealDialogProps) {
  const [activeTab, setActiveTab] = useState<'vault' | 'custom'>('vault')
  const [date, setDate] = useState(defaultDate)
  const [mealType, setMealType] = useState<MealType>(defaultMealType)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [servings, setServings] = useState(2)
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Track previous open state and slot context so internal state updates whenever dialog opens with new slot context
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const [prevDefaultDate, setPrevDefaultDate] = useState(defaultDate)
  const [prevDefaultMealType, setPrevDefaultMealType] = useState(defaultMealType)

  if (
    isOpen &&
    (!prevIsOpen || defaultDate !== prevDefaultDate || defaultMealType !== prevDefaultMealType)
  ) {
    setPrevIsOpen(true)
    setPrevDefaultDate(defaultDate)
    setPrevDefaultMealType(defaultMealType)
    setDate(defaultDate)
    setMealType(defaultMealType)
    setSelectedRecipeId(null)
    setCustomTitle('')
    setServings(2)
    setNotes('')
    setSearch('')
    setError(null)
    setActiveTab('vault')
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false)
  }



  // When recipe is selected, auto-fill servings
  function handleSelectRecipe(r: MealPlanRecipeSummary) {
    setSelectedRecipeId(r.id)
    setServings(r.servings && r.servings > 0 ? r.servings : 2)
  }

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (activeTab === 'vault' && !selectedRecipeId) {
      setError('Please select a recipe from your archive.')
      return
    }

    if (activeTab === 'custom' && !customTitle.trim()) {
      setError('Please enter a meal name.')
      return
    }

    startTransition(async () => {
      const result = await addMealPlanItem({
        date,
        mealType,
        recipeId: activeTab === 'vault' ? selectedRecipeId : null,
        customTitle: activeTab === 'custom' ? customTitle.trim() : null,
        servings,
        notes: notes.trim() || null,
      })

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess?.()
        onClose()
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold">
            Schedule a Meal
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select a recipe from your archive or enter a custom dish to plan for this week.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Date & Slot Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="add-meal-date" className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date
              </Label>
              <Input
                id="add-meal-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-meal-slot" className="text-xs text-muted-foreground">Meal Slot</Label>
              <select
                id="add-meal-slot"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                {MEAL_TYPES.map((m) => (
                  <option key={m.type} value={m.type}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Switcher: From Vault vs Custom Meal */}
          <div className="grid grid-cols-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('vault')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'vault'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>From Archive</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'custom'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Utensils className="h-3.5 w-3.5" />
              <span>Custom Meal</span>
            </button>
          </div>

          {/* TAB 1: From Vault */}
          {activeTab === 'vault' && (
            <div className="flex-1 flex flex-col overflow-hidden space-y-2.5 pt-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search your recipes…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 max-h-48 rounded-lg border border-border/50 p-1 divide-y divide-border/30">
                {filteredRecipes.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground italic">
                    No matching recipes found.
                  </div>
                ) : (
                  filteredRecipes.map((r) => {
                    const isSelected = selectedRecipeId === r.id
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectRecipe(r)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-md text-left transition-colors ${
                          isSelected
                            ? 'bg-primary/15 text-primary font-semibold'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-muted">
                          {r.image_url ? (
                            <Image src={r.image_url} alt={r.title} fill className="object-cover" sizes="36px" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <BookOpen className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{r.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {r.servings ? `${r.servings} serv` : ''}
                            {r.total_time ? ` · ${r.total_time} min` : ''}
                          </p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Custom Meal */}
          {activeTab === 'custom' && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label htmlFor="add-meal-custom-title" className="text-xs text-muted-foreground">Meal Name</Label>
                <Input
                  id="add-meal-custom-title"
                  placeholder='e.g. "Dinner out with friends", "Leftover soup"'
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          {/* Servings Stepper */}
          <div className="flex items-center justify-between border-t border-border/40 pt-3">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>Servings</span>
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setServings((s) => Math.max(1, s - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-xs font-bold tabular-nums">
                {servings}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setServings((s) => s + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
            <Input
              placeholder='e.g. "Prep night before", "Make extra rice"'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="h-8 text-xs font-semibold"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Add to Plan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
