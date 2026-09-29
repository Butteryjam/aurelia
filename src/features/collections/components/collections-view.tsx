'use client'

import { useState } from 'react'
import { FolderOpen, Search, BookOpen, Plus, X } from 'lucide-react'
import type { CollectionWithRecipes } from '@/features/collections/queries'
import { CollectionCard } from './collection-card'
import { CollectionDialog } from './collection-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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
    <div className="space-y-8">
      {/* Editorial Page Header */}
      <PageHeader
        title="Collections"
        description="Organize and curate your culinary archive into tailored volumes for every meal, mood, and occasion."
        badge={
          collections.length > 0 ? (
            <Badge variant="secondary" className="font-semibold text-xs tracking-normal">
              {collections.length} {collections.length === 1 ? 'Volume' : 'Volumes'}
            </Badge>
          ) : null
        }
        primaryAction={<CollectionDialog mode="create" />}
      />

      {/* Search Bar (shown when multiple collections exist) */}
      {collections.length > 2 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search collections…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 h-11 min-h-[44px] rounded-xl border-border/80 bg-background shadow-2xs text-sm"
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSearch('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
              aria-label="Clear collection search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Grid or Editorial Empty State */}
      {collections.length === 0 ? (
        <EmptyState
          variant="editorial"
          icon={BookOpen}
          title="Your Cookbook Shelves are Empty"
          description="Curate your culinary archive into themed volumes — from quick weeknight staples to festive holiday feasts and baking projects."
        >
          <CollectionDialog
            mode="create"
            trigger={
              <Button size="default" className="gap-2 font-medium min-h-[44px] shadow-xs">
                <Plus className="h-4 w-4" />
                <span>Create your first collection</span>
              </Button>
            }
          />
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="standard"
          icon={FolderOpen}
          title="No matching volumes found"
          description={`No collections matched "${search}". Try searching for another name or keyword.`}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSearch('')}
              className="min-h-[36px]"
            >
              Clear search
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {filtered.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  )
}
