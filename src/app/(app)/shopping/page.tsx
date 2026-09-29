import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { ShoppingListView } from '@/features/shopping/components/shopping-list-view'
import { getShoppingLists, getShoppingListWithItems, getActiveShoppingList } from '@/features/shopping/queries'
import { Badge } from '@/components/ui/badge'
import { ShoppingBag } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Shopping | Aurelia',
  description: 'Your intelligent kitchen provisioning companion, consolidated from your culinary archive and meal plans.',
}

interface ShoppingPageProps {
  searchParams: Promise<{ list?: string }>
}

export default async function ShoppingPage({ searchParams }: ShoppingPageProps) {
  const { list: listIdParam } = await searchParams

  const [lists, defaultActive] = await Promise.all([
    getShoppingLists(),
    getActiveShoppingList(),
  ])

  // Determine which list to show as active
  const targetListId = listIdParam ?? defaultActive?.id ?? null

  let activeList = null
  if (targetListId) {
    activeList = await getShoppingListWithItems(targetListId)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shopping"
        description="Your intelligent kitchen provisioning companion, consolidated from your culinary archive and meal plans."
        badge={
          <Badge
            variant="outline"
            className="gap-1.5 border-primary/25 bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 shadow-2xs"
          >
            <ShoppingBag className="h-3 w-3" />
            <span>Kitchen Provisioning</span>
          </Badge>
        }
      />

      <ShoppingListView lists={lists} activeList={activeList} />
    </div>
  )
}
