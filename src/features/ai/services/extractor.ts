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
  isQuotaExhaustedError,
  detectQuotaScope,
  resolveExtractionCandidateModels,
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

export type ExtractionErrorCategory =
  | 'quota_exhausted'
  | 'provider_unavailable'
  | 'timeout'
  | 'invalid_input'
  | 'parsing_failure'
  | 'auth_failure'
  | 'unexpected_error'

export interface ExtractionResult<T = ExtractedRecipeData> {
  data?: T
  error?: string
  errorCategory?: ExtractionErrorCategory
  statusCode?: number
  retryAfterSeconds?: number
  usedModel?: string
}

/**
 * Safely extracts retry delay in seconds from provider HTTP response headers or RPC details.
 * Prevents immediate repeated retries on quota exhaustion (HTTP 429).
 */
export function extractRetryAfterSeconds(error: unknown): number {
  if (!error) return 60
  const err = error as Record<string, unknown>

  // 1. Check HTTP header from OpenAI SDK error or response
  const responseObj = err.response as Record<string, unknown> | undefined
  const headers = (err.headers || responseObj?.headers) as
    | { get?: (k: string) => string | null }
    | Record<string, string>
    | undefined

  if (headers) {
    let rawVal: string | null | undefined
    if ('get' in headers && typeof headers.get === 'function') {
      rawVal = headers.get('retry-after')
    } else {
      rawVal =
        (headers as Record<string, string>)['retry-after'] ||
        (headers as Record<string, string>)['Retry-After']
    }
    if (rawVal) {
      const parsed = parseInt(String(rawVal), 10)
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
  }

  // 2. Check Google RPC RetryInfo structure in error body
  try {
    const errorBody = Array.isArray(err.error)
      ? (err.error[0] as Record<string, unknown> | undefined)
      : (err.error as Record<string, unknown> | undefined)
    const rawError = (errorBody ?? err) as Record<string, unknown>
    const nestedError = (rawError.error ?? rawError) as Record<string, unknown>
    const details =
      nestedError.details ||
      rawError.details ||
      err.details ||
      (err.response as Record<string, unknown>)?.data

    const detailsList = Array.isArray(details)
      ? details
      : Array.isArray((details as Record<string, unknown>)?.details)
      ? ((details as Record<string, unknown>).details as Array<Record<string, unknown>>)
      : []

    const retryInfo = detailsList.find((d: unknown) => {
      const item = d as Record<string, unknown> | undefined
      return (
        typeof item?.['@type'] === 'string' &&
        item['@type'].includes('RetryInfo') &&
        typeof item.retryDelay === 'string'
      )
    }) as { retryDelay?: string } | undefined

    if (retryInfo?.retryDelay) {
      const parsed = Math.ceil(parseFloat(retryInfo.retryDelay.replace(/s$/i, '')))
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
  } catch {
    // fallback
  }

  // 3. Check error message for patterns like "retry in 15h43m" or "retry in 60s"
  const fullMessage = (
    String(err.message || '') +
    ' ' +
    String((err.error as Record<string, unknown>)?.message || '')
  )

  const secMatch = fullMessage.match(/retry in\s+(\d+(?:\.\d+)?)\s*s/i)
  if (secMatch) {
    const s = Math.ceil(parseFloat(secMatch[1]))
    if (!isNaN(s) && s > 0) return s
  }

  return 60
}

/**
 * Classifies server-side extraction errors into safe diagnostic categories.
 * Never logs or exposes API keys, tokens, or raw user images.
 */
export function classifyExtractionException(
  error: unknown,
  mode: 'text' | 'image' = 'text'
): {
  error: string
  errorCategory: ExtractionErrorCategory
  statusCode: number
  retryAfterSeconds?: number
} {
  const err = error as {
    status?: number
    statusCode?: number
    name?: string
    message?: string
    code?: string | number
  }

  const status = err?.status ?? err?.statusCode
  const message = (err?.message || '').toLowerCase()
  const name = err?.name || ''
  const code = String(err?.code || '')

  const defaultErrorMessage =
    mode === 'image'
      ? 'Unable to analyze this recipe image right now. Please try again or paste the text.'
      : 'Unable to process this recipe at the moment. Your recipe collection is safe.'

  // 1. Quota / Rate limit (HTTP 429, RESOURCE_EXHAUSTED)
  if (
    isQuotaExhaustedError(error) ||
    status === 429 ||
    message.includes('quota') ||
    message.includes('resource_exhausted') ||
    message.includes('rate limit')
  ) {
    const retryAfterSeconds = extractRetryAfterSeconds(error)
    console.warn(
      `[${mode === 'image' ? 'Image ' : ''}Extraction] Safe error category: quota_exhausted (HTTP 429, retry-after: ${retryAfterSeconds}s)`
    )
    return {
      error: defaultErrorMessage,
      errorCategory: 'quota_exhausted',
      statusCode: 429,
      retryAfterSeconds,
    }
  }

  // 2. Timeout (HTTP 408, 504, client connection timeouts)
  if (
    status === 408 ||
    status === 504 ||
    name === 'APIConnectionTimeoutError' ||
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    code === 'ETIMEDOUT' ||
    code === 'ESOCKETTIMEDOUT' ||
    message.includes('timeout') ||
    message.includes('timed out')
  ) {
    console.warn(`[${mode === 'image' ? 'Image ' : ''}Extraction] Safe error category: timeout`)
    return {
      error: defaultErrorMessage,
      errorCategory: 'timeout',
      statusCode: 504,
    }
  }

  // 3. Provider Unavailability (HTTP 503, 502, high demand, UNAVAILABLE)
  if (
    status === 503 ||
    status === 502 ||
    message.includes('high demand') ||
    message.includes('unavailable') ||
    message.includes('bad gateway')
  ) {
    console.warn(`[${mode === 'image' ? 'Image ' : ''}Extraction] Safe error category: provider_unavailable`)
    return {
      error: defaultErrorMessage,
      errorCategory: 'provider_unavailable',
      statusCode: 503,
    }
  }

  // 4. Invalid input / image payload issues (HTTP 400)
  if (
    status === 400 ||
    message.includes('invalid') ||
    message.includes('unsupported image') ||
    message.includes('corrupt')
  ) {
    console.warn(`[${mode === 'image' ? 'Image ' : ''}Extraction] Safe error category: invalid_input (HTTP 400)`)
    return {
      error: defaultErrorMessage,
      errorCategory: 'invalid_input',
      statusCode: 400,
    }
  }

  // 5. Default Unexpected Server Error (HTTP 500)
  console.error(`[${mode === 'image' ? 'Image ' : ''}Extraction] Safe error category: unexpected_error`)
  return {
    error: defaultErrorMessage,
    errorCategory: 'unexpected_error',
    statusCode: 500,
  }
}

/**
 * Extract structured recipe data from raw unstructured text.
 */
export async function extractRecipeFromText(rawText: string): Promise<ExtractionResult> {
  const ai = getAiConfig()
  if (!ai) {
    return {
      error:
        'AI service is temporarily unavailable. Please configure your AI API key in your environment.',
      errorCategory: 'provider_unavailable',
      statusCode: 503,
    }
  }

  try {
    const candidateModels = resolveExtractionCandidateModels(ai.provider, ai.model)
    const aiDeadline = Date.now() + TOTAL_AI_BUDGET_MS

    let response = null
    let lastError: unknown = null
    let usedModel: string | undefined = undefined
    let quotaRetriesUsed = 0

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
        usedModel = currentModel
        console.log(`[Extraction] Recipe extracted successfully using model: ${currentModel}`)
        break
      } catch (err: unknown) {
        lastError = err
        const isEligible = isTransientOrTimeoutError(err)
        const isLastModel = i === candidateModels.length - 1

        if (isEligible && !isLastModel) {
          const isQuota = isQuotaExhaustedError(err)

          if (isQuota) {
            const quotaScope = detectQuotaScope(err, currentModel)

            if (quotaScope === 'project_wide') {
              console.warn(
                `[Extraction] Model ${currentModel} encountered project-wide quota exhaustion. Halting candidate failover to prevent wasted requests.`
              )
              throw err
            }

            if (quotaRetriesUsed >= 1) {
              console.warn(
                `[Extraction] Model ${currentModel} encountered quota exhaustion and 1 quota failover was already used. Halting further quota retries.`
              )
              throw err
            }

            quotaRetriesUsed++
            const nextModel = candidateModels[i + 1]
            console.warn(
              `[Extraction] Model ${currentModel} encountered model-specific quota exhaustion (HTTP 429). Attempting next eligible model (${nextModel}) at most once...`
            )
            continue
          }

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
      console.warn('[Extraction] Safe error category: parsing_failure (empty response)')
      return {
        error: 'The AI model returned an empty response. Please try again.',
        errorCategory: 'parsing_failure',
        statusCode: 422,
      }
    }

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(rawJson)
    } catch {
      console.warn('[Extraction] Safe error category: parsing_failure (malformed JSON)')
      return {
        error: 'Could not interpret the recipe format returned by the AI service. Please try again.',
        errorCategory: 'parsing_failure',
        statusCode: 422,
      }
    }

    const normalized = normalizeExtractedRecipe(parsedJson)
    const validation = extractedRecipeSchema.safeParse(normalized)

    if (!validation.success) {
      console.warn('[Extraction] Safe error category: parsing_failure (schema mismatch)')
      return {
        error:
          'Could not fully interpret this recipe format. Please try adding more detail or check the text.',
        errorCategory: 'parsing_failure',
        statusCode: 422,
      }
    }

    return { data: validation.data, usedModel }
  } catch (error) {
    return classifyExtractionException(error, 'text')
  }
}

/**
 * Extract structured recipe data from an uploaded image (photo, scan, handwriting).
 */
export async function extractRecipeFromImage(
  base64Data: string,
  mimeType: string = 'image/jpeg'
): Promise<ExtractionResult> {
  const ai = getAiConfig()
  if (!ai) {
    return {
      error:
        'AI service is temporarily unavailable. Please configure your AI API key in your environment.',
      errorCategory: 'provider_unavailable',
      statusCode: 503,
    }
  }

  try {
    const imageUrl = base64Data.startsWith('data:')
      ? base64Data
      : `data:${mimeType};base64,${base64Data}`

    const candidateModels = resolveExtractionCandidateModels(ai.provider, ai.model)
    const aiDeadline = Date.now() + TOTAL_AI_BUDGET_MS

    let response = null
    let lastError: unknown = null
    let usedModel: string | undefined = undefined
    let quotaRetriesUsed = 0

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
        usedModel = currentModel
        console.log(`[Image Extraction] Recipe image extracted successfully using model: ${currentModel}`)
        break
      } catch (err: unknown) {
        lastError = err
        const isEligible = isTransientOrTimeoutError(err)
        const isLastModel = i === candidateModels.length - 1

        if (isEligible && !isLastModel) {
          const isQuota = isQuotaExhaustedError(err)

          if (isQuota) {
            const quotaScope = detectQuotaScope(err, currentModel)

            if (quotaScope === 'project_wide') {
              console.warn(
                `[Image Extraction] Model ${currentModel} encountered project-wide quota exhaustion. Halting candidate failover to prevent wasted requests.`
              )
              throw err
            }

            if (quotaRetriesUsed >= 1) {
              console.warn(
                `[Image Extraction] Model ${currentModel} encountered quota exhaustion and 1 quota failover was already used. Halting further quota retries.`
              )
              throw err
            }

            quotaRetriesUsed++
            const nextModel = candidateModels[i + 1]
            console.warn(
              `[Image Extraction] Model ${currentModel} encountered model-specific quota exhaustion (HTTP 429). Attempting next eligible model (${nextModel}) at most once...`
            )
            continue
          }

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
      console.warn('[Image Extraction] Safe error category: parsing_failure (empty response)')
      return {
        error: 'The AI model returned an empty response from the image. Please try again.',
        errorCategory: 'parsing_failure',
        statusCode: 422,
      }
    }

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(rawJson)
    } catch {
      console.warn('[Image Extraction] Safe error category: parsing_failure (malformed JSON)')
      return {
        error: 'Could not interpret the recipe format returned by the AI service. Please try again.',
        errorCategory: 'parsing_failure',
        statusCode: 422,
      }
    }

    const normalized = normalizeExtractedRecipe(parsedJson)
    const validation = extractedRecipeSchema.safeParse(normalized)

    if (!validation.success) {
      console.warn('[Image Extraction] Safe error category: parsing_failure (schema mismatch)')
      return {
        error:
          'Could not clearly read recipe instructions or ingredients from this image. Please ensure good lighting and legible text.',
        errorCategory: 'parsing_failure',
        statusCode: 422,
      }
    }

    return { data: validation.data, usedModel }
  } catch (error) {
    return classifyExtractionException(error, 'image')
  }
}
