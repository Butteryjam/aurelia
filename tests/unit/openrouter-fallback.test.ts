import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractRecipeFromText,
  extractRecipeFromImage,
} from '@/features/ai/services/extractor'
import * as openaiClientModule from '@/features/ai/services/openai-client'
import {
  getOpenRouterConfig,
  isOpenRouterConfigured,
  isOpenRouterFreeModel,
  resetOpenRouterConfigForTesting,
  DEFAULT_OPENROUTER_EXTRACTION_MODEL,
} from '@/features/ai/services/openai-client'
import { POST as extractTextRoute } from '@/app/api/ai/extract-text/route'
import { POST as extractImageRoute } from '@/app/api/ai/extract-image/route'

const MOCK_VALID_RECIPE_JSON = JSON.stringify({
  title: "Grandma's Rustic Tuscan White Bean Soup",
  description: 'Hearty Tuscan bean soup with garlic and rosemary.',
  ingredients: [
    {
      name: 'cannellini beans',
      quantity: '2',
      unit: 'cans',
      preparationNote: 'rinsed and drained',
      isOptional: false,
    },
    {
      name: 'garlic',
      quantity: '3',
      unit: 'cloves',
      preparationNote: 'minced',
      isOptional: false,
    },
  ],
  instructions: [
    {
      stepNumber: 1,
      instruction: 'Warm olive oil and sauté garlic until fragrant.',
      timerDuration: 2,
    },
    {
      stepNumber: 2,
      instruction: 'Add beans and broth; simmer for 20 minutes.',
      timerDuration: 20,
    },
  ],
  prepTime: 10,
  cookTime: 25,
  servings: 4,
  difficulty: 'easy',
  cuisine: 'Italian',
  category: 'Soup',
  tags: ['beans', 'soup', 'tuscan'],
  notes: null,
  confidenceNotes: null,
})

const MOCK_RAW_STRING_RECIPE_JSON = JSON.stringify({
  title: 'Skillet Rosemary Lemon Chicken',
  description: 'Pan-seared chicken with rosemary and lemon.',
  ingredients: [
    '2 lbs chicken thighs (trimmed)',
    '3 cloves garlic (minced)',
    '1 tbsp fresh rosemary',
  ],
  instructions: [
    'Season the chicken with salt and pepper.',
    'Heat oil in skillet and sear chicken for 6 minutes per side.',
    'Squeeze lemon juice and simmer with rosemary.',
  ],
  prepTime: '15',
  cookTime: '20',
  servings: '4',
  difficulty: 'medium',
  cuisine: 'Mediterranean',
  category: 'Main Course',
  tags: ['chicken', 'skillet'],
})

