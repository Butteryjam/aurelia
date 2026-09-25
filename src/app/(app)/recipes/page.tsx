import {
  getRecipes,
  getUserFavoriteRecipeIds,
  getRecipeFilterOptions,
} from '@/features/recipes/queries'
import { RecipesView } from '@/features/recipes/components/recipes-view'

export const dynamic = 'force-dynamic'

interface RecipesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const resolvedParams = await searchParams

  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : undefined
  const category =
    typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined
  const cuisine =
    typeof resolvedParams.cuisine === 'string' ? resolvedParams.cuisine : undefined
  const difficulty =
    typeof resolvedParams.difficulty === 'string' &&
    ['easy', 'medium', 'hard'].includes(resolvedParams.difficulty)
      ? (resolvedParams.difficulty as 'easy' | 'medium' | 'hard')
      : undefined
  const maxTime =
    typeof resolvedParams.maxTime === 'string'
      ? parseInt(resolvedParams.maxTime, 10)
      : undefined
  const tag = typeof resolvedParams.tag === 'string' ? resolvedParams.tag : undefined
  const favorite = resolvedParams.favorite === 'true'
  const sort =
    typeof resolvedParams.sort === 'string' &&
    ['newest', 'updated', 'alpha', 'quickest', 'rating'].includes(resolvedParams.sort)
      ? (resolvedParams.sort as 'newest' | 'updated' | 'alpha' | 'quickest' | 'rating')
      : 'newest'

  const [recipes, favoriteIds, filterOptions] = await Promise.all([
    getRecipes({
      search: q,
      category,
      cuisine,
      difficulty,
      maxCookTime: maxTime,
      tag,
      favorite,
      sort,
    }),
    getUserFavoriteRecipeIds(),
    getRecipeFilterOptions(),
  ])

  return (
    <RecipesView
      recipes={recipes}
      favoriteIds={favoriteIds}
      filterOptions={filterOptions}
    />
  )
}
