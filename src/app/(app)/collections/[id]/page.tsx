import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCollectionWithRecipes } from '@/features/collections/queries'
import { getUserFavoriteRecipeIds } from '@/features/recipes/queries'
import { CollectionDetailView } from '@/features/collections/components/collection-detail-view'

interface CollectionPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { id } = await params
  const collection = await getCollectionWithRecipes(id)

  if (!collection) {
    return { title: 'Collection Not Found | Aurelia' }
  }

  return {
    title: `${collection.name} | Aurelia`,
    description: collection.description || `Browse recipes in ${collection.name} on Aurelia.`,
  }
}

export default async function CollectionDetailPage({ params }: CollectionPageProps) {
  const { id } = await params
  const [collection, favoriteIds] = await Promise.all([
    getCollectionWithRecipes(id),
    getUserFavoriteRecipeIds(),
  ])

  if (!collection) {
    notFound()
  }

  return <CollectionDetailView collection={collection} favoriteIds={favoriteIds} />
}
