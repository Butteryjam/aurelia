import 'server-only'
import { getAiConfig } from './openai-client'
import {
  RECIPE_EXTRACTION_SYSTEM_PROMPT,
  buildRecipeExtractionUserPrompt,
} from '../prompts/recipe-extraction'
import {
  IMAGE_RECIPE_EXTRACTION_SYSTEM_PROMPT,
  buildImageExtractionUserPrompt,
} from '../prompts/image-extraction'
import { extractedRecipeSchema } from '../schemas/recipe-extraction'
import {
  TOTAL_AI_BUDGET_MS,
  PRIMARY_TIMEOUT_MS,
  FALLBACK_TIMEOUT_MS,
  MIN_REMAINING_BUDGET_MS,
  isTransientOrTimeoutError,
  resolveCandidateModels,
} from './ai-resilience'
import { parseManualItem } from '@/lib/utils/shopping-consolidator'
import type { ExtractedRecipeData } from '../types'

/**
 * Normalizes raw LLM output into the shape expected by extractedRecipeSchema.
 * Handles string-based or non-standard instructions/ingredients across LLM candidates.
 */
export function normalizeExtractedRecipe(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return raw
  }

  const recipe = { ...(raw as Record<string, unknown>) }

  // 1. Ingredients normalization
  if (Array.isArray(recipe.ingredients)) {
    recipe.ingredients = recipe.ingredients.map((ing) => {
      if (typeof ing === 'string') {
        const trimmed = ing.trim()
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

      if (ing && typeof ing === 'object') {
        const ingObj = ing as Record<string, unknown>
        const name =
          typeof ingObj.name === 'string'
            ? ingObj.name
            : typeof ingObj.item === 'string'
            ? ingObj.item
            : typeof ingObj.ingredient === 'string'
            ? ingObj.ingredient
            : String(ingObj.name || ingObj.item || '')

        const quantity =
          ingObj.quantity !== undefined && ingObj.quantity !== null
            ? String(ingObj.quantity)
            : ingObj.amount !== undefined && ingObj.amount !== null
            ? String(ingObj.amount)
            : null

        const unit =
          typeof ingObj.unit === 'string'
            ? ingObj.unit
            : ingObj.unit !== undefined && ingObj.unit !== null
            ? String(ingObj.unit)
            : null

        const preparationNote =
          typeof ingObj.preparationNote === 'string'
            ? ingObj.preparationNote
            : typeof ingObj.note === 'string'
            ? ingObj.note
            : typeof ingObj.notes === 'string'
            ? ingObj.notes
            : null

        return {
          ...ingObj,
          name: name.trim() || 'Ingredient',
          quantity,
          unit,
          preparationNote,
          isOptional: Boolean(ingObj.isOptional),
        }
      }

      return ing
    })
  }

  // 2. Instructions normalization
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
        const stepNum =
          typeof instObj.stepNumber === 'number' && instObj.stepNumber > 0
            ? instObj.stepNumber
            : typeof instObj.step === 'number' && instObj.step > 0
            ? instObj.step
            : idx + 1

        const instructionText =
          typeof instObj.instruction === 'string' && instObj.instruction.trim().length > 0
            ? instObj.instruction.trim()
            : typeof instObj.text === 'string' && instObj.text.trim().length > 0
            ? instObj.text.trim()
            : typeof instObj.step === 'string' && instObj.step.trim().length > 0
            ? instObj.step.trim()
            : typeof instObj.description === 'string' && instObj.description.trim().length > 0
            ? instObj.description.trim()
            : typeof instObj.action === 'string' && instObj.action.trim().length > 0
            ? instObj.action.trim()
            : String(instObj.instruction || instObj.text || instObj.step || '').trim()

        return {
          ...instObj,
          stepNumber: stepNum,
          instruction: instructionText,
          timerDuration:
            typeof instObj.timerDuration === 'number'
              ? instObj.timerDuration
              : null,
        }
      }

      return inst
    })
  }

  // 3. Number fields normalization
  const toIntOrNull = (val: unknown) => {
    if (typeof val === 'number') return Number.isFinite(val) ? Math.round(val) : null
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }

  if (recipe.prepTime !== undefined) recipe.prepTime = toIntOrNull(recipe.prepTime)
  if (recipe.cookTime !== undefined) recipe.cookTime = toIntOrNull(recipe.cookTime)
  if (recipe.servings !== undefined) recipe.servings = toIntOrNull(recipe.servings)

  return recipe
}

