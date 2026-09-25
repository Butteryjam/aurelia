import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRecipeById } from '@/features/recipes/queries'
import { RecipeDetailView } from '@/features/recipes/components/recipe-detail-view'

export const maxDuration = 60

interface RecipePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
  const { id } = await params
  const recipe = await getRecipeById(id)

  if (!recipe) {
    return { title: 'Recipe Not Found | Aurelia' }
  }

  return {
    title: `${recipe.title} | Aurelia`,
    description: recipe.description || `View ingredients and instructions for ${recipe.title} on Aurelia.`,
  }
}

export default async function RecipeDetailPage({ params }: RecipePageProps) {
  const { id } = await params
  const recipe = await getRecipeById(id)

  if (!recipe) {
    notFound()
  }

  return <RecipeDetailView recipe={recipe} />
}
