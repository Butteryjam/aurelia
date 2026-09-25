import { createClient } from '@/lib/supabase/server'
import type { Recipe, RecipeWithDetails, Tag } from '@/types/database'

export interface RecipeFilters {
  cuisine?: string
  category?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  maxCookTime?: number
  search?: string
  tag?: string
  favorite?: boolean
  sort?: 'newest' | 'updated' | 'alpha' | 'quickest' | 'rating'
  scope?: 'personal' | 'public'
}

export interface FilterOptions {
  categories: string[]
  cuisines: string[]
  tags: string[]
}

/**
 * Fetch recipes accessible to the current user.
 * Personal vault (default) queries ONLY the authenticated user's recipes.
 * Public scope queries public recipes for explore/discovery.
 */
export async function getRecipes(filters?: RecipeFilters): Promise<Recipe[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const scope = filters?.scope ?? 'personal'
  let query = supabase.from('recipes').select('*')

  if (scope === 'personal') {
    if (!user) return []
    query = query.eq('user_id', user.id)
  } else if (scope === 'public') {
    query = query.eq('is_public', true)
  }

  // 1. Filter by Favorite
  if (filters?.favorite) {
    if (!user) return []

    const { data: favs } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', user.id)

    const favIds = favs?.map((f) => f.recipe_id) ?? []
    if (favIds.length === 0) return []
    query = query.in('id', favIds)
  }

  // 2. Filter by Tag
  if (filters?.tag) {
    const { data: tagRecord } = await supabase
      .from('tags')
      .select('id')
      .ilike('name', filters.tag)
      .maybeSingle()

    if (!tagRecord) {
      return []
    }

    const { data: tagLinks } = await supabase
      .from('recipe_tags')
      .select('recipe_id')
      .eq('tag_id', tagRecord.id)

    const taggedRecipeIds = tagLinks?.map((tl) => tl.recipe_id) ?? []
    if (taggedRecipeIds.length === 0) return []
    query = query.in('id', taggedRecipeIds)
  }

  // 3. Category filter
  if (filters?.category && filters.category !== 'all') {
    query = query.ilike('category', filters.category)
  }

  // 4. Cuisine filter
  if (filters?.cuisine && filters.cuisine !== 'all') {
    query = query.ilike('cuisine', filters.cuisine)
  }

  // 5. Difficulty filter
  if (filters?.difficulty) {
    query = query.eq('difficulty', filters.difficulty)
  }

  // 6. Max Cooking Time
  if (filters?.maxCookTime && filters.maxCookTime > 0) {
    query = query.lte('cook_time', filters.maxCookTime)
  }

  // 7. Multi-field Search (Title, Description, Cuisine, Category, Ingredients, Tags)
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()

    // Find recipe IDs that contain matching ingredients
    const { data: matchedIngredients } = await supabase
      .from('recipe_ingredients')
      .select('recipe_id')
      .ilike('name', `%${q}%`)

    // Find recipe IDs that contain matching tags
    const { data: matchedTags } = await supabase
      .from('tags')
      .select('id')
      .ilike('name', `%${q}%`)

    let matchedTagRecipeIds: string[] = []
    if (matchedTags && matchedTags.length > 0) {
      const tagIds = matchedTags.map((t) => t.id)
      const { data: tagLinks } = await supabase
        .from('recipe_tags')
        .select('recipe_id')
        .in('tag_id', tagIds)
      matchedTagRecipeIds = tagLinks?.map((tl) => tl.recipe_id) ?? []
    }

    const extraRecipeIds = Array.from(
      new Set([
        ...(matchedIngredients?.map((i) => i.recipe_id) ?? []),
        ...matchedTagRecipeIds,
      ])
    )

    if (extraRecipeIds.length > 0) {
      // Matches title, description, cuisine, or notes, OR matching ingredient/tag IDs
      query = query.or(
        `title.ilike.%${q}%,description.ilike.%${q}%,cuisine.ilike.%${q}%,category.ilike.%${q}%,notes.ilike.%${q}%,id.in.(${extraRecipeIds.join(',')})`
      )
    } else {
      query = query.or(
        `title.ilike.%${q}%,description.ilike.%${q}%,cuisine.ilike.%${q}%,category.ilike.%${q}%,notes.ilike.%${q}%`
      )
    }
  }

  // 8. Sorting
  switch (filters?.sort) {
    case 'updated':
      query = query.order('updated_at', { ascending: false })
      break
    case 'alpha':
      query = query.order('title', { ascending: true })
      break
    case 'quickest':
      query = query.order('cook_time', { ascending: true, nullsFirst: false })
      break
    case 'rating':
      query = query.order('rating', { ascending: false, nullsFirst: false })
      break
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false })
      break
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching recipes:', error)
    return []
  }

  return data ?? []
}

