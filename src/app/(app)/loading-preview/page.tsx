import { notFound } from 'next/navigation'
import DashboardLoading from '../loading'
import RecipesLoading from '../recipes/loading'
import RecipeDetailLoading from '../recipes/[id]/loading'
import NewRecipeLoading from '../recipes/new/loading'
import EditRecipeLoading from '../recipes/[id]/edit/loading'
import ImportLoading from '../recipes/import/loading'
import CollectionsLoading from '../collections/loading'
import CollectionDetailLoading from '../collections/[id]/loading'
import MealPlannerLoading from '../meal-planner/loading'
import ShoppingLoading from '../shopping/loading'
import AIChefLoading from '../ai-chef/loading'
import SettingsLoading from '../settings/loading'

export const dynamic = 'force-dynamic'

interface LoadingPreviewProps {
  searchParams: Promise<{ screen?: string }>
}

export default async function LoadingPreviewPage({ searchParams }: LoadingPreviewProps) {
  // Developer & test preview utility only.
  // Blocked from public access in production environments unless explicitly authorized.
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_TEST_PREVIEWS !== 'true') {
    notFound()
  }

  const { screen } = await searchParams

  switch (screen) {
    case 'recipes':
      return <RecipesLoading />
    case 'recipe-detail':
      return <RecipeDetailLoading />
    case 'new':
      return <NewRecipeLoading />
    case 'edit':
      return <EditRecipeLoading />
    case 'import':
      return <ImportLoading />
    case 'collections':
      return <CollectionsLoading />
    case 'collection-detail':
      return <CollectionDetailLoading />
    case 'meal-planner':
      return <MealPlannerLoading />
    case 'shopping':
      return <ShoppingLoading />
    case 'ai-chef':
      return <AIChefLoading />
    case 'settings':
      return <SettingsLoading />
    case 'dashboard':
    default:
      return <DashboardLoading />
  }
}
