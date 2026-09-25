import 'server-only'
import { createClient } from '@/lib/supabase/server'

interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
}

const LIMITS: Record<'extraction' | 'modification' | 'chat', RateLimitConfig> = {
  extraction: {
    maxRequests: 10,
    windowSeconds: 5 * 60, // 10 per 5 minutes
  },
  modification: {
    maxRequests: 15,
    windowSeconds: 5 * 60, // 15 per 5 minutes
  },
  chat: {
    maxRequests: 30,
    windowSeconds: 10 * 60, // 30 per 10 minutes
  },
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
}

/**
 * Check if the user is within rate limits for a given AI operation.
 * Backed by PostgreSQL advisory-locked atomic stored procedure.
 *
 * FAILS CLOSED (FAILS SAFELY): If the database or RPC is unreachable,
 * it returns allowed: false to prevent accidental bypass under degraded conditions.
 */
export async function checkRateLimit(
  action: 'extraction' | 'modification' | 'chat'
): Promise<RateLimitResult> {
  const config = LIMITS[action]

  try {
    const supabase = await createClient()

    // Identity is strictly validated and derived from auth.uid() inside the database function
    const { data, error } = await supabase.rpc('check_ai_rate_limit', {
      p_action: action,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    })

    if (error) {
      console.error('[RateLimiter] Database RPC error:', error.message)
      // Fail closed: protect AI services from abuse if rate-limiting backend errors
      return { allowed: false, retryAfterSeconds: 60 }
    }

    if (!data || typeof data !== 'object') {
      return { allowed: false, retryAfterSeconds: 60 }
    }

    const res = data as { allowed?: boolean; retry_after_seconds?: number }
    return {
      allowed: !!res.allowed,
      retryAfterSeconds: res.retry_after_seconds ? Number(res.retry_after_seconds) : undefined,
    }
  } catch (err) {
    console.error('[RateLimiter] Unexpected failure during rate-limit check:', err)
    // Fail safely rather than disabling protection
    return { allowed: false, retryAfterSeconds: 60 }
  }
}
