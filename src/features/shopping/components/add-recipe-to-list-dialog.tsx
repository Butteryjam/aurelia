'use client'

import { useState, useTransition, useEffect } from 'react'
import { BookOpen, Loader2, Minus, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getRecipes } from '@/features/recipes/queries'
import { addRecipeToShoppingList } from '../actions'
import { cn } from '@/lib/utils'

interface AddRecipeToListDialogProps {
  listId: string
  onSuccess?: () => void
}

type State = 'idle' | 'loading' | 'selecting' | 'success' | 'error'

/**
 * Button + inline dialog for selecting a recipe and servings count,
 * then adding all its (scaled, consolidated) ingredients to the shopping list.
 */
export function AddRecipeToListDialog({ listId, onSuccess }: AddRecipeToListDialogProps) {
  const [state, setState] = useState<State>('idle')
  const [recipes, setRecipes] = useState<Awaited<ReturnType<typeof getRecipes>>>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [servings, setServings] = useState(4)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (state === 'idle') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state])

  async function openDialog() {
    setState('loading')
    try {
      const res = await fetch('/api/recipes-list')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json() as { recipes: Awaited<ReturnType<typeof getRecipes>> }
      setRecipes(data.recipes)
      setState('selecting')
    } catch {
      setError('Could not load your recipes.')
      setState('error')
    }
  }

  function close() {
    setState('idle')
    setSelectedId(null)
    setServings(4)
    setError(null)
  }

  function handleSelect(id: string, baseServings: number | null) {
    setSelectedId(id)
    setServings(baseServings ?? 4)
  }

  function handleAdd() {
    if (!selectedId) return
    startTransition(async () => {
      const result = await addRecipeToShoppingList(listId, selectedId, servings)
      if (result.error) {
        setError(result.error)
        setState('error')
      } else {
        setState('success')
        onSuccess?.()
        setTimeout(close, 1500)
      }
    })
  }

  if (state === 'idle') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={openDialog}
        className="h-9 gap-2 text-xs"
      >
        <BookOpen className="h-3.5 w-3.5" />
        Add from Recipe
      </Button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Sheet / Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-recipe-dialog-title"
        aria-describedby="add-recipe-dialog-desc"
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[480px] sm:rounded-2xl animate-fade-up"
        style={{ maxHeight: '85dvh' }}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="add-recipe-dialog-title" className="font-serif text-lg font-bold text-foreground">
              Add Recipe to List
            </h2>
            <p id="add-recipe-dialog-desc" className="text-xs text-muted-foreground mt-0.5">
              Select a recipe to add its ingredients to your shopping list.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="relative rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close dialog"
          >
            <span aria-hidden="true" className="text-base leading-none">✕</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {state === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {(state === 'selecting' || state === 'error' || state === 'success') && (
            <>
              {/* Recipe list */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select a Recipe
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto rounded-xl border border-border">
                  {recipes.length === 0 && (
                    <p className="p-4 text-center text-sm text-muted-foreground italic">
                      No recipes found. Add some recipes first!
                    </p>
                  )}
                  {recipes.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelect(r.id, r.servings)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                        selectedId === r.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{r.title}</span>
                      {r.servings && (
                        <span className="text-xs text-muted-foreground">
                          {r.servings} servings
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Servings adjuster */}
              {selectedId && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Servings:</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setServings((s) => Math.max(1, s - 1))}
                      className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted transition-colors after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      aria-label="Decrease servings"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-6 text-center text-sm font-bold tabular-nums">
                      {servings}
                    </span>
                    <button
                      type="button"
                      onClick={() => setServings((s) => Math.min(48, s + 1))}
                      className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted transition-colors after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      aria-label="Increase servings"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="text-xs text-destructive font-medium">{error}</p>
              )}

              {state === 'success' && (
                <p aria-live="polite" className="text-xs text-emerald-600 dark:text-emerald-400 font-medium text-center">
                  ✓ Ingredients added to your list!
                </p>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border px-5 py-4 flex gap-2">
          <Button variant="outline" onClick={close} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedId || isPending || state === 'success'}
            className="flex-1 gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? 'Adding…' : 'Add Ingredients'}
          </Button>
        </div>
      </div>
    </>
  )
}
