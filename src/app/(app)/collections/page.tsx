import { getCollections } from '@/features/collections/queries'
import { CollectionsView } from '@/features/collections/components/collections-view'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Collections | Aurelia',
  description: 'Organize your recipes into curated collections.',
}

export default async function CollectionsPage() {
  const collections = await getCollections()

  return <CollectionsView collections={collections} />
}
