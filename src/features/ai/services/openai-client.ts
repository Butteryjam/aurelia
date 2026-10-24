import 'server-only'
import OpenAI from 'openai'

export type AiProvider = 'gemini' | 'openai'

export interface AiClientConfig {
  provider: AiProvider
  client: OpenAI
  model: string
}

let cachedConfig: { key: string; config: AiClientConfig } | null = null

/**
 * Resolve the active AI provider configuration based on environment settings.
 * Supports Google Gemini (via official OpenAI-compatible endpoint) and OpenAI.
 */
export function getAiConfig(): AiClientConfig | null {
  const providerEnv = (process.env.AI_PROVIDER || '').toLowerCase().trim()
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
  const openaiKey = process.env.OPENAI_API_KEY?.trim()

  const isGeminiKeyValid = !!geminiKey && geminiKey !== '' && geminiKey !== 'your-gemini-api-key'
  const isOpenAiKeyValid = !!openaiKey && openaiKey !== '' && openaiKey !== 'your-openai-api-key'

  // Resolve active provider: explicit AI_PROVIDER, or fallback based on available keys
  let provider: AiProvider
  if (providerEnv === 'openai') {
    provider = 'openai'
  } else if (providerEnv === 'gemini') {
    provider = 'gemini'
  } else {
    // Default to gemini if gemini key is provided, else openai
    provider = isGeminiKeyValid ? 'gemini' : 'openai'
  }

  if (provider === 'gemini') {
    if (!isGeminiKeyValid) {
      return null
    }
    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash'
    const cacheKey = `gemini:${geminiKey}:${model}`
    if (cachedConfig?.key === cacheKey) {
      return cachedConfig.config
    }

    const client = new OpenAI({
      apiKey: geminiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      maxRetries: 0,
      timeout: 45000,
    })

    cachedConfig = {
      key: cacheKey,
      config: { provider: 'gemini', client, model },
    }
    return cachedConfig.config
  }

  if (provider === 'openai') {
    if (!isOpenAiKeyValid) {
      return null
    }
    const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
    const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined
    const cacheKey = `openai:${openaiKey}:${model}:${baseURL || ''}`
    if (cachedConfig?.key === cacheKey) {
      return cachedConfig.config
    }

    const client = new OpenAI({
      apiKey: openaiKey,
      baseURL,
      maxRetries: 0,
      timeout: 45000,
    })

    cachedConfig = {
      key: cacheKey,
      config: { provider: 'openai', client, model },
    }
    return cachedConfig.config
  }

  return null
}

/**
 * Returns an OpenAI-compatible client instance for the active provider.
 * Maintained for backward compatibility.
 */
export function getOpenAIClient(): OpenAI | null {
  return getAiConfig()?.client ?? null
}

/**
 * Returns the resolved model name for the active provider.
 */
export function getAiModel(): string {
  return getAiConfig()?.model ?? 'gemini-3.6-flash'
}

/**
 * Check if the active AI provider is configured with a valid key.
 */
export function isAiConfigured(): boolean {
  return getAiConfig() !== null
}

export const isOpenAIConfigured = isAiConfigured

export interface OpenRouterConfig {
  client: OpenAI
  model: string
}

let cachedOpenRouterConfig: { key: string; config: OpenRouterConfig } | null = null

export const DEFAULT_OPENROUTER_EXTRACTION_MODEL = 'openrouter/free'

/**
 * Strict safety guard: Only OpenRouter free models ('openrouter/free' or ending with ':free')
 * are permitted to guarantee zero spending.
 */
export function isOpenRouterFreeModel(modelId: string): boolean {
  if (!modelId || typeof modelId !== 'string') return false
  const trimmed = modelId.trim().toLowerCase()
  return trimmed === 'openrouter/free' || trimmed.endsWith(':free')
}

/**
 * Resets the cached OpenRouter configuration (primarily for unit tests).
 */
export function resetOpenRouterConfigForTesting(): void {
  cachedOpenRouterConfig = null
}

/**
 * Returns an OpenAI-compatible client configured for OpenRouter.
 * Uses https://openrouter.ai/api/v1 with server-only OPENROUTER_API_KEY.
 * Strictly enforces that only verified free models ('openrouter/free' or ':free') can be used.
 */
export function getOpenRouterConfig(): OpenRouterConfig | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey || apiKey === '' || apiKey === 'your-openrouter-api-key') {
    return null
  }

  const model =
    process.env.OPENROUTER_EXTRACTION_MODEL?.trim() ||
    DEFAULT_OPENROUTER_EXTRACTION_MODEL

  // Safety guard: reject non-free models to guarantee $0 spending
  if (!isOpenRouterFreeModel(model)) {
    console.warn(
      `[OpenRouter] Model "${model}" is not a verified free model. Aurelia is strictly configured for free models only. OpenRouter integration disabled.`
    )
    return null
  }

  const cacheKey = `${apiKey}:${model}`
  if (cachedOpenRouterConfig?.key === cacheKey) {
    return cachedOpenRouterConfig.config
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://aurelia-gamma-one.vercel.app',
      'X-Title': 'Aurelia Recipe Vault',
    },
    maxRetries: 0,
    timeout: 45000,
  })

  cachedOpenRouterConfig = {
    key: cacheKey,
    config: { client, model },
  }
  return cachedOpenRouterConfig.config
}

/**
 * Check if OpenRouter is configured with a valid key and a verified free model.
 */
export function isOpenRouterConfigured(): boolean {
  return getOpenRouterConfig() !== null
}

