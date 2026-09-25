'use client'

import { useState } from 'react'
import { FolderOpen, Search } from 'lucide-react'
import type { CollectionWithRecipes } from '@/features/collections/queries'
import { CollectionCard } from './collection-card'
import { CollectionDialog } from './collection-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { Input } from '@/components/ui/input'

interface CollectionsViewProps {
  collections: CollectionWithRecipes[]
}

export function CollectionsView({ collections }: CollectionsViewProps) {
  const [search, setSearch] = useState('')

  const filtered = collections.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            Collections
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize and curate recipes for every meal, mood, and occasion.
          </p>
        </div>

        <CollectionDialog mode="create" />
      </div>

      {/* Search Bar if collections exist */}
      {collections.length > 3 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search collections…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      )}

      {/* Grid or Empty State */}
      {collections.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No collections yet"
          description="Group your recipes into themed collections like 'Weeknight Dinners', 'Family Holiday', or 'Quick Lunches'."
        >
          <CollectionDialog mode="create" />
        </EmptyState>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No collections matching &quot;{search}&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  )
}
