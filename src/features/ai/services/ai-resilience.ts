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
 * Maximum timeout for recipe extraction primary model attempt.
 * Recipe extraction generates 800-1200 tokens of strict, detailed JSON.
 * gemini-3.5-flash-lite requires 16-25 seconds under real-world load.
 * 26,000ms gives ample headroom while leaving 22,000ms for fallback models.
 */
export const EXTRACTION_PRIMARY_TIMEOUT_MS = 26000

/**
 * Maximum timeout for recipe extraction fallback model attempts.
 * 12,000ms ensures gemini-3.5-flash (which completes in 3-8s) has plenty of time,
 * while leaving at least 10,000ms for OpenRouter free fallback if both primary and secondary fail.
 */
export const EXTRACTION_FALLBACK_TIMEOUT_MS = 12000

/**
 * Minimum remaining budget required to start an attempt or cross-provider failover.
 * Guarantees that late fallbacks (including OpenRouter) have sufficient time to execute.
 */
export const MIN_REMAINING_BUDGET_MS = 6000

/**
 * Minimum viable attempt timeout. Any request given less than 5000ms
 * will almost certainly time out during network handshake + token generation,
 * while wastefully consuming remaining deadline budget and starving subsequent models.
 */
export const MIN_VIABLE_ATTEMPT_TIMEOUT_MS = 5000

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

export type QuotaScope = 'model_specific' | 'project_wide' | 'unknown'

/**
 * Checks whether an error is caused by rate limiting or quota exhaustion (HTTP 429).
 */
export function isQuotaExhaustedError(err: unknown): boolean {
  if (!err) return false
  const errorObj = err as Record<string, unknown>
  const status = errorObj.status ?? errorObj.statusCode
  if (status === 429) return true

  const message = String(errorObj.message || '').toLowerCase()
  const code = String(errorObj.code || '').toLowerCase()
  if (
    message.includes('resource_exhausted') ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    code.includes('resource_exhausted') ||
    code.includes('quota')
  ) {
    return true
  }

  // Nested error object inspection
  const errorBody = (errorObj.error ?? errorObj.response) as Record<string, unknown> | undefined
  if (errorBody && typeof errorBody === 'object') {
    const nestedStatus = String(errorBody.status || '').toLowerCase()
    const nestedCode = errorBody.code
    const nestedMessage = String(errorBody.message || '').toLowerCase()
    if (
      nestedCode === 429 ||
      nestedStatus.includes('resource_exhausted') ||
      nestedMessage.includes('resource_exhausted') ||
      nestedMessage.includes('quota') ||
      nestedMessage.includes('rate limit')
    ) {
      return true
    }
  }

  return false
}

/**
 * Distinguishes model-specific quota exhaustion from project-wide quota exhaustion
 * based on Google RPC error details (ErrorInfo, QuotaFailure) and status messages.
 */
export function detectQuotaScope(err: unknown, currentModel?: string): QuotaScope {
  if (!err) return 'unknown'
  const errorObj = err as Record<string, unknown>

  // Gather details array from known containers
  const errorBody = Array.isArray(errorObj.error)
    ? (errorObj.error[0] as Record<string, unknown> | undefined)
    : (errorObj.error as Record<string, unknown> | undefined)
  const rawError = (errorBody ?? errorObj) as Record<string, unknown>
  const nestedError = (rawError.error ?? rawError) as Record<string, unknown>
  const details = (
    nestedError.details ||
    rawError.details ||
    errorObj.details ||
    (errorObj.response as Record<string, unknown>)?.data
  )

  const detailsList: Array<Record<string, unknown>> = Array.isArray(details)
    ? details
    : Array.isArray((details as Record<string, unknown>)?.details)
    ? ((details as Record<string, unknown>).details as Array<Record<string, unknown>>)
    : []

  const modelLower = currentModel?.toLowerCase() || ''

  // 1. Inspect structured details from Google RPC
  for (const item of detailsList) {
    if (!item || typeof item !== 'object') continue
    const type = String(item['@type'] || '')

    // ErrorInfo: Inspect metadata.quota_limit and quota_metric
    if (type.includes('ErrorInfo')) {
      const metadata = (item.metadata || {}) as Record<string, string>
      const quotaLimit = String(metadata.quota_limit || '').toLowerCase()
      const quotaMetric = String(metadata.quota_metric || '').toLowerCase()

      // Model-specific: contains permodel, per_model, per-model, or matches current model
      if (
        quotaLimit.includes('permodel') ||
        quotaLimit.includes('per_model') ||
        quotaMetric.includes('permodel') ||
        quotaMetric.includes('per_model') ||
        quotaMetric.includes('per_region_per_model') ||
        (modelLower && (quotaLimit.includes(modelLower) || quotaMetric.includes(modelLower)))
      ) {
        return 'model_specific'
      }

      // Project-wide: explicitly contains project/consumer without model
      if (
        (quotaLimit.includes('perproject') ||
          quotaLimit.includes('per_project') ||
          quotaMetric.includes('perproject') ||
          quotaMetric.includes('per_project') ||
          quotaLimit.includes('concurrentrequestsperproject') ||
          quotaLimit.includes('dailyrequestsperproject')) &&
        !quotaLimit.includes('permodel') &&
        !quotaMetric.includes('permodel')
      ) {
        return 'project_wide'
      }
    }

    // QuotaFailure: Inspect violations subject and description
    if (type.includes('QuotaFailure')) {
      const violations = Array.isArray(item.violations) ? item.violations : []
      for (const v of violations) {
        const violation = v as Record<string, unknown>
        const subject = String(violation.subject || '').toLowerCase()
        const description = String(violation.description || '').toLowerCase()

        if (
          subject.includes('models/') ||
          subject.includes('model') ||
          description.includes('permodel') ||
          description.includes('per_model') ||
          description.includes('per-model') ||
          description.includes('per_region_per_model') ||
          (modelLower && (subject.includes(modelLower) || description.includes(modelLower)))
        ) {
          return 'model_specific'
        }

        if (
          (subject.includes('project:') || subject.includes('projects/') || description.includes('project')) &&
          !subject.includes('model') &&
          !description.includes('model') &&
          (description.includes('perproject') ||
            description.includes('per_project') ||
            description.includes('daily request') ||
            description.includes('quota exceeded for project'))
        ) {
          return 'project_wide'
        }
      }
    }
  }

  // 2. Check string messages from error object
  const message = (
    String(errorObj.message || '') +
    ' ' +
    String(nestedError.message || '') +
    ' ' +
    String(rawError.message || '')
  ).toLowerCase()

  if (
    message.includes('permodel') ||
    message.includes('per_model') ||
    message.includes('per-model') ||
    message.includes('per model') ||
    message.includes('models/') ||
    (modelLower && message.includes(`model '${modelLower}'`)) ||
    (modelLower && message.includes(`model "${modelLower}"`)) ||
    (modelLower && message.includes(`model: ${modelLower}`))
  ) {
    return 'model_specific'
  }

  if (
    message.includes('project-wide') ||
    message.includes('project wide') ||
    message.includes('exceeded for project') ||
    message.includes('daily quota exceeded for project') ||
    message.includes('daily requests limit exceeded for project') ||
    message.includes('billing account not found') ||
    message.includes('billing not active') ||
    message.includes('project quota exceeded')
  ) {
    return 'project_wide'
  }

  return 'unknown'
}

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
    // Always prefer the measured high-throughput model (gemini-3.5-flash) as the primary fallback.
    // The rate-limited gemini-3.6-flash (20 req/day limit) is placed last so fast models run first.
    const fallbacks =
      primary === 'gemini-3.5-flash-lite'
        ? ['gemini-3.5-flash', 'gemini-3.6-flash']
        : primary === 'gemini-3.6-flash'
        ? ['gemini-3.5-flash', 'gemini-3.5-flash-lite']
        : ['gemini-3.5-flash-lite', 'gemini-3.6-flash']
    return Array.from(new Set([primary, ...fallbacks]))
  }
  return [primaryModel]
}

