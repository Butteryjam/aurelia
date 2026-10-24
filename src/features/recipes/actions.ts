'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { UpdateDto } from '@/types/database'
import {
  createRecipeSchema,
  updateRecipeSchema,
  type CreateRecipeInput,
  type UpdateRecipeInput,
} from '@/lib/validators/recipe'
import { cleanupRecipeImages } from '@/features/recipes/utils/storage'

export interface ActionResult<T = unknown> {
  data?: T
  error?: string
}

/**
 * Create a new recipe along with its ingredients, instructions, and tags.
 */
export async function createRecipe(input: CreateRecipeInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createRecipeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid recipe data.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to create a recipe.' }
  }

  const data = parsed.data
  const computedTotalTime =
    data.totalTime ??
    ((data.prepTime || 0) + (data.cookTime || 0) > 0
      ? (data.prepTime || 0) + (data.cookTime || 0)
      : null)

  // 1. Insert recipe parent record
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      user_id: user.id,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      image_url: data.imageUrl || null,
      prep_time: data.prepTime ?? null,
      cook_time: data.cookTime ?? null,
      total_time: computedTotalTime,
      servings: data.servings ?? null,
      difficulty: data.difficulty ?? null,
      cuisine: data.cuisine?.trim() || null,
      category: data.category?.trim() || null,
      notes: data.notes?.trim() || null,
      is_public: false,
    })
    .select('id')
    .single()

  if (recipeError || !recipe) {
    console.error('Failed to create recipe:', recipeError)
    return { error: 'Could not create recipe. Please try again.' }
  }

  // 2. Insert ingredients in order
  if (data.ingredients && data.ingredients.length > 0) {
    const ingredientsToInsert = data.ingredients.map((ing, idx) => ({
      recipe_id: recipe.id,
      name: ing.name.trim(),
      quantity: ing.quantity?.trim() || null,
      unit: ing.unit?.trim() || null,
      order_index: idx,
      is_optional: !!ing.isOptional,
      preparation_note: ing.preparationNote?.trim() || null,
    }))

    const { error: ingError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientsToInsert)

    if (ingError) {
      console.error('Failed to insert ingredients:', ingError)
    }
  }

  // 3. Insert instructions in order
  if (data.instructions && data.instructions.length > 0) {
    const instructionsToInsert = data.instructions.map((ins, idx) => ({
      recipe_id: recipe.id,
      step_number: idx + 1,
      instruction: ins.instruction.trim(),
      timer_duration: ins.timerDuration ?? null,
    }))

    const { error: insError } = await supabase
      .from('recipe_instructions')
      .insert(instructionsToInsert)

    if (insError) {
      console.error('Failed to insert instructions:', insError)
    }
  }

  // 4. Handle tags if provided
  if (data.tags && data.tags.length > 0) {
    for (const tagName of data.tags) {
      const cleanName = tagName.trim()
      if (!cleanName) continue

      // Upsert tag
      const { data: tag } = await supabase
        .from('tags')
        .upsert({ user_id: user.id, name: cleanName }, { onConflict: 'user_id,name' })
        .select('id')
        .single()

      if (tag) {
        await supabase.from('recipe_tags').insert({
          recipe_id: recipe.id,
          tag_id: tag.id,
        })
      }
    }
  }

  // 5. Create initial version snapshot
  await supabase.from('recipe_versions').insert({
    recipe_id: recipe.id,
    version_number: 1,
    snapshot: {
      ...data,
      created_at: new Date().toISOString(),
    },
    change_note: 'Initial recipe created',
  })

  revalidatePath('/recipes')
  revalidatePath('/')

  return { data: { id: recipe.id } }
}

/**
 * Update an existing recipe, synchronizing ingredients, instructions, and tags.
 */
