import 'server-only'
import { getAiConfig } from './openai-client'
import {
  RECIPE_MODIFICATION_SYSTEM_PROMPT,
  buildRecipeModificationUserPrompt,
} from '../prompts/recipe-modification'
import { modifiedRecipeResultSchema } from '../schemas/recipe-modification'
import type { RecipeModificationInput, ModifiedRecipeResult } from '../types'
import { getFocusedRecipeContext } from './retriever'

/**
 * Adapt an existing recipe non-destructively using AI.
 */
export async function modifyRecipeWithAi(
  input: RecipeModificationInput,
  userId: string
): Promise<{
  data?: ModifiedRecipeResult
  error?: string
}> {
  const ai = getAiConfig()
  if (!ai) {
    return {
      error:
        'AI Chef is temporarily unavailable. Please configure your AI API key in your environment.',
    }
  }

  // Fetch recipe context to verify user ownership and get current recipe data
  const context = await getFocusedRecipeContext(input.recipeId, userId)
  if (!context) {
    return { error: 'Recipe not found or you do not have permission to modify it.' }
  }

  try {
    const recipeJson = JSON.stringify(
      {
        title: context.title,
        cuisine: context.cuisine,
        category: context.category,
        cookTime: context.cookTime,
        servings: context.servings,
        ingredients: context.ingredients,
        instructions: context.instructions,
        notes: context.notes,
      },
      null,
      2
    )

    const candidateModels = [
      ai.model,
      ...(ai.provider === 'gemini' && ai.model !== 'gemini-3.5-flash-lite'
        ? ['gemini-3.5-flash-lite']
        : []),
    ]

    let response = null
    let lastError: unknown = null

    for (const currentModel of candidateModels) {
      try {
        response = await ai.client.chat.completions.create({
          model: currentModel,
          messages: [
            { role: 'system', content: RECIPE_MODIFICATION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: buildRecipeModificationUserPrompt({
                recipeTitle: context.title,
                recipeJson,
                action: input.action,
                customInstruction: input.customInstruction,
                targetServings: input.targetServings,
                substituteIngredient: input.substituteIngredient,
              }),
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        })
        break
      } catch (err: unknown) {
        lastError = err
        const status =
          (err as { status?: number; statusCode?: number })?.status ??
          (err as { status?: number; statusCode?: number })?.statusCode
        if ((status === 429 || status === 503) && candidateModels.length > 1 && currentModel !== candidateModels[candidateModels.length - 1]) {
          console.warn(`[Modification] Model ${currentModel} returned ${status}. Failing over to fallback model...`)
          continue
        }
        throw err
      }
    }

    if (!response) {
      throw lastError ?? new Error('No response from AI model.')
    }

    const rawJson = response.choices[0]?.message?.content
    if (!rawJson) {
      return { error: 'The AI model returned an empty modification response.' }
    }

    const parsedJson = JSON.parse(rawJson)
    const validation = modifiedRecipeResultSchema.safeParse(parsedJson)

    if (!validation.success) {
      console.error('AI recipe modification validation failed:', validation.error.issues)
      return {
        error: 'Unable to validate the modified recipe format. Please try your request again.',
      }
    }

    return { data: validation.data }
  } catch (error) {
    console.error('Error in modifyRecipeWithAi:', error)
    return {
      error: 'Unable to modify this recipe right now. Your original recipe is unchanged.',
    }
  }
}