/**
 * Calculate attempt timeout and check remaining overall budget.
 * Supports reserving minimum budget for subsequent candidate attempts
 * so an intermediate attempt never starves subsequent fallback models.
 */
export function calculateAttemptBudget(
  attemptIndex: number,
  aiDeadline: number,
  options?: {
    primaryTimeoutMs?: number
    fallbackTimeoutMs?: number
    hasSubsequentCandidates?: boolean
    minViableTimeoutMs?: number
  }
): { attemptTimeoutMs: number; canAttempt: boolean; remainingBudget: number } {
  const remainingBudget = aiDeadline - Date.now()
  if (remainingBudget < MIN_REMAINING_BUDGET_MS) {
    return { attemptTimeoutMs: 0, canAttempt: false, remainingBudget }
  }

  const isPrimary = attemptIndex === 0
  const primaryTimeout = options?.primaryTimeoutMs ?? PRIMARY_TIMEOUT_MS
  const fallbackTimeout = options?.fallbackTimeoutMs ?? FALLBACK_TIMEOUT_MS
  const maxTimeout = isPrimary ? primaryTimeout : fallbackTimeout
  const minViableTimeout = options?.minViableTimeoutMs ?? MIN_VIABLE_ATTEMPT_TIMEOUT_MS

  // If subsequent candidates exist, strictly reserve at least MIN_REMAINING_BUDGET_MS
  const reserveForNext = options?.hasSubsequentCandidates ? MIN_REMAINING_BUDGET_MS : 0
  const usableBudget = remainingBudget - reserveForNext

  // If remaining usable budget cannot provide a viable attempt, halt this candidate
  // to protect the reserved budget for subsequent candidates (e.g. OpenRouter).
  if (usableBudget < minViableTimeout) {
    return { attemptTimeoutMs: 0, canAttempt: false, remainingBudget }
  }

  const attemptTimeoutMs = Math.min(maxTimeout, usableBudget)
  return { attemptTimeoutMs, canAttempt: true, remainingBudget }
}

/**
 * Specialized attempt budget calculation for Recipe Extraction.
 * Uses EXTRACTION_PRIMARY_TIMEOUT_MS (26s) and EXTRACTION_FALLBACK_TIMEOUT_MS (12s).
 */
export function calculateExtractionAttemptBudget(
  attemptIndex: number,
  aiDeadline: number,
  hasSubsequentCandidates: boolean = false
): { attemptTimeoutMs: number; canAttempt: boolean; remainingBudget: number } {
  return calculateAttemptBudget(attemptIndex, aiDeadline, {
    primaryTimeoutMs: EXTRACTION_PRIMARY_TIMEOUT_MS,
    fallbackTimeoutMs: EXTRACTION_FALLBACK_TIMEOUT_MS,
    hasSubsequentCandidates,
    minViableTimeoutMs: MIN_VIABLE_ATTEMPT_TIMEOUT_MS,
  })
}
