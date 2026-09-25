'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { UpdateDto } from '@/types/database'
import {
  createCollectionSchema,
  updateCollectionSchema,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from '@/lib/validators/collection'

export interface ActionResult<T = unknown> {
  data?: T
  error?: string
}

/**
 * Create a new recipe collection for the current user.
 */
export async function createCollection(
  input: CreateCollectionInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createCollectionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid collection data.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to create a collection.' }
  }

  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: user.id,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      cover_image_url: parsed.data.coverImageUrl || null,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('Failed to create collection:', error)
    return { error: 'Could not create collection. Please try again.' }
  }

  revalidatePath('/collections')
  return { data: { id: data.id } }
}

/**
 * Update an existing collection.
 */
export async function updateCollection(
  id: string,
  input: UpdateCollectionInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateCollectionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid collection data.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to edit a collection.' }
  }

  const updatePayload: UpdateDto<'collections'> = {}
  if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name.trim()
  if (parsed.data.description !== undefined) {
    updatePayload.description = parsed.data.description?.trim() || null
  }
  if (parsed.data.coverImageUrl !== undefined) {
    updatePayload.cover_image_url = parsed.data.coverImageUrl || null
  }

  const { error } = await supabase
    .from('collections')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to update collection:', error)
    return { error: 'Could not update collection.' }
  }

  revalidatePath('/collections')
  revalidatePath(`/collections/${id}`)
  return { data: { id } }
}

/**
 * Delete a collection.
 */
export async function deleteCollection(id: string): Promise<ActionResult<{ success: true }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to delete a collection.' }
  }

  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to delete collection:', error)
    return { error: 'Could not delete collection.' }
  }

  revalidatePath('/collections')
  return { data: { success: true } }
}

/**
 * Add a recipe to a collection.
 */
export async function addRecipeToCollection(
  collectionId: string,
  recipeId: string
): Promise<ActionResult<{ success: true }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  // Verify collection ownership
  const { data: col } = await supabase
    .from('collections')
    .select('id')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!col) {
    return { error: 'Collection not found or unauthorized.' }
  }

  const { error } = await supabase.from('collection_recipes').upsert({
    collection_id: collectionId,
    recipe_id: recipeId,
  })

  if (error) {
    console.error('Failed to add recipe to collection:', error)
    return { error: 'Could not add recipe to collection.' }
  }

  revalidatePath('/collections')
  revalidatePath(`/collections/${collectionId}`)
  revalidatePath(`/recipes/${recipeId}`)
  return { data: { success: true } }
}

/**
 * Remove a recipe from a collection.
 */
export async function removeRecipeFromCollection(
  collectionId: string,
  recipeId: string
): Promise<ActionResult<{ success: true }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const { error } = await supabase
    .from('collection_recipes')
    .delete()
    .eq('collection_id', collectionId)
    .eq('recipe_id', recipeId)

  if (error) {
    console.error('Failed to remove recipe from collection:', error)
    return { error: 'Could not remove recipe from collection.' }
  }

  revalidatePath('/collections')
  revalidatePath(`/collections/${collectionId}`)
  revalidatePath(`/recipes/${recipeId}`)
  return { data: { success: true } }
}

/**
 * Fetch list of collection IDs that contain the given recipe for the current user.
 */
export async function getRecipeCollectionIds(recipeId: string): Promise<string[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data: userCols } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', user.id)

  if (!userCols || userCols.length === 0) return []
  const colIds = userCols.map((c) => c.id)

  const { data } = await supabase
    .from('collection_recipes')
    .select('collection_id')
    .eq('recipe_id', recipeId)
    .in('collection_id', colIds)

  return data?.map((d) => d.collection_id) ?? []
}
