import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { ShoppingListView } from '@/features/shopping/components/shopping-list-view'
import { getShoppingLists, getShoppingListWithItems, getActiveShoppingList } from '@/features/shopping/queries'

export const metadata: Metadata = {
  title: 'Shopping Lists | Aurelia',
  description: 'Manage your grocery shopping lists. Generate from recipes or add items manually.',
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
        title="Shopping Lists"
        description="Generate smart shopping lists from your recipes or add items manually."
      />

      <ShoppingListView lists={lists} activeList={activeList} />
    </div>
  )
}
