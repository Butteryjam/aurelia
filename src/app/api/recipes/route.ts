import { NextResponse } from 'next/server'
import { authenticateMobileRequest } from '@/lib/supabase/mobile-auth'
import { createRecipeSchema } from '@/lib/validators/recipe'

/**
 * POST /api/recipes
 * Mobile-facing atomic recipe creation endpoint.
 * Ensures parent recipe, ingredients, instructions, tags, and version snapshot
 * are created together without risk of orphaned partial writes.
 */
export async function POST(request: Request) {
  const auth = await authenticateMobileRequest(request)
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const { user, supabase } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 })
  }

  const parsed = createRecipeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid recipe data.' },
      { status: 400 }
    )
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
    console.error('[POST /api/recipes] Failed to create recipe parent:', recipeError)
    return NextResponse.json({ error: 'Could not create recipe. Please try again.' }, { status: 500 })
  }

  try {
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

      if (ingError) throw ingError
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

      if (insError) throw insError
    }

    // 4. Handle tags if provided
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

    return NextResponse.json({ data: { id: recipe.id } }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/recipes] Sub-entity insertion failed, rolling back recipe:', err)
    // Roll back parent to prevent orphaned incomplete recipe
    await supabase.from('recipes').delete().eq('id', recipe.id)
    return NextResponse.json(
      { error: 'Failed to record recipe ingredients or instructions. Changes were rolled back.' },
      { status: 500 }
    )
  }
}
