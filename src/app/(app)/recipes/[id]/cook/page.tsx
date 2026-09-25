import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRecipeById } from '@/features/recipes/queries'
import { CookModeView } from '@/features/cook-mode/components/cook-mode-view'

interface CookPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CookPageProps): Promise<Metadata> {
  const { id } = await params
  const recipe = await getRecipeById(id)

  if (!recipe) {
    return { title: 'Recipe Not Found | Aurelia' }
  }

  return {
    title: `Cook Mode: ${recipe.title} | Aurelia`,
    description: `Step-by-step cooking guide for ${recipe.title}.`,
  }
}

export default async function CookPage({ params }: CookPageProps) {
  const { id } = await params
  const recipe = await getRecipeById(id)

  if (!recipe) {
    notFound()
  }

  return <CookModeView recipe={recipe} />
}
