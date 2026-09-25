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
