'use client'

import { useState, useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  BookOpen,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
} from 'lucide-react'
import type { ShoppingList } from '@/types/database'
import type { ShoppingListWithItems } from '../queries'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AddRecipeToListDialog } from './add-recipe-to-list-dialog'
import { ManualItemInput } from './manual-item-input'
import {
  toggleShoppingItem,
  deleteShoppingItem,
  deleteShoppingList,
  clearCheckedItems,
  createShoppingList,
} from '../actions'
import { cn } from '@/lib/utils'

interface ShoppingListViewProps {
  lists: ShoppingList[]
  activeList: ShoppingListWithItems | null
}

/**
 * Main Shopping List view.
 *
 * - Left panel (desktop) / top section (mobile): list of all shopping lists
 * - Right panel (desktop) / main section (mobile): active list items
 * - Items grouped by recipe attribution or pantry additions
 * - Optimistic toggle for check/uncheck
 * - Progress tracking & completion card
 * - Accessible Radix delete confirmation dialog
 */
export function ShoppingListView({ lists, activeList }: ShoppingListViewProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedListId = selectedId ?? activeList?.id ?? null
  const [newListName, setNewListName] = useState('')
  const [showNewList, setShowNewList] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isCreating, startCreate] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [isClearing, startClear] = useTransition()
  const [createError, setCreateError] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'items'>('items')

  // Optimistic item state for instant check/uncheck feedback
  const [optimisticItems, updateOptimisticItems] = useOptimistic(
    activeList?.items ?? [],
    (state, action: { type: 'toggle'; id: string } | { type: 'delete'; id: string }) => {
      if (action.type === 'toggle') {
        return state.map((item) =>
          item.id === action.id ? { ...item, is_checked: !item.is_checked } : item
        )
      }
      if (action.type === 'delete') {
        return state.filter((item) => item.id !== action.id)
      }
      return state
    }
  )

  function handleCreateList(e: React.FormEvent) {
    e.preventDefault()
    const name = newListName.trim()
    if (!name) return
    setCreateError(null)

    startCreate(async () => {
      const result = await createShoppingList(name)
      if (result.error) {
        setCreateError(result.error)
      } else {
        setNewListName('')
        setShowNewList(false)
        router.refresh()
        if (result.data?.id) {
          router.push(`/shopping?list=${result.data.id}`)
        }
      }
    })
  }

  function handleDeleteList() {
    if (!activeList) return
    startDelete(async () => {
      await deleteShoppingList(activeList.id)
      setDeleteDialogOpen(false)
      router.refresh()
      router.push('/shopping')
    })
  }

  function handleClearChecked() {
    if (!activeList) return
    startClear(async () => {
      await clearCheckedItems(activeList.id)
      router.refresh()
    })
  }

  const [, startToggle] = useTransition()
  const [, startItemDelete] = useTransition()

  function handleToggle(itemId: string) {
    startToggle(async () => {
      updateOptimisticItems({ type: 'toggle', id: itemId })
      await toggleShoppingItem(itemId)
    })
  }

  function handleDeleteItem(itemId: string) {
    startItemDelete(async () => {
      updateOptimisticItems({ type: 'delete', id: itemId })
      await deleteShoppingItem(itemId)
    })
  }

  // Calculations for progress & completion
  const totalItems = optimisticItems.length
  const checkedItems = optimisticItems.filter((i) => i.is_checked)
  const uncheckedItems = optimisticItems.filter((i) => !i.is_checked)
  const completedCount = checkedItems.length
  const progressPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0
  const isAllCompleted = totalItems > 0 && uncheckedItems.length === 0

  // Group unchecked items by recipe
  type Group = { recipeId: string | null; recipeTitle: string | null; items: typeof uncheckedItems }
  const groupsMap = new Map<string, Group>()
  for (const item of uncheckedItems) {
    const key = item.recipe_id ?? '__manual__'
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        recipeId: item.recipe_id,
        recipeTitle: item.recipe_title ?? null,
        items: [],
      })
    }
    groupsMap.get(key)!.items.push(item)
  }
  const groups = Array.from(groupsMap.values())

  return (
    <div className="space-y-6">
      {/* ─── MOBILE TAB SWITCHER ─── */}
      <div className="flex lg:hidden gap-1 p-1 rounded-xl bg-muted/80 border border-border/60 text-sm font-medium">
        <button
          type="button"
          onClick={() => setView('items')}
          className={cn(
            'flex-1 rounded-lg py-2.5 px-3 transition-all min-h-[44px] flex items-center justify-center gap-2 text-xs sm:text-sm font-medium touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            view === 'items'
              ? 'bg-background text-foreground shadow-2xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Current List</span>
          {activeList && (
            <span className="ml-1 text-[11px] rounded-full bg-muted px-1.5 py-0.2 font-semibold">
              {totalItems}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setView('list')}
          className={cn(
            'flex-1 rounded-lg py-2.5 px-3 transition-all min-h-[44px] flex items-center justify-center gap-2 text-xs sm:text-sm font-medium touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            view === 'list'
              ? 'bg-background text-foreground shadow-2xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>All Lists</span>
          <span className="ml-1 text-[11px] rounded-full bg-muted px-1.5 py-0.2 font-semibold">
            {lists.length}
          </span>
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-6">
        {/* ─── LEFT: ALL LISTS (Sidebar) ─── */}
        <aside
          className={cn(
            'lg:col-span-4 space-y-4',
            view === 'list' ? 'block' : 'hidden lg:block'
          )}
        >
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base font-bold text-foreground tracking-tight">
                  Shopping Lists
                </h2>
                <Badge variant="secondary" className="text-[11px] font-semibold px-2 py-0">
                  {lists.length}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setShowNewList((v) => !v)}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors touch-target after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Create new shopping list"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* New list form */}
            {showNewList && (
              <form onSubmit={handleCreateList} className="space-y-2 pt-1 animate-fade-in">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name (e.g. Weekend Brunch)…"
                    autoFocus
                    className="flex-1 min-w-0 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isCreating || !newListName.trim()}
                    className="h-9 px-3.5 rounded-xl font-semibold shrink-0"
                  >
                    {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create'}
                  </Button>
                </div>
                {createError && (
                  <p role="alert" className="text-xs text-destructive flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {createError}
                  </p>
                )}
              </form>
            )}

            {/* List items */}
            <div className="space-y-1.5">
              {lists.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground italic">
                  No lists yet. Create your first list above!
                </div>
              )}
              {lists.map((list) => {
                const isSelected = selectedListId === list.id
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(list.id)
                      setView('items')
                      router.push(`/shopping?list=${list.id}`)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition-all min-h-[44px] touch-target group border',
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold border-primary/30 shadow-2xs'
                        : 'text-foreground hover:bg-muted/60 border-transparent hover:border-border/40'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ShoppingCart
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      />
                      <span className="truncate">{list.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          'text-[11px] font-medium rounded-full px-2 py-0.5 border',
                          list.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-muted text-muted-foreground border-border/40'
                        )}
                      >
                        {list.status}
                      </span>
                      <ChevronRight
                        className={cn(
                          'h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5',
                          isSelected ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* ─── RIGHT: ACTIVE LIST (Workspace) ─── */}
        <main
          className={cn(
            'lg:col-span-8 space-y-5',
            view === 'items' ? 'block' : 'hidden lg:block'
          )}
        >
          {!activeList ? (
            <EmptyState
              icon={ShoppingCart}
              title="No List Selected"
              description="Select an existing shopping list from the left or create a new one to begin organizing your kitchen provisions."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setShowNewList(true)
                    setView('list')
                  }}
                  className="gap-2 rounded-xl font-semibold shadow-2xs"
                >
                  <Plus className="h-4 w-4" />
                  Create a List
                </Button>
              }
            />
          ) : (
            <div className="space-y-5">
              {/* Active List Header Card */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
                  <div className="min-w-0">
                    <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                      {activeList.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{totalItems} items</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">
                        {completedCount} provisioned
                      </span>
                      {totalItems > 0 && (
                        <>
                          <span>·</span>
                          <span className="tabular-nums font-semibold text-primary">
                            {progressPercent}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {completedCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearChecked}
                        disabled={isClearing}
                        className="h-8 px-2.5 sm:px-3 text-xs gap-1.5 rounded-xl border-border/80 font-medium"
                      >
                        {isClearing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        Clear checked
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={isDeleting}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive border-border/80 hover:border-destructive/30 hover:bg-destructive/5 rounded-xl touch-target"
                      aria-label="Delete this list"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                {totalItems > 0 && (
                  <div
                    className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Shopping progress: ${progressPercent}% complete`}
                  >
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300 ease-out',
                        isAllCompleted ? 'bg-emerald-500' : 'bg-primary'
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}

                {/* Action buttons & item adder */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                  <AddRecipeToListDialog listId={activeList.id} onSuccess={() => router.refresh()} />
                  <ManualItemInput listId={activeList.id} onAdded={() => router.refresh()} />
                </div>
              </div>

              {/* ─── ALL ITEMS COMPLETED STATE ─── */}
              {isAllCompleted && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold text-foreground">
                        All Items Provisioned
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                        Every item on this list is checked off. You’re ready to start cooking!
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearChecked}
                    disabled={isClearing}
                    className="shrink-0 rounded-xl text-xs font-semibold border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    {isClearing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Clear Completed Items
                  </Button>
                </div>
              )}

              {/* ─── EMPTY LIST STATE ─── */}
              {totalItems === 0 && (
                <EmptyState
                  icon={ShoppingCart}
                  title="Your Provisions List is Empty"
                  description="Consolidate ingredients directly from your saved recipes or add custom items manually to build your shopping plan."
                  action={
                    <AddRecipeToListDialog listId={activeList.id} onSuccess={() => router.refresh()} />
                  }
                />
              )}

              {/* ─── UNCHECKED ITEMS (grouped by recipe attribution) ─── */}
              {groups.map((group) => (
                <div
                  key={group.recipeId ?? '__manual__'}
                  className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden"
                >
                  {/* Group header */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60 bg-muted/40">
                    <div className="flex items-center gap-2 min-w-0">
                      {group.recipeId ? (
                        <>
                          <BookOpen className="h-4 w-4 text-primary shrink-0" />
                          <Link
                            href={`/recipes/${group.recipeId}`}
                            className="text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors truncate focus-visible:outline-none focus-visible:underline"
                          >
                            {group.recipeTitle ?? 'Recipe Provisions'}
                          </Link>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-xs sm:text-sm font-semibold text-foreground">
                            Pantry & Manual Provisions
                          </span>
                        </>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[11px] font-semibold px-2 py-0 shrink-0">
                      {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>

                  {/* Items in group */}
                  <div className="divide-y divide-border/50">
                    {group.items.map((item) => (
                      <ShoppingItemRow
                        key={item.id}
                        item={item}
                        onToggle={() => handleToggle(item.id)}
                        onDelete={() => handleDeleteItem(item.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* ─── CHECKED ITEMS (Completed) ─── */}
              {checkedItems.length > 0 && !isAllCompleted && (
                <div className="rounded-2xl border border-border/70 bg-card/60 shadow-2xs overflow-hidden transition-opacity">
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                        Provisioned ({completedCount})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearChecked}
                      disabled={isClearing}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground font-medium"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="divide-y divide-border/40">
                    {checkedItems.map((item) => (
                      <ShoppingItemRow
                        key={item.id}
                        item={item}
                        onToggle={() => handleToggle(item.id)}
                        onDelete={() => handleDeleteItem(item.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ─── DELETE LIST RADIX DIALOG ─── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent size="compact">
          <DialogHeader>
            <DialogTitle>Delete Shopping List</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">“{activeList?.name}”</span>? All items in this list will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl font-medium"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteList}
              disabled={isDeleting}
              className="rounded-xl font-medium"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Delete List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Individual Shopping Item Row ──────────────────────────────────────────

interface ShoppingItemRowProps {
  item: ShoppingListWithItems['items'][number]
  onToggle: () => void
  onDelete: () => void
}

function ShoppingItemRow({ item, onToggle, onDelete }: ShoppingItemRowProps) {
  return (
    <div
      className={cn(
        'group flex items-center justify-between gap-3 px-3.5 sm:px-4 py-2.5 transition-colors hover:bg-muted/40 min-h-[48px]',
        item.is_checked && 'bg-muted/20 opacity-70'
      )}
    >
      {/* Left: Checkbox + Label */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Checkbox button: >= 44x44px target via after:absolute */}
        <button
          type="button"
          onClick={onToggle}
          className="relative flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center shrink-0 rounded-lg text-muted-foreground transition-all hover:text-foreground hover:bg-muted/70 active:scale-95 touch-target after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          aria-label={
            item.is_checked
              ? `Mark ${item.name} as incomplete`
              : `Mark ${item.name} as complete`
          }
          aria-checked={item.is_checked}
          role="checkbox"
        >
          {item.is_checked ? (
            <CheckSquare className="h-4.5 w-4.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Square className="h-4.5 w-4.5 sm:h-4 sm:w-4 text-muted-foreground/70 group-hover:text-muted-foreground" />
          )}
        </button>

        {/* Item label & quantity */}
        <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {(item.quantity || item.unit) && (
            <span
              className={cn(
                'inline-flex items-center text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-md border border-border/60 transition-colors shrink-0',
                item.is_checked
                  ? 'bg-muted/30 text-muted-foreground/60 line-through border-transparent'
                  : 'bg-muted/70 text-foreground/80'
              )}
            >
              {item.quantity && <span>{item.quantity}</span>}
              {item.quantity && item.unit && <span>&nbsp;</span>}
              {item.unit && <span className="text-muted-foreground">{item.unit}</span>}
            </span>
          )}
          <span
            className={cn(
              'text-sm font-medium leading-snug transition-colors break-words',
              item.is_checked
                ? 'line-through text-muted-foreground/70'
                : 'text-foreground'
            )}
          >
            {item.name}
          </span>
        </div>
      </div>

      {/* Right: Delete action */}
      <button
        type="button"
        onClick={onDelete}
        className="relative flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus-visible:opacity-100 transition-all text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 touch-target after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded-lg"
        aria-label={`Remove ${item.name} from list`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
