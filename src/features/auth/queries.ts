import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

export type Profile = Tables<'profiles'>

export interface ProfileUpdate {
  display_name?: string | null
  avatar_url?: string | null
  dietary_preferences?: string[] | null
  measurement_system?: 'metric' | 'imperial'
}

/**
 * Get the current user's profile.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  return data
}

/**
 * Update the current user's profile.
 */
export async function updateProfile(updates: ProfileUpdate): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  return data
}
