import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isTransientOrTimeoutError,
  resolveCandidateModels,
  generateChefResponse,
  TOTAL_AI_BUDGET_MS,
  PRIMARY_TIMEOUT_MS,
  FALLBACK_TIMEOUT_MS,
  MIN_REMAINING_BUDGET_MS,
} from '@/features/ai/services/chef'
import * as openaiClientModule from '@/features/ai/services/openai-client'
import * as retrieverModule from '@/features/ai/services/retriever'
import { sendChatMessageAction } from '@/features/ai/actions/chat'
import * as serverSupabaseModule from '@/lib/supabase/server'
import * as rateLimiterModule from '@/features/ai/services/rate-limiter'

vi.mock('@/features/ai/services/retriever', () => ({
  retrieveRecipesForAi: vi.fn(),
  getFocusedRecipeContext: vi.fn(),
}))

describe('AI Chef Reliability & Deadline Budget Regression Suite', () => {
  describe('Budget & Timeout Configuration Constants', () => {
    it('enforces total AI budget under 60-second Vercel ceiling with ample safety margin', () => {
      expect(TOTAL_AI_BUDGET_MS).toBe(48000)
      expect(PRIMARY_TIMEOUT_MS).toBe(24000)
      expect(FALLBACK_TIMEOUT_MS).toBe(20000)
      // Primary + Fallback worst-case AI latency (24s + 20s = 44s) leaves at least 16s before 60s hard kill
      expect(PRIMARY_TIMEOUT_MS + FALLBACK_TIMEOUT_MS).toBeLessThanOrEqual(TOTAL_AI_BUDGET_MS)
      expect(TOTAL_AI_BUDGET_MS).toBeLessThan(60000)
    })
  })

  describe('isTransientOrTimeoutError', () => {
    it('identifies HTTP 503 high demand as transient', () => {
      expect(isTransientOrTimeoutError({ status: 503 })).toBe(true)
      expect(isTransientOrTimeoutError({ statusCode: 503 })).toBe(true)
    })

    it('identifies HTTP 429, 500, 502, 504 as transient', () => {
      expect(isTransientOrTimeoutError({ status: 429 })).toBe(true)
      expect(isTransientOrTimeoutError({ status: 500 })).toBe(true)
      expect(isTransientOrTimeoutError({ status: 502 })).toBe(true)
      expect(isTransientOrTimeoutError({ status: 504 })).toBe(true)
    })

    it('identifies OpenAI SDK APIConnectionTimeoutError (status: undefined) as eligible for failover', () => {
      const timeoutErr = new Error('Request timed out.')
      timeoutErr.name = 'APIConnectionTimeoutError'
      expect((timeoutErr as any).status).toBeUndefined()
      expect(isTransientOrTimeoutError(timeoutErr)).toBe(true)
    })

    it('identifies AbortError, TimeoutError, and network timeout codes', () => {
      const abortErr = new Error('The operation was aborted')
      abortErr.name = 'AbortError'
      expect(isTransientOrTimeoutError(abortErr)).toBe(true)

      expect(isTransientOrTimeoutError({ code: 'ETIMEDOUT' })).toBe(true)
      expect(isTransientOrTimeoutError({ code: 'ESOCKETTIMEDOUT' })).toBe(true)
      expect(isTransientOrTimeoutError({ code: 'UND_ERR_CONNECT_TIMEOUT' })).toBe(true)
      expect(isTransientOrTimeoutError({ code: 'ECONNRESET' })).toBe(true)
      expect(isTransientOrTimeoutError({ code: 20 })).toBe(true)
      expect(isTransientOrTimeoutError(new Error('Connection timed out after 45000ms'))).toBe(true)
    })

    it('does NOT treat non-transient client errors (400, 401, 403, 404) as eligible for failover', () => {
      expect(isTransientOrTimeoutError({ status: 400, message: 'Invalid payload' })).toBe(false)
      expect(isTransientOrTimeoutError({ status: 401, message: 'Invalid API key' })).toBe(false)
      expect(isTransientOrTimeoutError({ status: 403, message: 'Forbidden' })).toBe(false)
      expect(isTransientOrTimeoutError({ status: 404, message: 'Not found' })).toBe(false)
      expect(isTransientOrTimeoutError(null)).toBe(false)
      expect(isTransientOrTimeoutError(undefined)).toBe(false)
    })
  })

  describe('resolveCandidateModels', () => {
    it('limits candidate chain to primary + gemini-3.5-flash without sequential 5-model storms', () => {
      const candidates = resolveCandidateModels('gemini', 'gemini-3.6-flash')
      expect(candidates).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash'])
      expect(candidates).toHaveLength(2)
    })

    it('does not duplicate if primary model is already gemini-3.5-flash', () => {
      const candidates = resolveCandidateModels('gemini', 'gemini-3.5-flash')
      expect(candidates).toEqual(['gemini-3.5-flash'])
      expect(candidates).toHaveLength(1)
    })

    it('returns only the primary model for non-gemini providers', () => {
      expect(resolveCandidateModels('openai', 'gpt-4o-mini')).toEqual(['gpt-4o-mini'])
    })
  })

  describe('generateChefResponse - Per-Model Budget & Failover Executions', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(retrieverModule.retrieveRecipesForAi).mockResolvedValue({
        recipes: [],
        references: [],
      })
      vi.mocked(retrieverModule.getFocusedRecipeContext).mockResolvedValue(null)
    })

    it('primary timeout (24s budget) -> fallback success (20s budget)', async () => {
      const recordedAttempts: Array<{ model: string; options: any }> = []
      const createMock = vi.fn().mockImplementation(async ({ model }, options) => {
        recordedAttempts.push({ model, options })
        if (model === 'gemini-3.6-flash') {
          const timeoutErr = new Error('Request timed out.')
          timeoutErr.name = 'APIConnectionTimeoutError'
          throw timeoutErr
        }

        // Secondary fallback model succeeds
        return {
          choices: [
            {
              message: {
                content: 'Here is your recipe from the fallback model!',
              },
            },
          ],
          usage: { total_tokens: 150 },
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

      const result = await generateChefResponse({
        userId: 'test-user-id',
        userMessage: 'How do I make roasted vegetables?',
        conversationHistory: [],
      })

      expect(recordedAttempts).toHaveLength(2)
      // Primary attempted with 24s budget
      expect(recordedAttempts[0].model).toBe('gemini-3.6-flash')
      expect(recordedAttempts[0].options.timeout).toBe(PRIMARY_TIMEOUT_MS)
      expect(recordedAttempts[0].options.maxRetries).toBe(0)

      // Fallback attempted with 20s budget
      expect(recordedAttempts[1].model).toBe('gemini-3.5-flash')
      expect(recordedAttempts[1].options.timeout).toBe(FALLBACK_TIMEOUT_MS)
      expect(recordedAttempts[1].options.maxRetries).toBe(0)

      expect(result.data?.content).toBe('Here is your recipe from the fallback model!')
      expect(result.error).toBeUndefined()
    })

    it('primary 503 -> fallback success', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        if (model === 'gemini-3.6-flash') {
          const error503 = new Error('This model is currently experiencing high demand.')
          ;(error503 as any).status = 503
          throw error503
        }

        return {
          choices: [
            {
              message: {
                content: 'Fallback response after 503 spike resolved!',
              },
            },
          ],
          usage: { total_tokens: 120 },
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

      const result = await generateChefResponse({
        userId: 'test-user-id',
        userMessage: 'Suggest dinner ideas',
        conversationHistory: [],
      })

      expect(recordedAttempts).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash'])
      expect(result.data?.content).toBe('Fallback response after 503 spike resolved!')
      expect(result.error).toBeUndefined()
    })

    it('primary timeout + fallback timeout -> safe final error', async () => {
      const createMock = vi.fn().mockImplementation(async () => {
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

      const result = await generateChefResponse({
        userId: 'test-user-id',
        userMessage: 'Quick meal ideas?',
        conversationHistory: [],
      })

      expect(createMock).toHaveBeenCalledTimes(2) // primary + fallback
      expect(result.data).toBeUndefined()
      expect(result.error).toBe(
        'Chef is temporarily unavailable right now. Your recipes and conversations remain safe.'
      )
    })

    it('overall deadline prevents additional model attempts once budget is exhausted', async () => {
      let callCount = 0
      const dateNowSpy = vi.spyOn(Date, 'now')
      let currentTime = 1000000

      dateNowSpy.mockImplementation(() => currentTime)

      const createMock = vi.fn().mockImplementation(async () => {
        callCount++
        // Simulate primary taking 46 seconds (leaving only 2s of the 48s budget, below MIN_REMAINING_BUDGET_MS)
        currentTime += 46000
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

      const result = await generateChefResponse({
        userId: 'test-user-id',
        userMessage: 'Test deadline exhaustion',
        conversationHistory: [],
      })

      // The second candidate was blocked because remaining budget was < MIN_REMAINING_BUDGET_MS
      expect(callCount).toBe(1)
      expect(result.data).toBeUndefined()
      expect(result.error).toBe(
        'Chef is temporarily unavailable right now. Your recipes and conversations remain safe.'
      )

      dateNowSpy.mockRestore()
    })
  })

  describe('Database Hygiene: Orphaned User Message Cleanup on AI Failure', () => {
    it('executes delete query on ai_messages when generateChefResponse fails', async () => {
      const testConvId = '11111111-1111-4111-8111-111111111111'
      const testUserMsgId = '22222222-2222-4222-8222-222222222222'

      const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
      const mockDelete = vi.fn().mockReturnValue({
        eq: mockDeleteEq,
      })
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: testUserMsgId, conversation_id: testConvId, role: 'user', content: 'Hello Chef' },
            error: null,
          }),
        }),
      })

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: '33333333-3333-4333-8333-333333333333' } } }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'ai_conversations') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { id: testConvId, user_id: '33333333-3333-4333-8333-333333333333' },
                    }),
                  }),
                }),
              }),
            }
          }
          if (table === 'ai_messages') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: [] }),
                  }),
                }),
              }),
              insert: mockInsert,
              delete: mockDelete,
            }
          }
          return {}
        }),
      }

      vi.spyOn(serverSupabaseModule, 'createClient').mockResolvedValue(mockSupabase as any)
      vi.spyOn(rateLimiterModule, 'checkRateLimit').mockResolvedValue({ allowed: true })

      // Mock AI client so all attempts throw a timeout
      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: {
          chat: {
            completions: {
              create: vi.fn().mockRejectedValue(new Error('Request timed out.')),
            },
          },
        } as any,
      })

      const actionResult = await sendChatMessageAction({
        conversationId: testConvId,
        message: 'Hello Chef',
      })

      // Must return safe error
      expect(actionResult.error).toBe(
        'Chef is temporarily unavailable right now. Your recipes and conversations remain safe.'
      )
      // Must have invoked orphaned message deletion
      expect(mockDelete).toHaveBeenCalled()
      expect(mockDeleteEq).toHaveBeenCalledWith('id', testUserMsgId)
    })
  })
})