export async function updateRecipe(
  id: string,
  input: UpdateRecipeInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateRecipeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid recipe data.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to update a recipe.' }
  }

  // Verify ownership
  const { data: existingRecipe } = await supabase
    .from('recipes')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existingRecipe) {
    return { error: 'Recipe not found or you do not have permission to edit it.' }
  }

  const data = parsed.data
  const computedTotalTime =
    data.totalTime !== undefined
      ? data.totalTime
      : (data.prepTime || 0) + (data.cookTime || 0) > 0
        ? (data.prepTime || 0) + (data.cookTime || 0)
        : null

  // 1. Update recipe record
  const updatePayload: UpdateDto<'recipes'> = {}
  if (data.title !== undefined) updatePayload.title = data.title.trim()
  if (data.description !== undefined) updatePayload.description = data.description?.trim() || null
  if (data.imageUrl !== undefined) updatePayload.image_url = data.imageUrl || null
  if (data.prepTime !== undefined) updatePayload.prep_time = data.prepTime
  if (data.cookTime !== undefined) updatePayload.cook_time = data.cookTime
  if (computedTotalTime !== undefined) updatePayload.total_time = computedTotalTime
  if (data.servings !== undefined) updatePayload.servings = data.servings
  if (data.difficulty !== undefined) updatePayload.difficulty = data.difficulty
  if (data.cuisine !== undefined) updatePayload.cuisine = data.cuisine?.trim() || null
  if (data.category !== undefined) updatePayload.category = data.category?.trim() || null
  if (data.notes !== undefined) updatePayload.notes = data.notes?.trim() || null

  const { error: updateError } = await supabase
    .from('recipes')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (updateError) {
    console.error('Failed to update recipe:', updateError)
    return { error: 'Could not update recipe. Please try again.' }
  }

  // 2. Synchronize ingredients if provided
  if (data.ingredients !== undefined) {
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)

    if (data.ingredients.length > 0) {
      const ingredientsToInsert = data.ingredients.map((ing, idx) => ({
        recipe_id: id,
        name: ing.name.trim(),
        quantity: ing.quantity?.trim() || null,
        unit: ing.unit?.trim() || null,
        order_index: idx,
        is_optional: !!ing.isOptional,
        preparation_note: ing.preparationNote?.trim() || null,
      }))
      await supabase.from('recipe_ingredients').insert(ingredientsToInsert)
    }
  }

  // 3. Synchronize instructions if provided
  if (data.instructions !== undefined) {
    await supabase.from('recipe_instructions').delete().eq('recipe_id', id)

    if (data.instructions.length > 0) {
      const instructionsToInsert = data.instructions.map((ins, idx) => ({
        recipe_id: id,
        step_number: idx + 1,
        instruction: ins.instruction.trim(),
        timer_duration: ins.timerDuration ?? null,
      }))
      await supabase.from('recipe_instructions').insert(instructionsToInsert)
    }
  }

  // 4. Synchronize tags if provided
  if (data.tags !== undefined) {
    await supabase.from('recipe_tags').delete().eq('recipe_id', id)

    for (const tagName of data.tags) {
      const cleanName = tagName.trim()
      if (!cleanName) continue

      const { data: tag } = await supabase
        .from('tags')
        .upsert({ user_id: user.id, name: cleanName }, { onConflict: 'user_id,name' })
        .select('id')
        .single()

      if (tag) {
        await supabase.from('recipe_tags').insert({
          recipe_id: id,
          tag_id: tag.id,
        })
      }
    }
  }

  // 5. Versioning: increment version number
  const { data: versions } = await supabase
    .from('recipe_versions')
    .select('version_number')
    .eq('recipe_id', id)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = (versions?.[0]?.version_number ?? 0) + 1

  await supabase.from('recipe_versions').insert({
    recipe_id: id,
    version_number: nextVersion,
    snapshot: {
      ...data,
      updated_at: new Date().toISOString(),
    },
    change_note: `Updated recipe to version ${nextVersion}`,
  })

  revalidatePath('/recipes')
  revalidatePath(`/recipes/${id}`)
  revalidatePath('/')

  return { data: { id } }
}

/**
 * Delete a recipe. Cascading foreign keys will delete child records.
 */
export async function deleteRecipe(id: string): Promise<ActionResult<{ success: true; id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to delete a recipe.' }
  }

  const { data: deleted, error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, image_url')

  if (error) {
    console.error('Failed to delete recipe:', error)
    return { error: 'Could not delete recipe.' }
  }

  if (!deleted || deleted.length === 0) {
    return { error: 'Recipe not found or you do not have permission to delete it.' }
  }

  if (deleted[0]?.image_url) {
    await cleanupRecipeImages(supabase, [deleted[0].image_url])
  }

  revalidatePath('/recipes')
  revalidatePath('/collections')
  revalidatePath('/')

  return { data: { success: true, id } }
}

/**
 * Bulk delete recipes owned by the authenticated user.
 * Cascading foreign keys will delete child records.
 */
export async function bulkDeleteRecipes(
  ids: string[]
): Promise<ActionResult<{ success: true; count: number; deletedIds: string[] }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to delete recipes.' }
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: 'No recipes selected for deletion.' }
  }

  const uniqueIds = Array.from(new Set(ids.filter((id) => typeof id === 'string' && id.trim().length > 0)))
  if (uniqueIds.length === 0) {
    return { error: 'No valid recipes selected for deletion.' }
  }

  if (uniqueIds.length > 100) {
    return { error: 'Cannot delete more than 100 recipes at once.' }
  }

  const { data: deleted, error } = await supabase
    .from('recipes')
    .delete()
    .in('id', uniqueIds)
    .eq('user_id', user.id)
    .select('id, image_url')

  if (error) {
    console.error('Failed to bulk delete recipes:', error)
    return { error: 'Could not delete selected recipes.' }
  }

  if (!deleted || deleted.length === 0) {
    return { error: 'No matching recipes found to delete or permission denied.' }
  }

  const imageUrls = deleted.map((r) => r.image_url).filter(Boolean)
  if (imageUrls.length > 0) {
    await cleanupRecipeImages(supabase, imageUrls)
  }

  revalidatePath('/recipes')
  revalidatePath('/collections')
  revalidatePath('/')

  return {
    data: {
      success: true,
      count: deleted.length,
      deletedIds: deleted.map((r) => r.id),
    },
  }
}

/**
 * Toggle favorite status for a recipe with optimistic UI support.
 */
export async function toggleFavorite(recipeId: string): Promise<ActionResult<{ isFavorite: boolean }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to favorite recipes.' }
  }

  const { data: existing } = await supabase
    .from('favorites')
    .select('recipe_id')
    .eq('user_id', user.id)
    .eq('recipe_id', recipeId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId)

    if (error) {
      return { error: 'Could not remove favorite.' }
    }

    revalidatePath('/recipes')
    revalidatePath(`/recipes/${recipeId}`)
    return { data: { isFavorite: false } }
  } else {
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: user.id, recipe_id: recipeId })

    if (error) {
      return { error: 'Could not add favorite.' }
    }

    revalidatePath('/recipes')
    revalidatePath(`/recipes/${recipeId}`)
    return { data: { isFavorite: true } }
  }
}
