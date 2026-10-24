import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractRecipeFromText,
  extractRecipeFromImage,
  extractRetryAfterSeconds,
  classifyExtractionException,
} from '@/features/ai/services/extractor'
import {
  TOTAL_AI_BUDGET_MS,
  PRIMARY_TIMEOUT_MS,
  FALLBACK_TIMEOUT_MS,
  MIN_REMAINING_BUDGET_MS,
  GEMINI_STABLE_FALLBACK_MODELS,
  GEMINI_EXTRACTION_FALLBACK_MODELS,
  isTransientOrTimeoutError,
  isQuotaExhaustedError,
  detectQuotaScope,
  resolveCandidateModels,
  resolveExtractionCandidateModels,
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
    delete process.env.GEMINI_EXTRACTION_MODEL
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

    it('resolves candidate models with gemini-3.5-flash as bounded fallback for Chef and Modifier', () => {
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

  describe('Recipe Extraction Candidate Models Resolution', () => {
    it('resolves extraction candidate models including gemini-3.5-flash-lite as first fallback when GEMINI_EXTRACTION_MODEL is not set', () => {
      const candidates = resolveExtractionCandidateModels('gemini', 'gemini-3.6-flash')
      expect(candidates).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-flash'])
    })

    it('prioritizes gemini-3.5-flash-lite as primary when configured via GEMINI_EXTRACTION_MODEL', () => {
      process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
      const candidates = resolveExtractionCandidateModels('gemini', 'gemini-3.6-flash')
      expect(candidates).toEqual(['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash'])
    })

    it('returns single primary model for non-gemini providers', () => {
      expect(resolveExtractionCandidateModels('openai', 'gpt-4o-mini')).toEqual(['gpt-4o-mini'])
    })
  })

  describe('extractRetryAfterSeconds & Quota Handling', () => {
    it('extracts retry delay from HTTP Retry-After header', () => {
      const errorWithHeader = {
        status: 429,
        headers: new Headers({ 'retry-after': '45' }),
      }
      expect(extractRetryAfterSeconds(errorWithHeader)).toBe(45)
    })

    it('extracts retry delay from Google RPC RetryInfo structure', () => {
      const errorWithRpc = {
        status: 429,
        error: [
          {
            error: {
              code: 429,
              details: [
                {
                  '@type': 'type.googleapis.com/google.rpc.RetryInfo',
                  retryDelay: '56589s',
                },
              ],
            },
          },
        ],
      }
      expect(extractRetryAfterSeconds(errorWithRpc)).toBe(56589)
    })

    it('extracts retry delay from error message regex', () => {
      const errorWithMsg = {
        status: 429,
        message: 'Rate limit exceeded. Please retry in 120s.',
      }
      expect(extractRetryAfterSeconds(errorWithMsg)).toBe(120)
    })

    it('falls back to 60s when no delay information is available', () => {
      const errorWithoutDelay = { status: 429, message: 'Resource exhausted' }
      expect(extractRetryAfterSeconds(errorWithoutDelay)).toBe(60)
    })

    it('classifies 429 with parsed retryAfterSeconds without immediate retries', () => {
      const result = classifyExtractionException({
        status: 429,
        message: 'Resource exhausted. Please retry in 90s.',
      }, 'text')
      expect(result.statusCode).toBe(429)
      expect(result.errorCategory).toBe('quota_exhausted')
      expect(result.retryAfterSeconds).toBe(90)
    })
  })

  describe('Text Extraction Resilience (extractRecipeFromText)', () => {
    it('primary timeout (24s budget) -> gemini-3.5-flash-lite fallback (20s budget) succeeds', async () => {
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

      // Fallback attempt (gemini-3.5-flash-lite)
      expect(recordedAttempts[1].model).toBe('gemini-3.5-flash-lite')
      expect(recordedAttempts[1].options.timeout).toBe(FALLBACK_TIMEOUT_MS)
      expect(recordedAttempts[1].options.maxRetries).toBe(0)

      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
      expect(result.data?.ingredients).toHaveLength(2)
      expect(result.data?.instructions).toHaveLength(2)
    })

    it('primary 503 -> fallback to gemini-3.5-flash-lite succeeds', async () => {
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

      expect(recordedAttempts).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash-lite'])
      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
    })

    it('primary 429 -> fallback to gemini-3.5-flash-lite succeeds', async () => {
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

      expect(recordedAttempts).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash-lite'])
      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
    })

    it('configured GEMINI_EXTRACTION_MODEL=gemini-3.5-flash-lite succeeds directly on first attempt', async () => {
      process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
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

      expect(recordedAttempts).toEqual(['gemini-3.5-flash-lite'])
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

      // When all candidates fail, all candidates are attempted within budget
      expect(recordedAttempts).toEqual([
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
      ])
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
    it('primary timeout (24s budget) -> gemini-3.5-flash-lite fallback (20s budget) succeeds for image', async () => {
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

      expect(recordedAttempts[1].model).toBe('gemini-3.5-flash-lite')
      expect(recordedAttempts[1].options.timeout).toBe(FALLBACK_TIMEOUT_MS)
      expect(recordedAttempts[1].options.maxRetries).toBe(0)

      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
    })

    it('primary 503 -> fallback to gemini-3.5-flash-lite succeeds for image', async () => {
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

      expect(recordedAttempts).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash-lite'])
      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
    })

    it('primary 429 -> fallback to gemini-3.5-flash-lite succeeds for image', async () => {
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

      expect(recordedAttempts).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash-lite'])
      expect(result.error).toBeUndefined()
      expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
    })

    it('configured GEMINI_EXTRACTION_MODEL=gemini-3.5-flash-lite succeeds directly on first attempt for image', async () => {
      process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
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

      expect(recordedAttempts).toEqual(['gemini-3.5-flash-lite'])
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

      // When all candidates fail, all candidates are attempted within budget
      expect(recordedAttempts).toEqual([
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
      ])
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

  describe('Fine-Grained Quota Scope & Model-Specific vs Project-Wide Fallback Suite', () => {
    describe('detectQuotaScope and error categorization', () => {
      it('identifies model-specific quota via ErrorInfo metadata.quota_limit containing PerModel', () => {
        const error = {
          status: 429,
          details: [
            {
              '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
              metadata: {
                quota_limit: 'GenerateContentRequestsPerMinutePerProjectPerRegionPerModel',
                quota_metric:
                  'generativelanguage.googleapis.com/generate_content_requests_per_minute_per_region_per_model',
              },
            },
          ],
        }
        expect(detectQuotaScope(error, 'gemini-3.5-flash-lite')).toBe('model_specific')
      })

      it('identifies model-specific quota via QuotaFailure violations with models/ prefix', () => {
        const error = {
          status: 429,
          error: {
            details: [
              {
                '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
                violations: [
                  {
                    subject: 'models/gemini-3.5-flash-lite',
                    description:
                      'Quota exceeded for quota metric GenerateContentRequestsPerMinutePerProjectPerRegionPerModel',
                  },
                ],
              },
            ],
          },
        }
        expect(detectQuotaScope(error, 'gemini-3.5-flash-lite')).toBe('model_specific')
      })

      it('identifies model-specific quota via message mentioning per-model rate limit or model name', () => {
        const error = new Error("Rate limit exceeded for model 'gemini-3.5-flash-lite'")
        ;(error as any).status = 429
        expect(detectQuotaScope(error, 'gemini-3.5-flash-lite')).toBe('model_specific')
      })

      it('identifies project-wide quota via ErrorInfo metadata.quota_limit with PerProject', () => {
        const error = {
          status: 429,
          details: [
            {
              '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
              metadata: {
                quota_limit: 'GenerateContentRequestsPerDayPerProject',
                quota_metric:
                  'generativelanguage.googleapis.com/generate_content_requests_per_day',
              },
            },
          ],
        }
        expect(detectQuotaScope(error, 'gemini-3.5-flash-lite')).toBe('project_wide')
      })

      it('identifies project-wide quota via message mentioning daily quota exceeded for project', () => {
        const error = new Error('Resource has been exhausted: daily quota exceeded for project 12345')
        ;(error as any).status = 429
        expect(detectQuotaScope(error, 'gemini-3.5-flash-lite')).toBe('project_wide')
      })

      it('returns unknown for generic 429 without specifics', () => {
        const error = new Error('Resource has been exhausted (e.g. check quota).')
        ;(error as any).status = 429
        expect(detectQuotaScope(error, 'gemini-3.5-flash-lite')).toBe('unknown')
      })
    })

    describe('Text Extraction: gemini-3.5-flash-lite quota fallback behavior', () => {
      it('gemini-3.5-flash-lite model-specific 429 -> safely tries gemini-3.6-flash at most once and succeeds', async () => {
        process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
        const recordedAttempts: string[] = []

        const modelSpecific429 = new Error("Resource exhausted for model 'gemini-3.5-flash-lite'")
        ;(modelSpecific429 as any).status = 429
        ;(modelSpecific429 as any).details = [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            metadata: {
              quota_limit: 'GenerateContentRequestsPerMinutePerProjectPerRegionPerModel',
            },
          },
          {
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: '20s',
          },
        ]

        const createMock = vi.fn().mockImplementation(async ({ model }) => {
          recordedAttempts.push(model)
          if (model === 'gemini-3.5-flash-lite') {
            throw modelSpecific429
          }
          return {
            choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }],
          }
        })

        vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
          provider: 'gemini',
          model: 'gemini-3.6-flash',
          client: { chat: { completions: { create: createMock } } } as any,
        })

        const result = await extractRecipeFromText('Sample raw recipe text...')

        expect(recordedAttempts).toEqual(['gemini-3.5-flash-lite', 'gemini-3.6-flash'])
        expect(result.error).toBeUndefined()
        expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
        expect(result.usedModel).toBe('gemini-3.6-flash')
      })

      it('gemini-3.5-flash-lite model-specific 429 -> second model also 429 -> halts after at most once, does NOT try 3rd model', async () => {
        process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
        const recordedAttempts: string[] = []

        const errFlashLite = new Error("Resource exhausted for model 'gemini-3.5-flash-lite'")
        ;(errFlashLite as any).status = 429
        ;(errFlashLite as any).details = [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            metadata: {
              quota_limit: 'GenerateContentRequestsPerMinutePerProjectPerRegionPerModel',
            },
          },
          {
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: '25s',
          },
        ]

        const errFlash36 = new Error("Resource exhausted for model 'gemini-3.6-flash'")
        ;(errFlash36 as any).status = 429
        ;(errFlash36 as any).details = [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            metadata: {
              quota_limit: 'GenerateContentRequestsPerMinutePerProjectPerRegionPerModel',
            },
          },
          {
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: '30s',
          },
        ]

        const createMock = vi.fn().mockImplementation(async ({ model }) => {
          recordedAttempts.push(model)
          if (model === 'gemini-3.5-flash-lite') throw errFlashLite
          if (model === 'gemini-3.6-flash') throw errFlash36
          return { choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }] }
        })

        vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
          provider: 'gemini',
          model: 'gemini-3.6-flash',
          client: { chat: { completions: { create: createMock } } } as any,
        })

        const result = await extractRecipeFromText('Sample raw recipe text...')

        // Halts after at most 1 quota fallback (never tries gemini-3.5-flash)
        expect(recordedAttempts).toEqual(['gemini-3.5-flash-lite', 'gemini-3.6-flash'])
        expect(result.data).toBeUndefined()
        expect(result.errorCategory).toBe('quota_exhausted')
        expect(result.statusCode).toBe(429)
        expect(result.retryAfterSeconds).toBe(30)
      })

      it('gemini-3.5-flash-lite project-wide 429 -> halts immediately with 0 retries', async () => {
        process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
        const recordedAttempts: string[] = []

        const projectWide429 = new Error('Daily request quota exceeded for project')
        ;(projectWide429 as any).status = 429
        ;(projectWide429 as any).details = [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            metadata: {
              quota_limit: 'GenerateContentRequestsPerDayPerProject',
            },
          },
          {
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: '120s',
          },
        ]

        const createMock = vi.fn().mockImplementation(async ({ model }) => {
          recordedAttempts.push(model)
          throw projectWide429
        })

        vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
          provider: 'gemini',
          model: 'gemini-3.6-flash',
          client: { chat: { completions: { create: createMock } } } as any,
        })

        const result = await extractRecipeFromText('Sample raw recipe text...')

        // Project-wide quota halts immediately on first candidate
        expect(recordedAttempts).toEqual(['gemini-3.5-flash-lite'])
        expect(result.data).toBeUndefined()
        expect(result.errorCategory).toBe('quota_exhausted')
        expect(result.statusCode).toBe(429)
        expect(result.retryAfterSeconds).toBe(120)
      })
    })

    describe('Image Extraction: gemini-3.5-flash-lite quota fallback behavior', () => {
      it('gemini-3.5-flash-lite image model-specific 429 -> tries next eligible model once and succeeds', async () => {
        process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
        const recordedAttempts: string[] = []

        const modelSpecific429 = new Error("Resource exhausted for model 'gemini-3.5-flash-lite'")
        ;(modelSpecific429 as any).status = 429
        ;(modelSpecific429 as any).details = [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            metadata: {
              quota_limit: 'GenerateContentRequestsPerMinutePerProjectPerRegionPerModel',
            },
          },
        ]

        const createMock = vi.fn().mockImplementation(async ({ model }) => {
          recordedAttempts.push(model)
          if (model === 'gemini-3.5-flash-lite') throw modelSpecific429
          return { choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }] }
        })

        vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
          provider: 'gemini',
          model: 'gemini-3.6-flash',
          client: { chat: { completions: { create: createMock } } } as any,
        })

        const result = await extractRecipeFromImage('data:image/jpeg;base64,ZmFrZWltYWdlZGF0YQ==')

        expect(recordedAttempts).toEqual(['gemini-3.5-flash-lite', 'gemini-3.6-flash'])
        expect(result.error).toBeUndefined()
        expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
        expect(result.usedModel).toBe('gemini-3.6-flash')
      })

      it('gemini-3.5-flash-lite image project-wide 429 -> halts immediately with 0 retries', async () => {
        process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
        const recordedAttempts: string[] = []

        const projectWide429 = new Error('Daily quota exceeded for project')
        ;(projectWide429 as any).status = 429
        ;(projectWide429 as any).details = [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            metadata: {
              quota_limit: 'GenerateContentRequestsPerDayPerProject',
            },
          },
        ]

        const createMock = vi.fn().mockImplementation(async ({ model }) => {
          recordedAttempts.push(model)
          throw projectWide429
        })

        vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
          provider: 'gemini',
          model: 'gemini-3.6-flash',
          client: { chat: { completions: { create: createMock } } } as any,
        })

        const result = await extractRecipeFromImage('data:image/jpeg;base64,ZmFrZWltYWdlZGF0YQ==')

        expect(recordedAttempts).toEqual(['gemini-3.5-flash-lite'])
        expect(result.data).toBeUndefined()
        expect(result.errorCategory).toBe('quota_exhausted')
        expect(result.statusCode).toBe(429)
      })
    })
  })
})
