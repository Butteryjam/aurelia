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
  MoreHorizontal,
} from 'lucide-react'
import type { ShoppingList } from '@/types/database'
import type { ShoppingListWithItems } from '../queries'
import { Button } from '@/components/ui/button'
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
 * - Items grouped by recipe attribution
 * - Optimistic toggle for check/uncheck
 */
export function ShoppingListView({ lists, activeList }: ShoppingListViewProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedListId = selectedId ?? activeList?.id ?? null
  const [newListName, setNewListName] = useState('')
  const [showNewList, setShowNewList] = useState(false)
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

  // Group items by recipe attribution
  const checkedItems = optimisticItems.filter((i) => i.is_checked)
  const uncheckedItems = optimisticItems.filter((i) => !i.is_checked)

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
      <div className="flex lg:hidden gap-1 p-1 rounded-xl bg-muted text-sm font-medium">
        <button
          type="button"
          onClick={() => setView('items')}
          className={cn(
            'flex-1 rounded-lg py-2 transition-colors',
            view === 'items' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
          )}
        >
          Current List
        </button>
        <button
          type="button"
          onClick={() => setView('list')}
          className={cn(
            'flex-1 rounded-lg py-2 transition-colors',
            view === 'list' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
          )}
        >
          All Lists ({lists.length})
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-6">
        {/* ─── LEFT: ALL LISTS ─── */}
        <aside className={cn(
          'lg:col-span-4 space-y-4',
          view === 'list' ? 'block' : 'hidden lg:block'
        )}>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-base font-bold text-foreground">
                Shopping Lists
              </h2>
              <button
                type="button"
                onClick={() => setShowNewList((v) => !v)}
                className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Create new shopping list"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* New list form */}
            {showNewList && (
              <form onSubmit={handleCreateList} className="flex gap-2">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name…"
                  autoFocus
                  className="flex-1 min-w-0 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating || !newListName.trim()}
                  className="h-8 px-3"
                >
                  {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create'}
                </Button>
              </form>
            )}
            {createError && (
              <p role="alert" className="text-xs text-destructive flex items-center gap-1 font-medium">
                <AlertCircle className="h-3.5 w-3.5" /> {createError}
              </p>
            )}

            {/* List items */}
            <div className="space-y-1">
              {lists.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground italic">
                  No lists yet. Create one above!
                </p>
              )}
              {lists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(list.id)
                    setView('items')
                    router.push(`/shopping?list=${list.id}`)
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                    selectedListId === list.id
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ShoppingCart className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{list.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn(
                      'text-xs rounded-full px-2 py-0.5',
                      list.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {list.status}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ─── RIGHT: ACTIVE LIST ─── */}
        <main className={cn(
          'lg:col-span-8 space-y-4',
          view === 'items' ? 'block' : 'hidden lg:block'
        )}>
          {!activeList ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No list selected
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                Select an existing list or create a new one to get started.
              </p>
              <Button
                size="sm"
                onClick={() => setShowNewList(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create a List
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* List header */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-foreground">
                      {activeList.name}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {optimisticItems.length} items · {checkedItems.length} checked
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {checkedItems.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearChecked}
                        disabled={isClearing}
                        className="h-8 text-xs gap-1.5"
                      >
                        {isClearing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckSquare className="h-3.5 w-3.5" />
                        )}
                        Clear checked
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteList}
                      disabled={isDeleting}
                      className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                      aria-label="Delete this list"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <AddRecipeToListDialog listId={activeList.id} onSuccess={() => router.refresh()} />
                  <ManualItemInput listId={activeList.id} onAdded={() => router.refresh()} />
                </div>
              </div>

              {/* ─── UNCHECKED ITEMS (grouped by recipe) ─── */}
              {uncheckedItems.length === 0 && checkedItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mb-3 opacity-40" />
                  <p className="text-sm">Your list is empty.</p>
                  <p className="text-xs mt-1">Add a recipe or type items manually above.</p>
                </div>
              )}

              {groups.map((group) => (
                <div
                  key={group.recipeId ?? '__manual__'}
                  className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden"
                >
                  {/* Group header (recipe attribution) */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/40">
                    {group.recipeId ? (
                      <>
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Link
                          href={`/recipes/${group.recipeId}`}
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors truncate"
                        >
                          {group.recipeTitle ?? 'Recipe'}
                        </Link>
                      </>
                    ) : (
                      <>
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-semibold text-muted-foreground">
                          Other items
                        </span>
                      </>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {group.items.length}
                    </span>
                  </div>

                  {/* Items */}
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

              {/* ─── CHECKED ITEMS ─── */}
              {checkedItems.length > 0 && (
                <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden opacity-70">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/40">
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-semibold text-muted-foreground">
                      Done ({checkedItems.length})
                    </span>
                  </div>
                  <div className="divide-y divide-border/50">
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
    </div>
  )
}

// ─── Individual item row ──────────────────────────────────────────────────────

interface ShoppingItemRowProps {
  item: ShoppingListWithItems['items'][number]
  onToggle: () => void
  onDelete: () => void
}

function ShoppingItemRow({ item, onToggle, onDelete }: ShoppingItemRowProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 group transition-colors hover:bg-muted/40',
      item.is_checked && 'opacity-60'
    )}>
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        className="relative flex h-8 w-8 items-center justify-center shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-primary active:scale-95 after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        aria-label={item.is_checked ? `Mark ${item.name} as incomplete` : `Mark ${item.name} as complete`}
        aria-checked={item.is_checked}
        role="checkbox"
      >
        {item.is_checked ? (
          <CheckSquare className="h-5 w-5 text-emerald-500" />
        ) : (
          <Square className="h-5 w-5" />
        )}
      </button>

      {/* Item label */}
      <div className="flex-1 min-w-0">
        <span className={cn(
          'text-sm leading-snug',
          item.is_checked ? 'line-through text-muted-foreground' : 'text-foreground'
        )}>
          {item.quantity && (
            <strong className="font-semibold">{item.quantity} </strong>
          )}
          {item.unit && (
            <span className="text-muted-foreground font-medium">{item.unit} </span>
          )}
          <span>{item.name}</span>
        </span>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="relative flex h-8 w-8 items-center justify-center shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity text-muted-foreground hover:text-destructive active:scale-95 after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded-sm"
        aria-label={`Remove ${item.name} from list`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
