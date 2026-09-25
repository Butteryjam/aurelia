import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractRecipeFromText,
  extractRecipeFromImage,
} from '@/features/ai/services/extractor'
import {
  TOTAL_AI_BUDGET_MS,
  PRIMARY_TIMEOUT_MS,
  FALLBACK_TIMEOUT_MS,
  MIN_REMAINING_BUDGET_MS,
  GEMINI_STABLE_FALLBACK_MODELS,
  isTransientOrTimeoutError,
  resolveCandidateModels,
} from '@/features/ai/services/ai-resilience'
import * as chefModule from '@/features/ai/services/chef'
import * as openaiClientModule from '@/features/ai/services/openai-client'

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

describe('Recipe Extractor AI Resilience & Failover Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe('Shared AI Resilience Module Integrity', () => {
    it('shares resilience constants and functions identically between ai-resilience and chef re-exports', () => {
      expect(chefModule.TOTAL_AI_BUDGET_MS).toBe(TOTAL_AI_BUDGET_MS)
      expect(chefModule.PRIMARY_TIMEOUT_MS).toBe(PRIMARY_TIMEOUT_MS)
      expect(chefModule.FALLBACK_TIMEOUT_MS).toBe(FALLBACK_TIMEOUT_MS)
      expect(chefModule.MIN_REMAINING_BUDGET_MS).toBe(MIN_REMAINING_BUDGET_MS)
      expect(chefModule.GEMINI_STABLE_FALLBACK_MODELS).toEqual(GEMINI_STABLE_FALLBACK_MODELS)
      expect(chefModule.isTransientOrTimeoutError).toBe(isTransientOrTimeoutError)
      expect(chefModule.resolveCandidateModels).toBe(resolveCandidateModels)
    })

    it('resolves candidate models with gemini-3.5-flash as bounded fallback', () => {
      const candidates = resolveCandidateModels('gemini', 'gemini-3.6-flash')
      expect(candidates).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash'])
      expect(candidates).toHaveLength(2)
    })

    it('does not duplicate fallback if primary is already gemini-3.5-flash', () => {
      const candidates = resolveCandidateModels('gemini', 'gemini-3.5-flash')
      expect(candidates).toEqual(['gemini-3.5-flash'])
      expect(candidates).toHaveLength(1)
    })

    it('returns only the primary model for non-gemini providers', () => {
      expect(resolveCandidateModels('openai', 'gpt-4o-mini')).toEqual(['gpt-4o-mini'])
    })
  })

  describe('Text Extraction Resilience (extractRecipeFromText)', () => {
    it('primary timeout (24s budget) -> gemini-3.5-flash fallback (20s budget) succeeds', async () => {
      const recordedAttempts: Array<{ model: string; options: any }> = []
      const createMock = vi.fn().mockImplementation(async ({ model }, options) => {
        recordedAttempts.push({ model, options })
        if (model === 'gemini-3.6-flash') {
          const timeoutErr = new Error('Request timed out.')
          timeoutErr.name = 'APIConnectionTimeoutError'
          throw timeoutErr
        }

        return {
          choices: [
            {
              message: {
                content: MOCK_VALID_RECIPE_JSON,
              },
            },
          ],
        }
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: createMock,
            },
          },
        } as any,
      })

      const result = await extractRecipeFromText('Sample raw recipe text for Tuscan soup...')

      expect(recordedAttempts).toHaveLength(2)
      // Primary attempt
      expect(recordedAttempts[0].model).toBe('gemini-3.6-flash')
      expect(recordedAttempts[0].options.timeout).toBe(PRIMARY_TIMEOUT_MS)
      expect(recordedAttempts[0].options.maxRetries).toBe(0)

      // Fallback attempt
      expect(recordedAttempts[1].model).toBe('gemini-3.5-flash')
      expect(recordedAttempts[1].options.timeout).toBe(FALLBACK_TIMEOUT_MS)
      expect(recordedAttempts[1].options.maxRetries).toBe(0)

      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
      expect(result.data?.ingredients).toHaveLength(2)
      expect(result.data?.instructions).toHaveLength(2)
    })

    it('primary 503 -> fallback to gemini-3.5-flash succeeds', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        if (model === 'gemini-3.6-flash') {
          const error503 = new Error('High demand on model.')
          ;(error503 as any).status = 503
          throw error503
        }

        return {
          choices: [
            {
              message: {
                content: MOCK_VALID_RECIPE_JSON,
              },
            },
          ],
        }
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: createMock,
            },
          },
        } as any,
      })

      const result = await extractRecipeFromText('Sample raw recipe text...')

      expect(recordedAttempts).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash'])
      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
    })

    it('primary 429 -> fallback to gemini-3.5-flash succeeds', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        if (model === 'gemini-3.6-flash') {
          const error429 = new Error('Rate limit exceeded on model.')
          ;(error429 as any).status = 429
          throw error429
        }

        return {
          choices: [
            {
              message: {
                content: MOCK_VALID_RECIPE_JSON,
              },
            },
          ],
        }
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: createMock,
            },
          },
        } as any,
      })

      const result = await extractRecipeFromText('Sample raw recipe text...')

      expect(recordedAttempts).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash'])
      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
    })

    it('primary permanent 4xx (e.g. 400 invalid request) -> no fallback attempted', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        const error400 = new Error('Bad request: malformed input')
        ;(error400 as any).status = 400
        throw error400
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: createMock,
            },
          },
        } as any,
      })

      const result = await extractRecipeFromText('Sample raw recipe text...')

      expect(recordedAttempts).toEqual(['gemini-3.6-flash'])
      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Unable to process this recipe at the moment. Your recipe collection is safe.')
    })

    it('fallback timeout -> returns safe final error message', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        const timeoutErr = new Error('Request timed out.')
        timeoutErr.name = 'APIConnectionTimeoutError'
        throw timeoutErr
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: createMock,
            },
          },
        } as any,
      })

      const result = await extractRecipeFromText('Sample raw recipe text...')

      expect(recordedAttempts).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash'])
      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Unable to process this recipe at the moment. Your recipe collection is safe.')
    })

    it('total budget exhaustion prevents secondary candidate attempts', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        // Advance clock to consume overall deadline budget
        vi.advanceTimersByTime(TOTAL_AI_BUDGET_MS - 2000)
        const error503 = new Error('Service Unavailable')
        ;(error503 as any).status = 503
        throw error503
      })

      vi.useFakeTimers()

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: createMock,
            },
          },
        } as any,
      })

      const extractionPromise = extractRecipeFromText('Sample raw recipe text...')
      await vi.runAllTimersAsync()
      const result = await extractionPromise

      vi.useRealTimers()

      // Primary was attempted, but budget was exhausted (< 5000ms remaining), so secondary was halted
      expect(recordedAttempts).toEqual(['gemini-3.6-flash'])
      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Unable to process this recipe at the moment. Your recipe collection is safe.')
    })

    it('successful extraction passes Zod validation with complete schema fields', async () => {
      const createMock = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: MOCK_VALID_RECIPE_JSON,
            },
          },
        ],
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: createMock,
            },
          },
        } as any,
      })

      const result = await extractRecipeFromText('Grandma Tuscan soup ingredients...')

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
      expect(result.data?.difficulty).toBe('easy')
      expect(result.data?.cuisine).toBe('Italian')
      expect(result.data?.servings).toBe(4)
      expect(result.data?.prepTime).toBe(10)
      expect(result.data?.cookTime).toBe(25)
    })
  })

  describe('Image Extraction Resilience (extractRecipeFromImage)', () => {
    it('primary timeout (24s budget) -> gemini-3.5-flash fallback (20s budget) succeeds', async () => {
      const recordedAttempts: Array<{ model: string; options: any }> = []
      const createMock = vi.fn().mockImplementation(async ({ model }, options) => {
        recordedAttempts.push({ model, options })
        if (model === 'gemini-3.6-flash') {
          const timeoutErr = new Error('Connection timed out.')
          timeoutErr.name = 'APIConnectionTimeoutError'
          throw timeoutErr
        }

        return {
          choices: [
            {
              message: {
                content: MOCK_VALID_RECIPE_JSON,
              },
            },
          ],
        }
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: createMock,
            },
          },
        } as any,
      })

      const result = await extractRecipeFromImage('data:image/jpeg;base64,ZmFrZWltYWdlZGF0YQ==')

      expect(recordedAttempts).toHaveLength(2)
      expect(recordedAttempts[0].model).toBe('gemini-3.6-flash')
      expect(recordedAttempts[0].options.timeout).toBe(PRIMARY_TIMEOUT_MS)
      expect(recordedAttempts[0].options.maxRetries).toBe(0)

      expect(recordedAttempts[1].model).toBe('gemini-3.5-flash')
      expect(recordedAttempts[1].options.timeout).toBe(FALLBACK_TIMEOUT_MS)
      expect(recordedAttempts[1].options.maxRetries).toBe(0)

      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
    })

    it('primary 503 -> fallback to gemini-3.5-flash succeeds for image', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        if (model === 'gemini-3.6-flash') {
          const error503 = new Error('503 high demand')
          ;(error503 as any).status = 503
          throw error503
        }

        return {
          choices: [
            {
              message: {
                content: MOCK_VALID_RECIPE_JSON,
              },
            },
          ],
        }
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: createMock,
            },
          },
        } as any,
      })

      const result = await extractRecipeFromImage('data:image/jpeg;base64,ZmFrZWltYWdlZGF0YQ==')

      expect(recordedAttempts).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash'])
      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
    })

    it('primary 429 -> fallback to gemini-3.5-flash succeeds for image', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        if (model === 'gemini-3.6-flash') {
          const error429 = new Error('Rate limit exceeded')
          ;(error429 as any).status = 429
          throw error429
        }

        return {
          choices: [
            {
              message: {
                content: MOCK_VALID_RECIPE_JSON,
              },
            },
          ],
        }
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: createMock,
            },
          },
        } as any,
      })

      const result = await extractRecipeFromImage('data:image/jpeg;base64,ZmFrZWltYWdlZGF0YQ==')

      expect(recordedAttempts).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash'])
      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
    })

    it('primary permanent 4xx -> no fallback attempted for image', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        const error401 = new Error('Unauthorized')
        ;(error401 as any).status = 401
        throw error401
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: createMock,
            },
          },
        } as any,
      })

      const result = await extractRecipeFromImage('data:image/jpeg;base64,ZmFrZWltYWdlZGF0YQ==')

      expect(recordedAttempts).toEqual(['gemini-3.6-flash'])
      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Unable to analyze this recipe image right now. Please try again or paste the text.')
    })

    it('fallback timeout on image -> returns safe final error message', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        const timeoutErr = new Error('Request timed out.')
        timeoutErr.name = 'APIConnectionTimeoutError'
        throw timeoutErr
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: createMock,
            },
          },
        } as any,
      })

      const result = await extractRecipeFromImage('data:image/jpeg;base64,ZmFrZWltYWdlZGF0YQ==')

      expect(recordedAttempts).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash'])
      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Unable to analyze this recipe image right now. Please try again or paste the text.')
    })

    it('total budget exhaustion on image prevents secondary candidate attempts', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        vi.advanceTimersByTime(TOTAL_AI_BUDGET_MS - 2000)
        const error503 = new Error('Service Unavailable')
        ;(error503 as any).status = 503
        throw error503
      })

      vi.useFakeTimers()

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: createMock,
            },
          },
        } as any,
      })

      const imagePromise = extractRecipeFromImage('data:image/jpeg;base64,ZmFrZWltYWdlZGF0YQ==')
      await vi.runAllTimersAsync()
      const result = await imagePromise

      vi.useRealTimers()

      expect(recordedAttempts).toEqual(['gemini-3.6-flash'])
      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Unable to analyze this recipe image right now. Please try again or paste the text.')
    })
  })
})
