import { Page, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

export const TEST_USER_A = {
  email: process.env.TEST_USER_A_EMAIL ?? 'user_a_test@recipevault.test',
  password: process.env.TEST_USER_A_PASSWORD ?? 'TestPassword123!',
}

export const TEST_USER_B = {
  email: process.env.TEST_USER_B_EMAIL ?? 'user_b_test@recipevault.test',
  password: process.env.TEST_USER_B_PASSWORD ?? 'TestPassword123!',
}

export function generateRunId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Perform login via UI form at /login
 */
export async function loginViaUI(page: Page, email = TEST_USER_A.email, password = TEST_USER_A.password) {
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')

  // Fill credentials
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)

  // Submit
  await page.click('button[type="submit"]')

  // Verify redirected away from /login to dashboard / or recipes
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
}

/**
 * Returns a Supabase admin client using SUPABASE_SERVICE_ROLE_KEY
 * strictly for administrative auth fixtures like generating deterministic recovery tokens.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase admin credentials missing in environment')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Returns an authenticated Supabase client for a dedicated test user.
 * This client possesses full PostgREST authenticated table privileges under RLS.
 */
export async function getAuthenticatedTestClient(user = TEST_USER_A): Promise<{ client: SupabaseClient; userId: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Supabase environment variables missing in test environment')
  }

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  })

  if (error || !data.user) {
    throw new Error(`Failed to authenticate test client: ${error?.message}`)
  }

  return { client, userId: data.user.id }
}

export async function getTestUserId(email = TEST_USER_A.email): Promise<string> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error || !data?.users) {
    throw new Error(`Failed to list users: ${error?.message}`)
  }
  const user = data.users.find((u) => u.email === email)
  if (!user) {
    throw new Error(`User with email ${email} not found`)
  }
  return user.id
}

/**
 * Deterministically sets up an authenticated recovery session in the browser context
 * exclusively from a server-side Node test fixture.
 * 
 * - admin.auth.admin.generateLink runs strictly in Node with the service-role key
 * - Never passes secrets or action links to page.goto(), browser scripts, or client DOM
 * - Exclusively sets the authenticated SSR cookies directly on browser context
 */
export async function establishRecoverySessionInContext(page: Page, user = TEST_USER_B) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Supabase environment variables missing in test environment')
  }

  const cookieJar: { name: string; value: string; options?: Record<string, unknown> }[] = []
  const ssrClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieJar
      },
      setAll(cookies) {
        cookieJar.push(...cookies)
      },
    },
  })

  // 1. Generate recovery link strictly in Node using the service-role admin fixture
  const admin = getSupabaseAdmin()
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: user.email,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    throw new Error(`Failed to generate recovery token in Node fixture: ${linkError?.message}`)
  }

  // 2. Verify OTP in Node to establish session and obtain SSR cookies
  const { error: otpError } = await ssrClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'recovery',
  })

  if (otpError) {
    throw new Error(`Failed to verify recovery OTP in Node fixture: ${otpError.message}`)
  }

  // 3. Inject standard Supabase SSR cookies directly into the Playwright browser context
  // No secrets are passed through URLs, hashes, console logs, or browser DOM
  await page.context().addCookies(
    cookieJar.map((c) => ({
      name: c.name,
      value: c.value,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }))
  )
}

