import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getRecipeById } from '@/features/recipes/queries'
import { RecipeForm } from '@/features/recipes/components/recipe-form'

interface EditRecipePageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Edit Recipe | Aurelia',
  description: 'Refine ingredients, culinary steps, and timing in your personal cookbook archive.',
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

  return (
    <div className="max-w-4xl mx-auto">
      <RecipeForm mode="edit" initialData={recipe} />
    </div>
  )
}
