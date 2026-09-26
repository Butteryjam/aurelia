import 'server-only'
import { getAiConfig } from './openai-client'
import {
  RECIPE_MODIFICATION_SYSTEM_PROMPT,
  buildRecipeModificationUserPrompt,
} from '../prompts/recipe-modification'
import { modifiedRecipeResultSchema } from '../schemas/recipe-modification'
import type { RecipeModificationInput, ModifiedRecipeResult } from '../types'
import { getFocusedRecipeContext } from './retriever'
import {
  TOTAL_AI_BUDGET_MS,
  PRIMARY_TIMEOUT_MS,
  FALLBACK_TIMEOUT_MS,
  MIN_REMAINING_BUDGET_MS,
  isTransientOrTimeoutError,
  resolveCandidateModels,
} from './ai-resilience'
import { parseManualItem } from '@/lib/utils/shopping-consolidator'

/**
 * Normalizes raw LLM output into the shape expected by modifiedRecipeResultSchema.
 * Handles flat recipe responses, string-based ingredients/instructions, and array-based culinaryNotes.
 */
export function normalizeModifiedRecipeOutput(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw
  }

  const data = { ...(raw as Record<string, unknown>) }

  // 1. If 'recipe' is missing or not an object, but recipe fields exist at root, wrap into 'recipe'
  const recipeValue = data.recipe
  const isRecipeObject =
    recipeValue && typeof recipeValue === 'object' && !Array.isArray(recipeValue)

  if (!isRecipeObject) {
    const hasRecipeFields =
      'title' in data || 'ingredients' in data || 'instructions' in data || 'cookTime' in data

    if (hasRecipeFields) {
      const {
        title,
        description,
        prepTime,
        cookTime,
        servings,
        difficulty,
        cuisine,
        category,
        tags,
        notes,
        confidenceNotes,
        ingredients,
        instructions,
        summaryOfChanges,
        summary_of_changes,
        culinaryNotes,
        culinary_notes,
        ...rest
      } = data

      data.recipe = {
        title: title ?? 'Untitled Recipe',
        description: description ?? null,
        prepTime: prepTime ?? null,
        cookTime: cookTime ?? null,
        servings: servings ?? null,
        difficulty: difficulty ?? null,
        cuisine: cuisine ?? null,
        category: category ?? null,
        tags: Array.isArray(tags) ? tags : [],
        notes: notes ?? null,
        confidenceNotes: confidenceNotes ?? null,
        ingredients: ingredients ?? [],
        instructions: instructions ?? [],
        ...rest,
      }

      data.summaryOfChanges = summaryOfChanges ?? summary_of_changes
      data.culinaryNotes = culinaryNotes ?? culinary_notes
    }
  }

  // 2. Normalize 'culinaryNotes' if it is an array of strings
  if (Array.isArray(data.culinaryNotes)) {
    data.culinaryNotes = data.culinaryNotes
      .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
      .filter(Boolean)
      .join(' ')
  }

  // 3. Normalize the nested 'recipe' object
  if (data.recipe && typeof data.recipe === 'object' && !Array.isArray(data.recipe)) {
    const recipe = { ...(data.recipe as Record<string, unknown>) }

    // Normalize ingredients if they are string[] or contains string items
    if (Array.isArray(recipe.ingredients)) {
      recipe.ingredients = recipe.ingredients.map((ing) => {
        if (typeof ing === 'string') {
          const trimmed = ing.trim()
          // Extract preparation notes in parentheses, e.g. "2 cloves garlic (minced)"
          const noteMatch = trimmed.match(/^(.*?)\s*\((.*?)\)$/)
          let nameToParse = trimmed
          let preparationNote: string | null = null

          if (noteMatch) {
            nameToParse = noteMatch[1].trim()
            preparationNote = noteMatch[2].trim() || null
          }

          const parsed = parseManualItem(nameToParse)
          return {
            name: parsed.name || trimmed,
            quantity: parsed.quantity,
            unit: parsed.unit,
            preparationNote,
            isOptional: false,
          }
        }
        return ing
      })
    }

    // Normalize instructions if they are string[] or contain string items
    if (Array.isArray(recipe.instructions)) {
      recipe.instructions = recipe.instructions.map((inst, idx) => {
        if (typeof inst === 'string') {
          return {
            stepNumber: idx + 1,
            instruction: inst.trim(),
            timerDuration: null,
          }
        }
        if (inst && typeof inst === 'object') {
          const instObj = inst as Record<string, unknown>
          return {
            ...instObj,
            stepNumber:
              typeof instObj.stepNumber === 'number' && instObj.stepNumber > 0
                ? instObj.stepNumber
                : idx + 1,
            instruction:
              typeof instObj.instruction === 'string'
                ? instObj.instruction
                : String(instObj.instruction || ''),
          }
        }
        return inst
      })
    }

    data.recipe = recipe
  }

  return data
}

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

    const candidateModels = resolveCandidateModels(ai.provider, ai.model)
    const aiDeadline = Date.now() + TOTAL_AI_BUDGET_MS

    let response = null
    let lastError: unknown = null

    for (let i = 0; i < candidateModels.length; i++) {
      const currentModel = candidateModels[i]
      const remainingBudget = aiDeadline - Date.now()

      if (remainingBudget < MIN_REMAINING_BUDGET_MS) {
        console.warn(
          `[Modification] Overall AI budget exhausted (${remainingBudget}ms remaining). Halting candidate failover.`
        )
        break
      }

      const isPrimary = i === 0
      const targetTimeout = isPrimary ? PRIMARY_TIMEOUT_MS : FALLBACK_TIMEOUT_MS
      const attemptTimeoutMs = Math.min(targetTimeout, remainingBudget)

      try {
        response = await ai.client.chat.completions.create(
          {
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
          },
          {
            timeout: attemptTimeoutMs,
            maxRetries: 0,
          }
        )
        break
      } catch (err: unknown) {
        lastError = err
        const isEligible = isTransientOrTimeoutError(err)
        const isLastModel = i === candidateModels.length - 1

        if (isEligible && !isLastModel) {
          const status =
            (err as { status?: number; statusCode?: number })?.status ??
            (err as { status?: number; statusCode?: number })?.statusCode
          const errorLabel = status ? `HTTP ${status}` : (err as Error)?.name || 'Timeout'
          console.warn(
            `[Modification] Model ${currentModel} encountered transient failure (${errorLabel}) within ${attemptTimeoutMs}ms attempt budget. Failing over to next candidate...`
          )
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

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(rawJson)
    } catch {
      return {
        error: 'Unable to validate the modified recipe format. Please try your request again.',
      }
    }

    const normalized = normalizeModifiedRecipeOutput(parsedJson)
    const validation = modifiedRecipeResultSchema.safeParse(normalized)

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
