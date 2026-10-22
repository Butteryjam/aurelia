import { NextResponse } from 'next/server'
import { authenticateMobileRequest } from '@/lib/supabase/mobile-auth'
import { updateRecipeSchema } from '@/lib/validators/recipe'
import type { UpdateDto } from '@/types/database'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/recipes/[id]
 * Mobile-facing atomic recipe update endpoint.
 */
export async function PUT(request: Request, context: RouteContext) {
  const auth = await authenticateMobileRequest(request)
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const { id: recipeId } = await context.params
  const { user, supabase } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 })
  }

  const parsed = updateRecipeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid update data.' },
      { status: 400 }
    )
  }

  // 1. Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('recipes')
    .select('id, user_id')
    .eq('id', recipeId)
    .single()

  if (fetchError || !existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Recipe not found or permission denied.' }, { status: 404 })
  }

  const data = parsed.data
  const computedTotalTime =
    data.totalTime !== undefined
      ? data.totalTime
      : data.prepTime !== undefined || data.cookTime !== undefined
        ? (data.prepTime || 0) + (data.cookTime || 0) || null
        : undefined

  // 2. Update parent recipe record
  const updatePayload: UpdateDto<'recipes'> = {
    updated_at: new Date().toISOString(),
  }
  if (data.title !== undefined) updatePayload.title = data.title.trim()
  if (data.description !== undefined) updatePayload.description = data.description?.trim() || null
  if (data.imageUrl !== undefined) updatePayload.image_url = data.imageUrl || null
  if (data.prepTime !== undefined) updatePayload.prep_time = data.prepTime ?? null
  if (data.cookTime !== undefined) updatePayload.cook_time = data.cookTime ?? null
  if (computedTotalTime !== undefined) updatePayload.total_time = computedTotalTime
  if (data.servings !== undefined) updatePayload.servings = data.servings ?? null
  if (data.difficulty !== undefined) updatePayload.difficulty = data.difficulty ?? null
  if (data.cuisine !== undefined) updatePayload.cuisine = data.cuisine?.trim() || null
  if (data.category !== undefined) updatePayload.category = data.category?.trim() || null
  if (data.notes !== undefined) updatePayload.notes = data.notes?.trim() || null

  const { error: updateError } = await supabase
    .from('recipes')
    .update(updatePayload)
    .eq('id', recipeId)

  if (updateError) {
    console.error('[PUT /api/recipes/[id]] Failed to update recipe:', updateError)
    return NextResponse.json({ error: 'Could not update recipe.' }, { status: 500 })
  }

  // 3. Atomically replace ingredients if provided
  if (data.ingredients !== undefined) {
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId)

    if (data.ingredients && data.ingredients.length > 0) {
      const ingredientsToInsert = data.ingredients.map((ing, idx) => ({
        recipe_id: recipeId,
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

  // 4. Atomically replace instructions if provided
  if (data.instructions !== undefined) {
    await supabase.from('recipe_instructions').delete().eq('recipe_id', recipeId)

    if (data.instructions && data.instructions.length > 0) {
      const instructionsToInsert = data.instructions.map((ins, idx) => ({
        recipe_id: recipeId,
        step_number: idx + 1,
        instruction: ins.instruction.trim(),
        timer_duration: ins.timerDuration ?? null,
      }))

      await supabase.from('recipe_instructions').insert(instructionsToInsert)
    }
  }

  // 5. Replace tags if provided
  if (data.tags !== undefined) {
    await supabase.from('recipe_tags').delete().eq('recipe_id', recipeId)

    if (data.tags && data.tags.length > 0) {
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
            recipe_id: recipeId,
            tag_id: tag.id,
          })
        }
      }
    }
  }

  // 6. Record version snapshot
  const { data: versions } = await supabase
    .from('recipe_versions')
    .select('version_number')
    .eq('recipe_id', recipeId)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = (versions?.[0]?.version_number ?? 1) + 1

  await supabase.from('recipe_versions').insert({
    recipe_id: recipeId,
    version_number: nextVersion,
    snapshot: {
      ...data,
      updated_at: new Date().toISOString(),
    },
    change_note: `Recipe updated (version ${nextVersion})`,
  })

  return NextResponse.json({ data: { id: recipeId, success: true } })
}

/**
 * DELETE /api/recipes/[id]
 * Deletes recipe and associated cascading child records.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await authenticateMobileRequest(_request)
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const { id: recipeId } = await context.params
  const { user, supabase } = auth

  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[DELETE /api/recipes/[id]] Delete error:', error)
    return NextResponse.json({ error: 'Could not delete recipe.' }, { status: 500 })
  }

  return NextResponse.json({ data: { success: true } })
}
