import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface MobileAuthResult {
  user: User | null
  supabase: SupabaseClient<Database> | null
  error: string | null
}

/**
 * Authenticates a mobile request bearing an Authorization: Bearer <token> header.
 * Instantiates a scoped Supabase client with the user's JWT so Postgres RLS
 * policies and auth.uid() are properly recognized.
 */
export async function authenticateMobileRequest(request: Request): Promise<MobileAuthResult> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return {
      user: null,
      supabase: null,
      error: 'Missing or malformed Authorization header. Please provide a Bearer token.',
    }
  }

  const token = authHeader.substring(7).trim()
  if (!token) {
    return {
      user: null,
      supabase: null,
      error: 'Bearer token is empty.',
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[mobile-auth] Supabase environment variables are missing on the server.')
    return {
      user: null,
      supabase: null,
      error: 'Server configuration error.',
    }
  }

  // Create a client with the user's token attached to every outgoing PostgREST call
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  // Validate the token against Supabase Auth
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    return {
      user: null,
      supabase: null,
      error: error?.message || 'Invalid or expired session token.',
    }
  }

  return { user, supabase, error: null }
}
