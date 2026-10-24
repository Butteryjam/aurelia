import 'server-only'

/**
 * Strict overall AI completion budget (in milliseconds).
 * Leaves at least 12 seconds in the 60-second Vercel serverless window
 * for database writes, conversation updates, and error cleanup.
 */
export const TOTAL_AI_BUDGET_MS = 48000

/**
 * Maximum timeout for the primary model attempt.
 * If the primary model does not complete within 24 seconds, it is considered stalled
 * in upstream queue and triggers immediate fallback while ample budget remains.
 */
export const PRIMARY_TIMEOUT_MS = 24000

/**
 * Maximum timeout for the fallback model attempt.
 * Sufficient for gemini-3.5-flash which reliably completes in 3-14 seconds.
 */
export const FALLBACK_TIMEOUT_MS = 20000

/**
 * Minimum remaining budget required to start an attempt.
 */
export const MIN_REMAINING_BUDGET_MS = 5000

/**
 * Verified stable fallback model. Limited to primary + gemini-3.5-flash
 * to prevent sequential request storms and ensure execution stays within budget.
 */
export const GEMINI_STABLE_FALLBACK_MODELS = ['gemini-3.5-flash'] as const

/**
 * Verified stable fallback models for Recipe Extraction.
 * Includes gemini-3.5-flash-lite (dedicated quota pool & ~5s latency)
 * and gemini-3.5-flash.
 */
export const GEMINI_EXTRACTION_FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
] as const

/**
 * Detects whether an error thrown by the AI provider is transient (e.g. 503 high demand,
 * 429 quota exhaustion, 500/502/504 gateway issues) or a client-side connection timeout
 * (OpenAI SDK APIConnectionTimeoutError, socket timeout, or fetch abort), making it
 * eligible for immediate model failover.
 */
export function isTransientOrTimeoutError(err: unknown): boolean {
  if (!err) return false

  const errorObj = err as {
    status?: number
    statusCode?: number
    name?: string
    message?: string
    code?: string | number
  }

  const status = errorObj.status ?? errorObj.statusCode
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true
  }

  // OpenAI SDK connection timeouts & network aborts
  if (
    errorObj.name === 'APIConnectionTimeoutError' ||
    errorObj.name === 'TimeoutError' ||
    errorObj.name === 'AbortError' ||
    errorObj.name === 'APIConnectionError'
  ) {
    return true
  }

  // Node.js network/socket timeout codes
  if (
    errorObj.code === 'ETIMEDOUT' ||
    errorObj.code === 'ESOCKETTIMEDOUT' ||
    errorObj.code === 'UND_ERR_CONNECT_TIMEOUT' ||
    errorObj.code === 'ECONNRESET' ||
    errorObj.code === 20 // AbortError DOMException code
  ) {
    return true
  }

  // Error message heuristics
  if (typeof errorObj.message === 'string') {
    const msg = errorObj.message.toLowerCase()
    if (
      msg.includes('timed out') ||
      msg.includes('timeout') ||
      msg.includes('connection reset') ||
      msg.includes('econnreset') ||
      msg.includes('high demand') ||
      msg.includes('unavailable')
    ) {
      return true
    }
  }

  return false
}

/**
 * Resolve ordered candidate models for execution.
 * Primary model is always attempted first, followed by live-verified fallback models.
 */
export function resolveCandidateModels(provider: string, primaryModel: string): string[] {
  if (provider === 'gemini') {
    return Array.from(new Set([primaryModel, ...GEMINI_STABLE_FALLBACK_MODELS]))
  }
  return [primaryModel]
}

/**
 * Resolve candidate models for recipe extraction.
 * Supports GEMINI_EXTRACTION_MODEL environment override, defaulting to
 * gemini-3.5-flash-lite or primaryModel with verified stable fallbacks.
 */
export function resolveExtractionCandidateModels(
  provider: string,
  primaryModel: string
): string[] {
  if (provider === 'gemini') {
    const configuredExtractionModel = process.env.GEMINI_EXTRACTION_MODEL?.trim()
    const primary = configuredExtractionModel || primaryModel
    const fallbacks =
      primary === 'gemini-3.5-flash-lite'
        ? ['gemini-3.6-flash', 'gemini-3.5-flash']
        : ['gemini-3.5-flash-lite', 'gemini-3.5-flash']
    return Array.from(new Set([primary, ...fallbacks]))
  }
  return [primaryModel]
}

/**
 * Calculate attempt timeout and check remaining overall budget.
 */
export function calculateAttemptBudget(
  attemptIndex: number,
  aiDeadline: number
): { attemptTimeoutMs: number; canAttempt: boolean; remainingBudget: number } {
  const remainingBudget = aiDeadline - Date.now()
  if (remainingBudget < MIN_REMAINING_BUDGET_MS) {
    return { attemptTimeoutMs: 0, canAttempt: false, remainingBudget }
  }

  const isPrimary = attemptIndex === 0
  const targetTimeout = isPrimary ? PRIMARY_TIMEOUT_MS : FALLBACK_TIMEOUT_MS
  const attemptTimeoutMs = Math.min(targetTimeout, remainingBudget)

  return { attemptTimeoutMs, canAttempt: true, remainingBudget }
}
