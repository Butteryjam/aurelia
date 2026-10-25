import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT: ${url}`)
})
const mockRevalidatePath = vi.fn()

vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('next/cache', () => ({
  revalidatePath: (path: string, type?: 'layout' | 'page') => mockRevalidatePath(path, type),
}))

import * as serverSupabase from '@/lib/supabase/server'
import { login, logout } from '@/features/auth/actions'
import { GET as authCallbackGet } from '@/app/auth/callback/route'
import { GET as recipesListGet } from '@/app/api/recipes-list/route'

describe('Web Account Switching & Cache Invalidation Suite', () => {
  const mockSignOut = vi.fn()
  const mockSignInWithPassword = vi.fn()
  const mockExchangeCode = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(serverSupabase, 'createClient').mockResolvedValue({
      auth: {
        signOut: mockSignOut,
        signInWithPassword: mockSignInWithPassword,
        exchangeCodeForSession: mockExchangeCode,
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
      },
      from: vi.fn().mockImplementation(() => {
        const builder: any = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          contains: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          then: vi.fn().mockImplementation((resolve) => resolve({ data: [], error: null })),
        }
        return builder
      }),
    } as any)
  })

  it('1. logout() signs out and purges route caches across the entire app layout', async () => {
    mockSignOut.mockResolvedValueOnce({ error: null })

    await expect(logout()).rejects.toThrow('NEXT_REDIRECT: /login')

    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('2. login() signs in and purges route caches so new user immediately sees fresh layout', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'user-b-id' }, session: {} },
      error: null,
    })

    const formData = new FormData()
    formData.append('email', 'bob@example.com')
    formData.append('password', 'ValidPassword123!')

    await expect(login(formData)).rejects.toThrow('NEXT_REDIRECT: /')

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'bob@example.com',
      password: 'ValidPassword123!',
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('3. OAuth callback handler purges layout caches upon exchanging authorization code', async () => {
    mockExchangeCode.mockResolvedValueOnce({
      data: { session: {} },
      error: null,
    })

    const req = new Request('https://aurelia.app/auth/callback?code=oauth_auth_code_xyz&next=/recipes')
    const response = await authCallbackGet(req)

    expect(mockExchangeCode).toHaveBeenCalledWith('oauth_auth_code_xyz')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://aurelia.app/recipes')
  })

  it('4. /api/recipes-list sets no-store and no-cache headers to prevent cross-account cache reuse', async () => {
    const response = await recipesListGet()

    expect(response.status).toBe(200)
    const cacheControl = response.headers.get('cache-control')
    expect(cacheControl).toBe('no-store, no-cache, must-revalidate, proxy-revalidate')
  })

  it('5. logout does not invoke database delete operations', async () => {
    const mockFrom = vi.fn()
    vi.spyOn(serverSupabase, 'createClient').mockResolvedValueOnce({
      auth: {
        signOut: mockSignOut,
      },
      from: mockFrom,
    } as any)

    await expect(logout()).rejects.toThrow('NEXT_REDIRECT: /login')
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
