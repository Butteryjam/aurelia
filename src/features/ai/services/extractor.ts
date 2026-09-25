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
import type { ExtractedRecipeData } from '../types'

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
    const validation = extractedRecipeSchema.safeParse(parsedJson)

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
    const validation = extractedRecipeSchema.safeParse(parsedJson)

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
