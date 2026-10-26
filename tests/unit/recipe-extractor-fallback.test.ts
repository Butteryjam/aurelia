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
  EXTRACTION_PRIMARY_TIMEOUT_MS,
  EXTRACTION_FALLBACK_TIMEOUT_MS,
  MIN_REMAINING_BUDGET_MS,
  MIN_VIABLE_ATTEMPT_TIMEOUT_MS,
  GEMINI_STABLE_FALLBACK_MODELS,
  GEMINI_EXTRACTION_FALLBACK_MODELS,
  isTransientOrTimeoutError,
  isQuotaExhaustedError,
  detectQuotaScope,
  resolveCandidateModels,
  resolveExtractionCandidateModels,
  calculateExtractionAttemptBudget,
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
    it('resolves extraction candidate models including gemini-3.5-flash as first fallback when GEMINI_EXTRACTION_MODEL is not set', () => {
      const candidates = resolveExtractionCandidateModels('gemini', 'gemini-3.6-flash')
      expect(candidates).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'])
    })

    it('prioritizes gemini-3.5-flash-lite as primary when configured via GEMINI_EXTRACTION_MODEL', () => {
      process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
      const candidates = resolveExtractionCandidateModels('gemini', 'gemini-3.6-flash')
      expect(candidates).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'])
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
      expect(recordedAttempts[0].options.timeout).toBe(EXTRACTION_PRIMARY_TIMEOUT_MS)
      expect(recordedAttempts[0].options.maxRetries).toBe(0)

      // Fallback attempt (gemini-3.5-flash)
      expect(recordedAttempts[1].model).toBe('gemini-3.5-flash')
      expect(recordedAttempts[1].options.timeout).toBe(EXTRACTION_FALLBACK_TIMEOUT_MS)
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
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
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
      expect(recordedAttempts[0].options.timeout).toBe(EXTRACTION_PRIMARY_TIMEOUT_MS)
      expect(recordedAttempts[0].options.maxRetries).toBe(0)

      expect(recordedAttempts[1].model).toBe('gemini-3.5-flash')
      expect(recordedAttempts[1].options.timeout).toBe(EXTRACTION_FALLBACK_TIMEOUT_MS)
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
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
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
      it('gemini-3.5-flash-lite model-specific 429 -> safely tries gemini-3.5-flash at most once and succeeds', async () => {
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

        expect(recordedAttempts).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash'])
        expect(result.error).toBeUndefined()
        expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
        expect(result.usedModel).toBe('gemini-3.5-flash')
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

        const errFlash35 = new Error("Resource exhausted for model 'gemini-3.5-flash'")
        ;(errFlash35 as any).status = 429
        ;(errFlash35 as any).details = [
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
          if (model === 'gemini-3.5-flash') throw errFlash35
          return { choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }] }
        })

        vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
          provider: 'gemini',
          model: 'gemini-3.6-flash',
          client: { chat: { completions: { create: createMock } } } as any,
        })

        const result = await extractRecipeFromText('Sample raw recipe text...')

        // Halts after at most 1 quota fallback (never tries gemini-3.6-flash)
        expect(recordedAttempts).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash'])
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

        expect(recordedAttempts).toEqual(['gemini-3.5-flash-lite', 'gemini-3.5-flash'])
        expect(result.error).toBeUndefined()
        expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
        expect(result.usedModel).toBe('gemini-3.5-flash')
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

    describe('Production Timeout Bug Reproduction & Verification Suite', () => {
      it('reproduces and prevents production bug: 28s primary budget allows a 25s gemini-3.5-flash-lite completion without premature abort', async () => {
        process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
        const recordedAttempts: Array<{ model: string; options: any }> = []

        const createMock = vi.fn().mockImplementation(async ({ model }, options) => {
          recordedAttempts.push({ model, options })
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

        expect(recordedAttempts).toHaveLength(1)
        expect(recordedAttempts[0].model).toBe('gemini-3.5-flash-lite')
        expect(recordedAttempts[0].options.timeout).toBe(EXTRACTION_PRIMARY_TIMEOUT_MS)
        expect(recordedAttempts[0].options.timeout).toBe(26000)
        expect(result.error).toBeUndefined()
        expect(result.data?.title).toBe("Grandma's Rustic Tuscan White Bean Soup")
      })

      it('reproduces and fixes starvation: when attempt 0 times out at 26s, attempt 1 gets 12s leaving remaining budget for candidate 2 when no subsequent cross-provider fallback exists', async () => {
        process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
        const recordedAttempts: Array<{ model: string; options: any }> = []

        const timeoutErr = new Error('Request timed out.')
        timeoutErr.name = 'APIConnectionTimeoutError'

        const createMock = vi.fn().mockImplementation(async ({ model }, options) => {
          recordedAttempts.push({ model, options })
          // Candidate 0 times out
          if (model === 'gemini-3.5-flash-lite') {
            throw timeoutErr
          }
          // Candidate 1 times out
          if (model === 'gemini-3.5-flash') {
            throw timeoutErr
          }
          // Candidate 2 succeeds
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

        // All 3 candidates are attempted without being halted early by budget exhaustion
        expect(recordedAttempts.map((a) => a.model)).toEqual([
          'gemini-3.5-flash-lite',
          'gemini-3.5-flash',
          'gemini-3.6-flash',
        ])
        expect(recordedAttempts[0].options.timeout).toBe(26000)
        expect(recordedAttempts[1].options.timeout).toBe(12000)
        expect(result.error).toBeUndefined()
        expect(result.usedModel).toBe('gemini-3.6-flash')
      })

      it('regression scenario 1: slow primary (times out after 26s) + rate-limited secondary (HTTP 429 fast) -> tertiary Gemini candidate succeeds within remaining budget', async () => {
        process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
        const recordedAttempts: Array<{ model: string; options: any }> = []

        const timeoutErr = new Error('Request timed out.')
        timeoutErr.name = 'APIConnectionTimeoutError'

        const rateLimitErr = new Error('Model rate limit reached: 429 Resource Exhausted')
        ;(rateLimitErr as any).status = 429
        ;(rateLimitErr as any).error = [
          {
            error: {
              code: 429,
              message: 'Quota exceeded for model gemini-3.5-flash',
              details: [
                {
                  '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
                  metadata: {
                    quota_limit: 'PerModelRequestsPerMinute',
                    quota_metric: 'generativelanguage.googleapis.com/per_model_requests',
                  },
                },
              ],
            },
          },
        ]

        const createMock = vi.fn().mockImplementation(async ({ model }, options) => {
          recordedAttempts.push({ model, options })
          if (model === 'gemini-3.5-flash-lite') {
            throw timeoutErr
          }
          if (model === 'gemini-3.5-flash') {
            throw rateLimitErr
          }
          // Tertiary Gemini candidate succeeds
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

        expect(recordedAttempts.map((a) => a.model)).toEqual([
          'gemini-3.5-flash-lite',
          'gemini-3.5-flash',
          'gemini-3.6-flash',
        ])
        expect(recordedAttempts[0].options.timeout).toBe(26000)
        expect(recordedAttempts[1].options.timeout).toBe(12000)
        // Tertiary model gets full fallback timeout (12s) since 429 failed fast and ample budget remains
        expect(recordedAttempts[2].options.timeout).toBe(12000)
        expect(result.error).toBeUndefined()
        expect(result.usedModel).toBe('gemini-3.6-flash')
      })

      it('regression scenario 2: slow primary (times out after 26s) + slow secondary (times out after 12s) -> candidate 2 skipped to preserve budget -> OpenRouter free fallback succeeds with 10s budget', async () => {
        process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
        const recordedGeminiAttempts: Array<{ model: string; options: any }> = []
        let recordedOpenRouterAttempt: { model: string; options: any } | null = null

        let simulatedTime = 1700000000000
        vi.spyOn(Date, 'now').mockImplementation(() => simulatedTime)

        const timeoutErr = new Error('Request timed out.')
        timeoutErr.name = 'APIConnectionTimeoutError'

        const geminiMock = vi.fn().mockImplementation(async ({ model }, options) => {
          recordedGeminiAttempts.push({ model, options })
          if (model === 'gemini-3.5-flash-lite') {
            simulatedTime += 26000 // Primary attempt consumes 26s before timing out
            throw timeoutErr
          }
          if (model === 'gemini-3.5-flash') {
            simulatedTime += 12000 // Secondary fallback consumes 12s before timing out
            throw timeoutErr
          }
          throw timeoutErr
        })

        const openRouterMock = vi.fn().mockImplementation(async ({ model }, options) => {
          recordedOpenRouterAttempt = { model, options }
          return {
            choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }],
          }
        })

        vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
          provider: 'gemini',
          model: 'gemini-3.6-flash',
          client: { chat: { completions: { create: geminiMock } } } as any,
        })

        vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
          model: 'openrouter/free',
          client: { chat: { completions: { create: openRouterMock } } } as any,
        })

        const result = await extractRecipeFromText('Sample raw recipe text...')

        // Candidate 2 (gemini-3.6-flash) was skipped because usable budget (10s - 6s = 4s) < 5s min viable timeout,
        // preventing a wasteful 4s attempt that would have starved OpenRouter!
        expect(recordedGeminiAttempts.map((a) => a.model)).toEqual([
          'gemini-3.5-flash-lite',
          'gemini-3.5-flash',
        ])
        expect(recordedOpenRouterAttempt).not.toBeNull()
        const nonNullAttempt = recordedOpenRouterAttempt as unknown as {
          model: string
          options: any
        }
        expect(nonNullAttempt.model).toBe('openrouter/free')
        // OpenRouter receives the full remaining 10s budget
        expect(nonNullAttempt.options.timeout).toBe(10000)
        expect(result.error).toBeUndefined()
        expect(result.provider).toBe('openrouter')
        expect(result.usedModel).toBe('openrouter/free')
      })

      it('regression scenario 3: slow primary (times out after 26s) + rate-limited secondary (429 fast) + failing tertiary (503 fast) -> OpenRouter free fallback succeeds with full fallback budget', async () => {
        process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
        const recordedGeminiModels: string[] = []
        let recordedOpenRouterTimeout: number | undefined

        const timeoutErr = new Error('Request timed out.')
        timeoutErr.name = 'APIConnectionTimeoutError'

        const rateLimitErr = new Error('Rate limit exceeded')
        ;(rateLimitErr as any).status = 429

        const error503 = new Error('Service Unavailable')
        ;(error503 as any).status = 503

        const geminiMock = vi.fn().mockImplementation(async ({ model }) => {
          recordedGeminiModels.push(model)
          if (model === 'gemini-3.5-flash-lite') throw timeoutErr
          if (model === 'gemini-3.5-flash') throw rateLimitErr
          throw error503
        })

        const openRouterMock = vi.fn().mockImplementation(async (_args, options) => {
          recordedOpenRouterTimeout = options?.timeout
          return {
            choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }],
          }
        })

        vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
          provider: 'gemini',
          model: 'gemini-3.6-flash',
          client: { chat: { completions: { create: geminiMock } } } as any,
        })

        vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
          model: 'openrouter/free',
          client: { chat: { completions: { create: openRouterMock } } } as any,
        })

        const result = await extractRecipeFromText('Sample raw recipe text...')

        expect(recordedGeminiModels).toEqual([
          'gemini-3.5-flash-lite',
          'gemini-3.5-flash',
          'gemini-3.6-flash',
        ])
        expect(recordedOpenRouterTimeout).toBe(EXTRACTION_FALLBACK_TIMEOUT_MS) // 12000ms
        expect(result.error).toBeUndefined()
        expect(result.provider).toBe('openrouter')
      })

      it('regression scenario 4: image extraction with slow primary (times out after 26s) + rate-limited secondary (429 fast) -> tertiary Gemini fallback succeeds', async () => {
        process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
        const recordedAttempts: string[] = []

        const timeoutErr = new Error('Request timed out.')
        timeoutErr.name = 'APIConnectionTimeoutError'

        const rateLimitErr = new Error('Model rate limit reached: 429')
        ;(rateLimitErr as any).status = 429

        const createMock = vi.fn().mockImplementation(async ({ model }) => {
          recordedAttempts.push(model)
          if (model === 'gemini-3.5-flash-lite') throw timeoutErr
          if (model === 'gemini-3.5-flash') throw rateLimitErr
          return {
            choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }],
          }
        })

        vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
          provider: 'gemini',
          model: 'gemini-3.6-flash',
          client: { chat: { completions: { create: createMock } } } as any,
        })

        const result = await extractRecipeFromImage('data:image/jpeg;base64,ZmFrZWltYWdlZGF0YQ==')

        expect(recordedAttempts).toEqual([
          'gemini-3.5-flash-lite',
          'gemini-3.5-flash',
          'gemini-3.6-flash',
        ])
        expect(result.error).toBeUndefined()
        expect(result.usedModel).toBe('gemini-3.6-flash')
      })

      it('calculates extraction attempt budgets and reserves headroom when subsequent candidates exist', () => {
        vi.useFakeTimers()
        const now = 1700000000000
        vi.setSystemTime(now)
        const deadline = now + TOTAL_AI_BUDGET_MS

        // Attempt 0 (Primary)
        const budget0 = calculateExtractionAttemptBudget(0, deadline, true)
        expect(budget0.canAttempt).toBe(true)
        expect(budget0.attemptTimeoutMs).toBe(EXTRACTION_PRIMARY_TIMEOUT_MS)

        // Attempt 1 with 20s remaining and subsequent candidate
        const deadline20s = now + 20000
        const budget1 = calculateExtractionAttemptBudget(1, deadline20s, true)
        expect(budget1.canAttempt).toBe(true)
        expect(budget1.attemptTimeoutMs).toBe(EXTRACTION_FALLBACK_TIMEOUT_MS) // 12s

        // Attempt 1 with 8s remaining and subsequent candidate (reserves 6s for candidate 2, leaving 2s < 5s)
        const deadline8s = now + 8000
        const budgetWith8s = calculateExtractionAttemptBudget(1, deadline8s, true)
        // Since usableBudget = 8000 - 6000 = 2000ms < 5000ms (MIN_VIABLE_ATTEMPT_TIMEOUT_MS),
        // canAttempt is false to protect reserved budget for subsequent fallback!
        expect(budgetWith8s.canAttempt).toBe(false)
        expect(budgetWith8s.attemptTimeoutMs).toBe(0)

        // Attempt 1 with 12s remaining and subsequent candidate (reserves 6s, leaving 6s >= 5s)
        const deadline12s = now + 12000
        const budgetWith12s = calculateExtractionAttemptBudget(1, deadline12s, true)
        expect(budgetWith12s.canAttempt).toBe(true)
        expect(budgetWith12s.attemptTimeoutMs).toBe(6000) // 12000 - 6000 = 6000ms

        // Attempt 2 with 10s remaining and NO subsequent candidate (uses all 10s)
        const deadline10s = now + 10000
        const budgetWith10sNoSubsequent = calculateExtractionAttemptBudget(2, deadline10s, false)
        expect(budgetWith10sNoSubsequent.canAttempt).toBe(true)
        expect(budgetWith10sNoSubsequent.attemptTimeoutMs).toBe(10000)

        // Exhausted budget (< 6000ms)
        const deadlineExhausted = now + 3991
        const budgetExhausted = calculateExtractionAttemptBudget(1, deadlineExhausted, false)
        expect(budgetExhausted.canAttempt).toBe(false)
        expect(budgetExhausted.attemptTimeoutMs).toBe(0)

        vi.useRealTimers()
      })

      it('falls back to OpenRouter free model when all Gemini candidates fail with retryable error within budget', async () => {
        process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
        const recordedGeminiModels: string[] = []
        let openRouterCalled = false

        const error503 = new Error('Service Unavailable')
        ;(error503 as any).status = 503

        const geminiMock = vi.fn().mockImplementation(async ({ model }) => {
          recordedGeminiModels.push(model)
          throw error503
        })

        const openRouterMock = vi.fn().mockImplementation(async () => {
          openRouterCalled = true
          return {
            choices: [{ message: { content: MOCK_VALID_RECIPE_JSON } }],
          }
        })

        vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
          provider: 'gemini',
          model: 'gemini-3.6-flash',
          client: { chat: { completions: { create: geminiMock } } } as any,
        })

        vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
          model: 'openrouter/free',
          client: { chat: { completions: { create: openRouterMock } } } as any,
        })

        const result = await extractRecipeFromText('Sample raw recipe text...')

        expect(recordedGeminiModels).toEqual([
          'gemini-3.5-flash-lite',
          'gemini-3.5-flash',
          'gemini-3.6-flash',
        ])
        expect(openRouterCalled).toBe(true)
        expect(result.error).toBeUndefined()
        expect(result.provider).toBe('openrouter')
        expect(result.usedModel).toBe('openrouter/free')
      })

      it('strictly rejects non-free OpenRouter models during cross-provider failover', async () => {
        process.env.GEMINI_EXTRACTION_MODEL = 'gemini-3.5-flash-lite'
        const error503 = new Error('Service Unavailable')
        ;(error503 as any).status = 503

        const geminiMock = vi.fn().mockRejectedValue(error503)
        const openRouterMock = vi.fn()

        vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
          provider: 'gemini',
          model: 'gemini-3.6-flash',
          client: { chat: { completions: { create: geminiMock } } } as any,
        })

        vi.spyOn(openaiClientModule, 'getOpenRouterConfig').mockReturnValue({
          model: 'anthropic/claude-3-opus', // Non-free model
          client: { chat: { completions: { create: openRouterMock } } } as any,
        })

        const result = await extractRecipeFromText('Sample raw recipe text...')

        // OpenRouter completion must NOT be called for paid models
        expect(openRouterMock).not.toHaveBeenCalled()
        expect(result.data).toBeUndefined()
        expect(result.errorCategory).toBe('provider_unavailable')
      })
    })
  })
})