/**
 * Extract structured recipe data from raw unstructured text.
 */
export async function extractRecipeFromText(rawText: string): Promise<{
  data?: ExtractedRecipeData
  error?: string
}> {
  const ai = getAiConfig()
  if (!ai) {
    return {
      error:
        'AI Chef is temporarily unavailable. Please configure your AI API key in your environment.',
    }
  }

  try {
    const candidateModels = resolveCandidateModels(ai.provider, ai.model)
    const aiDeadline = Date.now() + TOTAL_AI_BUDGET_MS

    let response = null
    let lastError: unknown = null

    for (let i = 0; i < candidateModels.length; i++) {
      const currentModel = candidateModels[i]
      const remainingBudget = aiDeadline - Date.now()

      if (remainingBudget < MIN_REMAINING_BUDGET_MS) {
        console.warn(
          `[Extraction] Overall AI budget exhausted (${remainingBudget}ms remaining). Halting candidate failover.`
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
              { role: 'system', content: RECIPE_EXTRACTION_SYSTEM_PROMPT },
              { role: 'user', content: buildRecipeExtractionUserPrompt(rawText) },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
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
            `[Extraction] Model ${currentModel} encountered transient failure (${errorLabel}) within ${attemptTimeoutMs}ms attempt budget. Failing over to next candidate...`
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
      return { error: 'The AI model returned an empty response. Please try again.' }
    }

    const parsedJson = JSON.parse(rawJson)
    const normalized = normalizeExtractedRecipe(parsedJson)
    const validation = extractedRecipeSchema.safeParse(normalized)

    if (!validation.success) {
      console.error('AI recipe validation failed:', validation.error.issues)
      return {
        error:
          'Could not fully interpret this recipe format. Please try adding more detail or check the text.',
      }
    }

    return { data: validation.data }
  } catch (error) {
    console.error('Error in extractRecipeFromText:', error)
    return {
      error: 'Unable to process this recipe at the moment. Your recipe collection is safe.',
    }
  }
}

/**
 * Extract structured recipe data from an uploaded image (photo, scan, handwriting).
 */
export async function extractRecipeFromImage(
  base64Data: string,
  mimeType: string = 'image/jpeg'
): Promise<{
  data?: ExtractedRecipeData
  error?: string
}> {
  const ai = getAiConfig()
  if (!ai) {
    return {
      error:
        'AI Chef is temporarily unavailable. Please configure your AI API key in your environment.',
    }
  }

  try {
    const imageUrl = base64Data.startsWith('data:')
      ? base64Data
      : `data:${mimeType};base64,${base64Data}`

    const candidateModels = resolveCandidateModels(ai.provider, ai.model)
    const aiDeadline = Date.now() + TOTAL_AI_BUDGET_MS

    let response = null
    let lastError: unknown = null

    for (let i = 0; i < candidateModels.length; i++) {
      const currentModel = candidateModels[i]
      const remainingBudget = aiDeadline - Date.now()

      if (remainingBudget < MIN_REMAINING_BUDGET_MS) {
        console.warn(
          `[Image Extraction] Overall AI budget exhausted (${remainingBudget}ms remaining). Halting candidate failover.`
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
              { role: 'system', content: IMAGE_RECIPE_EXTRACTION_SYSTEM_PROMPT },
              {
                role: 'user',
                content: [
                  { type: 'text', text: buildImageExtractionUserPrompt() },
                  {
                    type: 'image_url',
                    image_url: {
                      url: imageUrl,
                      detail: 'high',
                    },
                  },
                ],
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
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
            `[Image Extraction] Model ${currentModel} encountered transient failure (${errorLabel}) within ${attemptTimeoutMs}ms attempt budget. Failing over to next candidate...`
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
      return { error: 'The AI model returned an empty response from the image. Please try again.' }
    }

    const parsedJson = JSON.parse(rawJson)
    const normalized = normalizeExtractedRecipe(parsedJson)
    const validation = extractedRecipeSchema.safeParse(normalized)

    if (!validation.success) {
      console.error('AI image recipe validation failed:', validation.error.issues)
      return {
        error:
          'Could not clearly read recipe instructions or ingredients from this image. Please ensure good lighting and legible text.',
      }
    }

    return { data: validation.data }
  } catch (error) {
    console.error('Error in extractRecipeFromImage:', error)
    return {
      error: 'Unable to analyze this recipe image right now. Please try again or paste the text.',
    }
  }
}