/**
 * Fetch available filter options (categories, cuisines, and tags)
 * for the user's personal recipe library (default) or public library.
 */
export async function getRecipeFilterOptions(
  scope: 'personal' | 'public' = 'personal'
): Promise<FilterOptions> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let recipeQuery = supabase.from('recipes').select('category, cuisine')
  if (scope === 'personal') {
    if (!user) return { categories: [], cuisines: [], tags: [] }
    recipeQuery = recipeQuery.eq('user_id', user.id)
  } else if (scope === 'public') {
    recipeQuery = recipeQuery.eq('is_public', true)
  }

  const [recipesRes, tagsRes] = await Promise.all([
    recipeQuery,
    supabase.from('tags').select('name').order('name'),
  ])

  const categorySet = new Set<string>()
  const cuisineSet = new Set<string>()

  recipesRes.data?.forEach((r) => {
    if (r.category?.trim()) categorySet.add(r.category.trim())
    if (r.cuisine?.trim()) cuisineSet.add(r.cuisine.trim())
  })

  const tagList = tagsRes.data?.map((t) => t.name).filter(Boolean) ?? []

  return {
    categories: Array.from(categorySet).sort(),
    cuisines: Array.from(cuisineSet).sort(),
    tags: Array.from(new Set(tagList)),
  }
}

/**
 * Fetch the list of recipe IDs favorited by the current user.
 * Avoids N+1 queries when rendering the recipe grid.
 */
export async function getUserFavoriteRecipeIds(): Promise<string[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('favorites')
    .select('recipe_id')
    .eq('user_id', user.id)

  if (error || !data) return []

  return data.map((f) => f.recipe_id)
}

/**
 * Fetch a single recipe by ID with its nested ingredients, instructions, tags,
 * favorite status, and owner verification.
 */
export async function getRecipeById(
  id: string
): Promise<(RecipeWithDetails & { is_owner: boolean }) | null> {
  const supabase = await createClient()

  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !recipe) {
    return null
  }

  // Fetch ingredients in order
  const { data: ingredients } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .eq('recipe_id', id)
    .order('order_index')

  // Fetch instructions in step order
  const { data: instructions } = await supabase
    .from('recipe_instructions')
    .select('*')
    .eq('recipe_id', id)
    .order('step_number')

  // Fetch tags
  const { data: tagLinks } = await supabase
    .from('recipe_tags')
    .select('tag_id')
    .eq('recipe_id', id)

  let tags: Tag[] = []
  if (tagLinks && tagLinks.length > 0) {
    const tagIds = tagLinks.map((tl) => tl.tag_id)
    const { data: fetchedTags } = await supabase
      .from('tags')
      .select('*')
      .in('id', tagIds)
    tags = fetchedTags ?? []
  }

  // Check auth user, favorite status, and ownership
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isFavorite = false
  const isOwner = user ? user.id === recipe.user_id : false

  if (user) {
    const { data: fav } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', user.id)
      .eq('recipe_id', id)
      .maybeSingle()

    isFavorite = !!fav
  }

  return {
    ...recipe,
    recipe_ingredients: ingredients ?? [],
    recipe_instructions: instructions ?? [],
    tags,
    is_favorite: isFavorite,
    is_owner: isOwner,
  }
}

/**
 * Fetch favorite recipes for the authenticated user.
 */
export async function getFavoriteRecipes(): Promise<Recipe[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data: favs, error } = await supabase
    .from('favorites')
    .select('recipe_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !favs || favs.length === 0) {
    return []
  }

  const recipeIds = favs.map((f) => f.recipe_id)
  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('*')
    .in('id', recipeIds)

  if (recipesError || !recipes) {
    return []
  }

  return recipes
}

/**
 * Fetch recently cooked or viewed recipes for quick access on dashboard.
 * Scoped strictly to the authenticated user.
 */
export async function getRecentRecipes(limit: number = 6): Promise<Recipe[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent recipes:', error)
    return []
  }

  return data ?? []
}

/**
 * Fetch public recipes for community discovery and exploration.
 */
export async function getPublicRecipes(
  filters?: Omit<RecipeFilters, 'scope'>
): Promise<Recipe[]> {
  return getRecipes({ ...filters, scope: 'public' })
}