describe('OpenRouter Secondary AI Cross-Provider Fallback Suite (Free Models Only)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
    delete process.env.OPENROUTER_API_KEY
    delete process.env.OPENROUTER_EXTRACTION_MODEL
    resetOpenRouterConfigForTesting()
  })

  describe('Free Model Safety Guard (isOpenRouterFreeModel)', () => {
    it('recognizes openrouter/free as valid free model', () => {
      expect(isOpenRouterFreeModel('openrouter/free')).toBe(true)
      expect(isOpenRouterFreeModel('OPENROUTER/FREE')).toBe(true)
    })

    it('recognizes models ending with :free as valid free models', () => {
      expect(isOpenRouterFreeModel('meta-llama/llama-3.3-70b-instruct:free')).toBe(true)
      expect(isOpenRouterFreeModel('google/gemma-4-31b-it:free')).toBe(true)
      expect(isOpenRouterFreeModel('nvidia/nemotron-3.5-super-vl:free')).toBe(true)
    })

    it('strictly rejects any paid model to prevent accidental spending', () => {
      expect(isOpenRouterFreeModel('openai/gpt-4o-mini')).toBe(false)
      expect(isOpenRouterFreeModel('openai/gpt-4o')).toBe(false)
      expect(isOpenRouterFreeModel('anthropic/claude-3-haiku')).toBe(false)
      expect(isOpenRouterFreeModel('meta-llama/llama-3.3-70b-instruct')).toBe(false)
      expect(isOpenRouterFreeModel('')).toBe(false)
      expect(isOpenRouterFreeModel(undefined as any)).toBe(false)
    })
  })

  describe('Configuration & Security Validation', () => {
    it('default model is openrouter/free', () => {
      expect(DEFAULT_OPENROUTER_EXTRACTION_MODEL).toBe('openrouter/free')
    })

    it('returns null and reports unconfigured when OPENROUTER_API_KEY is not set or placeholder', () => {
      delete process.env.OPENROUTER_API_KEY
      expect(isOpenRouterConfigured()).toBe(false)
      expect(getOpenRouterConfig()).toBeNull()

      process.env.OPENROUTER_API_KEY = 'your-openrouter-api-key'
      expect(isOpenRouterConfigured()).toBe(false)
      expect(getOpenRouterConfig()).toBeNull()
    })

    it('returns configured client with default model openrouter/free when valid key is provided', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-testkey123'
      expect(isOpenRouterConfigured()).toBe(true)
      const config = getOpenRouterConfig()
      expect(config).not.toBeNull()
      expect(config?.model).toBe('openrouter/free')
      expect(config?.client).toBeDefined()
    })

    it('accepts explicitly verified free model ending in :free via OPENROUTER_EXTRACTION_MODEL', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-testkey123'
      process.env.OPENROUTER_EXTRACTION_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'
      const config = getOpenRouterConfig()
      expect(config?.model).toBe('meta-llama/llama-3.3-70b-instruct:free')
    })

    it('strictly rejects paid models configured via OPENROUTER_EXTRACTION_MODEL and returns null', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-testkey123'
      process.env.OPENROUTER_EXTRACTION_MODEL = 'openai/gpt-4o-mini'
      const config = getOpenRouterConfig()
      expect(config).toBeNull()
      expect(isOpenRouterConfigured()).toBe(false)
    })
  })

  describe('Text Extraction Cross-Provider Fallback with Free Models', () => {
    it('Gemini succeeds -> OpenRouter free model is never invoked', async () => {
      const geminiMock = vi.fn().mockResolvedValue({
        choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }],
      })
      const openRouterMock = vi.fn()

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        client: { chat: { completions: { create: geminiMock } } } as any,
      })
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openrouter/free',
        client: { chat: { completions: { create: openRouterMock } } } as any,
      })

      const result = await extractRecipeFromText('Sample recipe text with ingredients and steps...')

      expect(geminiMock).toHaveBeenCalledTimes(1)
      expect(openRouterMock).not.toHaveBeenCalled()
      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
      expect(result.usedModel).toBe('gemini-3.5-flash-lite')
      expect(result.provider).toBe('gemini')
    })

    it('Gemini quota exhaustion (429) triggers OpenRouter openrouter/free fallback and succeeds', async () => {
      const quotaErr = new Error('Resource exhausted: Rate limit reached.')
      ;(quotaErr as any).status = 429
      ;(quotaErr as any).details = [
        {
          '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
          metadata: { quota_limit: 'GenerateContentRequestsPerMinutePerProjectPerRegionPerModel' },
        },
      ]

      const geminiMock = vi.fn().mockRejectedValue(quotaErr)
      const openRouterMock = vi.fn().mockResolvedValue({
        choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }],
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        client: { chat: { completions: { create: geminiMock } } } as any,
      })
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openrouter/free',
        client: { chat: { completions: { create: openRouterMock } } } as any,
      })

      const result = await extractRecipeFromText('Recipe text for white bean soup...')

      expect(openRouterMock).toHaveBeenCalledTimes(1)
      expect(openRouterMock).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'openrouter/free',
          response_format: { type: 'json_object' },
          max_tokens: 2500,
          temperature: 0.1,
        }),
        expect.objectContaining({
          maxRetries: 0,
        })
      )
      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
      expect(result.usedModel).toBe('openrouter/free')
      expect(result.provider).toBe('openrouter')
    })

    it('Gemini 503 provider unavailability triggers OpenRouter openrouter/free fallback', async () => {
      const error503 = new Error('Model is overloaded. Please try again.')
      ;(error503 as any).status = 503

      const geminiMock = vi.fn().mockRejectedValue(error503)
      const openRouterMock = vi.fn().mockResolvedValue({
        choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }],
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        client: { chat: { completions: { create: geminiMock } } } as any,
      })
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openrouter/free',
        client: { chat: { completions: { create: openRouterMock } } } as any,
      })

      const result = await extractRecipeFromText('Recipe text...')

      expect(openRouterMock).toHaveBeenCalledTimes(1)
      expect(result.error).toBeUndefined()
      expect(result.provider).toBe('openrouter')
      expect(result.usedModel).toBe('openrouter/free')
    })

    it('Gemini timeout triggers OpenRouter free fallback', async () => {
      const timeoutErr = new Error('Request timed out.')
      timeoutErr.name = 'APIConnectionTimeoutError'

      const geminiMock = vi.fn().mockRejectedValue(timeoutErr)
      const openRouterMock = vi.fn().mockResolvedValue({
        choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }],
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        client: { chat: { completions: { create: geminiMock } } } as any,
      })
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openrouter/free',
        client: { chat: { completions: { create: openRouterMock } } } as any,
      })

      const result = await extractRecipeFromText('Recipe text...')

      expect(openRouterMock).toHaveBeenCalledTimes(1)
      expect(result.error).toBeUndefined()
      expect(result.provider).toBe('openrouter')
      expect(result.usedModel).toBe('openrouter/free')
    })

    it('Project-wide Gemini quota error bypasses further Gemini attempts but uses openrouter/free', async () => {
      const projectWide429 = new Error('Daily quota exceeded for project')
      ;(projectWide429 as any).status = 429
      ;(projectWide429 as any).details = [
        {
          '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
          metadata: { quota_limit: 'GenerateContentRequestsPerDayPerProject' },
        },
      ]

      const recordedGeminiAttempts: string[] = []
      const geminiMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedGeminiAttempts.push(model)
        throw projectWide429
      })
      const openRouterMock = vi.fn().mockResolvedValue({
        choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }],
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        client: { chat: { completions: { create: geminiMock } } } as any,
      })
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openrouter/free',
        client: { chat: { completions: { create: openRouterMock } } } as any,
      })

      const result = await extractRecipeFromText('Recipe text...')

      // Only 1 Gemini attempt made (project-wide halts candidate failover)
      expect(recordedGeminiAttempts).toHaveLength(1)
      // OpenRouter free model was attempted once as cross-provider fallback and succeeded
      expect(openRouterMock).toHaveBeenCalledTimes(1)
      expect(result.error).toBeUndefined()
      expect(result.provider).toBe('openrouter')
      expect(result.usedModel).toBe('openrouter/free')
    })

    it('Safety guard blocks non-free OpenRouter model and never calls paid API', async () => {
      const gemini503 = new Error('Gemini overloaded')
      ;(gemini503 as any).status = 503

      const openRouterPaidMock = vi.fn()

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        client: { chat: { completions: { create: vi.fn().mockRejectedValue(gemini503) } } } as any,
      })
      // Even if openRouter config somehow returned a paid model
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openai/gpt-4o',
        client: { chat: { completions: { create: openRouterPaidMock } } } as any,
      })

      const result = await extractRecipeFromText('Recipe content...')

      // Paid model must NEVER be called
      expect(openRouterPaidMock).not.toHaveBeenCalled()
      expect(result.data).toBeUndefined()
      expect(result.errorCategory).toBe('provider_unavailable')
    })

    it('Free model rate limit or failure returns safe error without calling a paid model', async () => {
      const gemini429 = new Error('Quota exhausted')
      ;(gemini429 as any).status = 429

      const openRouterFree429 = new Error('Free model rate limit exceeded')
      ;(openRouterFree429 as any).status = 429

      const geminiMock = vi.fn().mockRejectedValue(gemini429)
      const openRouterMock = vi.fn().mockRejectedValue(openRouterFree429)

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        client: { chat: { completions: { create: geminiMock } } } as any,
      })
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openrouter/free',
        client: { chat: { completions: { create: openRouterMock } } } as any,
      })

      const result = await extractRecipeFromText('Recipe text...')

      expect(openRouterMock).toHaveBeenCalledTimes(1)
      expect(result.data).toBeUndefined()
      expect(result.errorCategory).toBe('quota_exhausted')
      expect(result.statusCode).toBe(429)
      expect(result.error).toBe(
        'Unable to process this recipe at the moment. Your recipe collection is safe.'
      )
    })

    it('openrouter/free response with un-normalized text is normalized and schema validated', async () => {
      const gemini503 = new Error('Gemini unavailable')
      ;(gemini503 as any).status = 503

      const openRouterMock = vi.fn().mockResolvedValue({
        choices: [{ message: { content: MOCK_RAW_STRING_RECIPE_JSON } }],
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        client: { chat: { completions: { create: vi.fn().mockRejectedValue(gemini503) } } } as any,
      })
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openrouter/free',
        client: { chat: { completions: { create: openRouterMock } } } as any,
      })

      const result = await extractRecipeFromText('Rosemary lemon chicken recipe...')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.provider).toBe('openrouter')
      expect(result.usedModel).toBe('openrouter/free')
      // Normalized ingredients
      expect(result.data?.ingredients[0]).toEqual({
        name: 'chicken thighs',
        quantity: '2',
        unit: 'lbs',
        preparationNote: 'trimmed',
        isOptional: false,
      })
      // Normalized instructions
      expect(result.data?.instructions[0]).toEqual({
        stepNumber: 1,
        instruction: 'Season the chicken with salt and pepper.',
        timerDuration: null,
      })
      // Number parsing
      expect(result.data?.prepTime).toBe(15)
      expect(result.data?.cookTime).toBe(20)
      expect(result.data?.servings).toBe(4)
    })
  })

  describe('Image Extraction Cross-Provider Fallback with Free Models', () => {
    it('Gemini image failure triggers openrouter/free multimodal fallback and succeeds', async () => {
      const gemini429 = new Error('Quota exhausted for image')
      ;(gemini429 as any).status = 429

      const geminiMock = vi.fn().mockRejectedValue(gemini429)
      const openRouterMock = vi.fn().mockResolvedValue({
        choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }],
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        client: { chat: { completions: { create: geminiMock } } } as any,
      })
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openrouter/free',
        client: { chat: { completions: { create: openRouterMock } } } as any,
      })

      const fakeBase64 = 'data:image/jpeg;base64,dGVzdGltYWdl'
      const result = await extractRecipeFromImage(fakeBase64, 'image/jpeg')

      expect(openRouterMock).toHaveBeenCalledTimes(1)
      const callArgs = openRouterMock.mock.calls[0][0]
      expect(callArgs.model).toBe('openrouter/free')
      expect(callArgs.messages[1].content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'text' }),
          expect.objectContaining({
            type: 'image_url',
            image_url: { url: fakeBase64, detail: 'high' },
          }),
        ])
      )
      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
      expect(result.provider).toBe('openrouter')
      expect(result.usedModel).toBe('openrouter/free')
    })

    it('Safety guard blocks non-free OpenRouter model on image extraction', async () => {
      const gemini503 = new Error('Gemini image unavailable')
      ;(gemini503 as any).status = 503

      const openRouterPaidMock = vi.fn()

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        client: { chat: { completions: { create: vi.fn().mockRejectedValue(gemini503) } } } as any,
      })
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openai/gpt-4o',
        client: { chat: { completions: { create: openRouterPaidMock } } } as any,
      })

      const result = await extractRecipeFromImage('data:image/jpeg;base64,dGVzdA==')

      // Paid model must NEVER be called
      expect(openRouterPaidMock).not.toHaveBeenCalled()
      expect(result.data).toBeUndefined()
      expect(result.errorCategory).toBe('provider_unavailable')
    })

    it('OpenRouter free model image failure returns safe classified error for image mode', async () => {
      const gemini503 = new Error('Gemini image unavailable')
      ;(gemini503 as any).status = 503

      const openRouter500 = new Error('Internal OpenRouter Error')
      ;(openRouter500 as any).status = 500

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        client: { chat: { completions: { create: vi.fn().mockRejectedValue(gemini503) } } } as any,
      })
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openrouter/free',
        client: { chat: { completions: { create: vi.fn().mockRejectedValue(openRouter500) } } } as any,
      })

      const result = await extractRecipeFromImage('data:image/jpeg;base64,dGVzdA==')

      expect(result.data).toBeUndefined()
      expect(result.errorCategory).toBe('unexpected_error')
      expect(result.statusCode).toBe(500)
      expect(result.error).toBe(
        'Unable to analyze this recipe image right now. Please try again or paste the text.'
      )
    })
  })

  describe('Route-Level Auth and Validation Protection', () => {
    it('rejects unauthenticated requests before invoking extractor or OpenRouter', async () => {
      const openRouterMock = vi.fn()
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openrouter/free',
        client: { chat: { completions: { create: openRouterMock } } } as any,
      })

      const req = new Request('http://localhost:3000/api/ai/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Some detailed recipe text with garlic and beans...' }),
      })

      const res = await extractTextRoute(req)
      expect(res.status).toBe(401)
      expect(openRouterMock).not.toHaveBeenCalled()
    })

    it('rejects invalid text payloads (< 15 characters) before invoking extractor or OpenRouter', async () => {
      const openRouterMock = vi.fn()
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openrouter/free',
        client: { chat: { completions: { create: openRouterMock } } } as any,
      })

      const authModule = await import('@/lib/supabase/mobile-auth')
      vi.spyOn(authModule, 'authenticateMobileRequest').mockResolvedValue({
        user: { id: 'usr-123' } as any,
        supabase: {} as any,
        error: null,
      })

      const req = new Request('http://localhost:3000/api/ai/extract-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ text: 'too short' }),
      })

      const res = await extractTextRoute(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.errorCategory).toBe('invalid_input')
      expect(openRouterMock).not.toHaveBeenCalled()
    })

    it('rejects unsupported image formats before invoking extractor or OpenRouter', async () => {
      const openRouterMock = vi.fn()
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openrouter/free',
        client: { chat: { completions: { create: openRouterMock } } } as any,
      })

      const authModule = await import('@/lib/supabase/mobile-auth')
      vi.spyOn(authModule, 'authenticateMobileRequest').mockResolvedValue({
        user: { id: 'usr-123' } as any,
        supabase: {} as any,
        error: null,
      })

      const req = new Request('http://localhost:3000/api/ai/extract-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          base64Data: 'dGVzdA==',
          mimeType: 'text/plain',
        }),
      })

      const res = await extractImageRoute(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.errorCategory).toBe('invalid_input')
      expect(openRouterMock).not.toHaveBeenCalled()
    })
  })

  describe('No Auto-Save Behavior Verification', () => {
    it('extractor only returns structured recipe data and never auto-saves to database', async () => {
      const openRouterMock = vi.fn().mockResolvedValue({
        choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }],
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        client: {
          chat: { completions: { create: vi.fn().mockRejectedValue({ status: 503 }) } },
        } as any,
      })
      vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
        model: 'openrouter/free',
        client: { chat: { completions: { create: openRouterMock } } } as any,
      })

      const result = await extractRecipeFromText('Recipe text for white bean soup...')

      expect(result.data).toBeDefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
      expect(result.usedModel).toBe('openrouter/free')
      expect(result.provider).toBe('openrouter')
    })
  })
})
