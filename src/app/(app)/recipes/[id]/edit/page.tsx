import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getRecipeById } from '@/features/recipes/queries'
import { RecipeForm } from '@/features/recipes/components/recipe-form'

interface EditRecipePageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Edit Recipe | Aurelia',
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = await params
  const recipe = await getRecipeById(id)

  if (!recipe) {
    notFound()
  }

  // Security: Only owner can edit
  if (!recipe.is_owner) {
    redirect(`/recipes/${id}`)
  }

  return <RecipeForm mode="edit" initialData={recipe} />
}
