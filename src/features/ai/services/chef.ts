import 'server-only'
import { getAiConfig } from './openai-client'
import { AI_CHEF_SYSTEM_PROMPT, buildAiChefContextPrompt } from '../prompts/ai-chef'
import { retrieveRecipesForAi, getFocusedRecipeContext } from './retriever'
import {
  TOTAL_AI_BUDGET_MS,
  PRIMARY_TIMEOUT_MS,
  FALLBACK_TIMEOUT_MS,
  MIN_REMAINING_BUDGET_MS,
  GEMINI_STABLE_FALLBACK_MODELS,
  isTransientOrTimeoutError,
  resolveCandidateModels,
} from './ai-resilience'
import type { GroundedRecipeReference } from '../types'

interface ChefConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface GenerateChefResponseParams {
  userId: string
  recipeId?: string | null
  userMessage: string
  conversationHistory: ChefConversationMessage[]
}

export interface ChefResponseResult {
  content: string
  references: GroundedRecipeReference[]
  tokenCount?: number
}

/**
 * Generate a grounded conversational response from Aurelia's AI Chef.
 */
export async function generateChefResponse(
  params: GenerateChefResponseParams
): Promise<{ data?: ChefResponseResult; error?: string }> {
  const { userId, recipeId, userMessage, conversationHistory } = params

  const ai = getAiConfig()
  if (!ai) {
    return {
      error:
        'AI Chef is temporarily unavailable. Please ensure your AI API key is configured in your environment.',
    }
  }

  try {
    // 1. Resolve context: focused recipe vs. retrieved search recipes
    let focusedRecipe = null
    let retrievedRecipes: Array<{
      id: string
      title: string
      cuisine: string | null
      category: string | null
      cookTime: number | null
      difficulty: string | null
      ingredientSummary?: string
    }> = []
    let references: GroundedRecipeReference[] = []

    if (recipeId) {
      focusedRecipe = await getFocusedRecipeContext(recipeId, userId)
      if (focusedRecipe) {
        references = [focusedRecipe.reference]
      }
    } else {
      const retrieval = await retrieveRecipesForAi(userMessage, userId, 6)
      retrievedRecipes = retrieval.recipes
      references = retrieval.references
    }

    // 2. Build context prompt & merge into a single system instruction
    const contextPrompt = buildAiChefContextPrompt({
      focusedRecipe,
      retrievedRecipes,
    })

    const combinedSystemPrompt = contextPrompt
      ? `${AI_CHEF_SYSTEM_PROMPT}\n\n${contextPrompt}`
      : AI_CHEF_SYSTEM_PROMPT

    // 3. Assemble normalized message list strictly alternating user/assistant turns
    const normalizedHistory = normalizeConversationHistory(conversationHistory).slice(-8)
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: combinedSystemPrompt },
      ...normalizedHistory,
      { role: 'user', content: userMessage.trim() },
    ]

    // 4. Call AI model with per-model timeouts and shared overall request deadline (48s budget)
    let response = null
    let lastError: unknown = null
    const candidateModels = resolveCandidateModels(ai.provider, ai.model)
    const aiDeadline = Date.now() + TOTAL_AI_BUDGET_MS

    for (let i = 0; i < candidateModels.length; i++) {
      const currentModel = candidateModels[i]
      const remainingBudget = aiDeadline - Date.now()

      // Stop starting additional candidates once overall deadline budget is exhausted
      if (remainingBudget < MIN_REMAINING_BUDGET_MS) {
        console.warn(
          `[AI Chef] Overall AI budget exhausted (${remainingBudget}ms remaining). Halting candidate failover.`
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
            messages,
            temperature: 0.7,
            max_tokens: 3000,
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
            `[AI Chef] Model ${currentModel} encountered transient failure (${errorLabel}) within ${attemptTimeoutMs}ms attempt budget. Failing over to next candidate...`
          )
          continue
        }

        throw err
      }
    }

    if (!response) {
      throw lastError ?? new Error('No response from AI model.')
    }

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { error: 'Chef returned an empty response. Please try asking again.' }
    }

    // 5. Parse referenced recipe IDs from content
    const recipeIdMatches = content.match(/\[Recipe:\s*([a-f0-9-]{36})\]/gi) || []
    const referencedIds = new Set<string>()
    for (const match of recipeIdMatches) {
      const idMatch = match.match(/\[Recipe:\s*([a-f0-9-]{36})\]/i)
      if (idMatch && idMatch[1]) {
        referencedIds.add(idMatch[1].toLowerCase())
      }
    }

    // Filter references to include those explicitly mentioned in the response (or focused recipe)
    const activeReferences = references.filter(
      (r) => referencedIds.has(r.id.toLowerCase()) || (recipeId && r.id === recipeId)
    )

    return {
      data: {
        content,
        references: activeReferences,
        tokenCount: response.usage?.total_tokens,
      },
    }
  } catch (error) {
    console.error('Error in generateChefResponse:', error)
    return {
      error:
        'Chef is temporarily unavailable right now. Your recipes and conversations remain safe.',
    }
  }
}

/**
 * Clean and normalize conversation history to maintain strictly alternating turns
 * (user -> assistant -> user) and strip any orphaned trailing user messages.
 */
export function normalizeConversationHistory(
  history: ChefConversationMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const clean: Array<{ role: 'user' | 'assistant'; content: string }> = []

  for (const msg of history) {
    const role = msg.role === 'assistant' ? 'assistant' : msg.role === 'user' ? 'user' : null
    const content = typeof msg.content === 'string' ? msg.content.trim() : ''
    if (!role || !content) continue

    // If consecutive same role, combine them to preserve valid alternation
    if (clean.length > 0 && clean[clean.length - 1].role === role) {
      clean[clean.length - 1].content += `\n\n${content}`
    } else {
      clean.push({ role, content })
    }
  }

  // If the last message in history is a user message (e.g. from an orphaned prior failed turn),
  // pop it so the history ends on an assistant turn before adding the new userMessage
  if (clean.length > 0 && clean[clean.length - 1].role === 'user') {
    clean.pop()
  }

  return clean
}

// Re-export shared resilience primitives for backward compatibility
export {
  TOTAL_AI_BUDGET_MS,
  PRIMARY_TIMEOUT_MS,
  FALLBACK_TIMEOUT_MS,
  MIN_REMAINING_BUDGET_MS,
  GEMINI_STABLE_FALLBACK_MODELS,
  isTransientOrTimeoutError,
  resolveCandidateModels,
}

