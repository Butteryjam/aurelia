import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSafeRedirectUrl, GET } from '@/app/auth/callback/route'
import * as serverSupabase from '@/lib/supabase/server'

describe('Web Google Auth & Callback Suite', () => {
  const origin = 'https://aurelia-gamma-one.vercel.app'

  describe('1. Safe Redirect URL Sanitization (getSafeRedirectUrl)', () => {
    it('allows valid relative internal paths', () => {
      expect(getSafeRedirectUrl('/recipes', origin)).toBe(`${origin}/recipes`)
      expect(getSafeRedirectUrl('/settings?mode=recovery', origin)).toBe(
        `${origin}/settings?mode=recovery`
      )
      expect(getSafeRedirectUrl('/recipes/rec-123#ingredients', origin)).toBe(
        `${origin}/recipes/rec-123#ingredients`
      )
    })

    it('defaults to origin root for null, undefined, or empty inputs', () => {
      expect(getSafeRedirectUrl(null, origin)).toBe(`${origin}/`)
      expect(getSafeRedirectUrl('', origin)).toBe(`${origin}/`)
      expect(getSafeRedirectUrl('   ', origin)).toBe(`${origin}/`)
    })

    it('rejects external URL targets', () => {
      expect(getSafeRedirectUrl('https://evil.com/steal-token', origin)).toBe(`${origin}/`)
      expect(getSafeRedirectUrl('http://phishing.site', origin)).toBe(`${origin}/`)
      expect(getSafeRedirectUrl('javascript:alert(1)', origin)).toBe(`${origin}/`)
    })

    it('rejects protocol-relative and backslash bypass attempts', () => {
      expect(getSafeRedirectUrl('//evil.com', origin)).toBe(`${origin}/`)
      expect(getSafeRedirectUrl('///evil.com', origin)).toBe(`${origin}/`)
      expect(getSafeRedirectUrl('/\\evil.com', origin)).toBe(`${origin}/`)
      expect(getSafeRedirectUrl('\\evil.com', origin)).toBe(`${origin}/`)
    })

    it('rejects inputs containing control characters or whitespace injections', () => {
      expect(getSafeRedirectUrl('/recipes\r\nHeader-Injection: 1', origin)).toBe(`${origin}/`)
      expect(getSafeRedirectUrl('/path\0nullbyte', origin)).toBe(`${origin}/`)
      expect(getSafeRedirectUrl('/tab\tinjection', origin)).toBe(`${origin}/`)
    })
  })

  describe('2. OAuth Callback Route Handler (GET)', () => {
    const mockExchangeCode = vi.fn()

    beforeEach(() => {
      vi.clearAllMocks()
      vi.spyOn(serverSupabase, 'createClient').mockResolvedValue({
        auth: {
          exchangeCodeForSession: mockExchangeCode,
        },
      } as any)
    })

    it('exchanges authorization code and redirects to target next path on success', async () => {
      mockExchangeCode.mockResolvedValueOnce({ data: { session: {} }, error: null })

      const req = new Request(`${origin}/auth/callback?code=valid_auth_code_123&next=/recipes`)
      const res = await GET(req)

      expect(mockExchangeCode).toHaveBeenCalledWith('valid_auth_code_123')
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toBe(`${origin}/recipes`)
    })

    it('handles user cancellation gracefully', async () => {
      const req = new Request(
        `${origin}/auth/callback?error=access_denied&error_description=User+cancelled+the+sign-in+process`
      )
      const res = await GET(req)

      expect(mockExchangeCode).not.toHaveBeenCalled()
      expect(res.status).toBe(307)
      const location = res.headers.get('location')!
      expect(location).toContain('/login?error=')
      expect(decodeURIComponent(location)).toContain('Google sign-in was cancelled.')
    })

    it('handles provider-level error responses with clear message', async () => {
      const req = new Request(
        `${origin}/auth/callback?error=server_error&error_description=Google+OAuth+service+temporarily+unavailable`
      )
      const res = await GET(req)

      expect(mockExchangeCode).not.toHaveBeenCalled()
      expect(res.status).toBe(307)
      const location = res.headers.get('location')!
      expect(decodeURIComponent(location)).toContain(
        'Google OAuth service temporarily unavailable'
      )
    })

    it('redirects to login with error when code exchange fails', async () => {
      mockExchangeCode.mockResolvedValueOnce({
        data: null,
        error: { message: 'Auth code has expired or is invalid', status: 400 },
      })

      const req = new Request(`${origin}/auth/callback?code=expired_code`)
      const res = await GET(req)

      expect(mockExchangeCode).toHaveBeenCalledWith('expired_code')
      expect(res.status).toBe(307)
      const location = res.headers.get('location')!
      expect(decodeURIComponent(location)).toContain('Could not authenticate. Please try again.')
    })

    it('redirects to login with error when both code and error are missing', async () => {
      const req = new Request(`${origin}/auth/callback`)
      const res = await GET(req)

      expect(mockExchangeCode).not.toHaveBeenCalled()
      expect(res.status).toBe(307)
      const location = res.headers.get('location')!
      expect(decodeURIComponent(location)).toContain('Could not authenticate. Please try again.')
    })
  })
})
