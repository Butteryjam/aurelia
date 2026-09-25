'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema, forgotPasswordSchema, updatePasswordSchema } from '@/lib/validators/auth'

export interface AuthResult {
  error?: string
}

/**
 * Classify a Supabase auth error into a safe, user-facing message.
 * The raw error details are logged server-side by the caller — this
 * function only returns strings that are safe to show in the browser.
 */
function classifyAuthError(error: { message: string; status?: number; code?: string }): string {
  const msg = error.message.toLowerCase()

  if (error.status === 429 || msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (msg.includes('weak password') || msg.includes('password')) {
    return 'Password does not meet requirements. Use at least 6 characters.'
  }
  if (msg.includes('email') && (msg.includes('send') || msg.includes('deliver'))) {
    return 'We could not send the email. Please try again shortly.'
  }
  if (error.status && error.status >= 500) {
    return 'The service is temporarily unavailable. Please try again later.'
  }

  return 'Unable to complete the request. Please try again.'
}

export async function login(formData: FormData): Promise<AuthResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Incorrect email or password.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Please verify your email address before signing in.' }
    }
    console.error('[auth/login]', { code: error.code, status: error.status, message: error.message })
    return { error: classifyAuthError(error) }
  }

  redirect('/')
}

export async function signup(formData: FormData): Promise<AuthResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    displayName: formData.get('displayName'),
  }

  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.displayName,
      },
    },
  })

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      return { error: 'This email is already registered. Try signing in instead.' }
    }
    console.error('[auth/signup]', { code: error.code, status: error.status, message: error.message })
    return { error: classifyAuthError(error) }
  }

  redirect('/login?message=Check your email to confirm your account.')
}

export async function forgotPassword(formData: FormData): Promise<AuthResult> {
  const raw = { email: formData.get('email') }

  const parsed = forgotPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/settings?mode=recovery`,
  })

  if (error) {
    console.error('[auth/forgotPassword]', { code: error.code, status: error.status, message: error.message })
    return { error: classifyAuthError(error) }
  }

  redirect('/login?message=Check your email for a password reset link.')
}

export interface PasswordActionResult {
  success?: boolean
  error?: string
}

/**
 * Handle standard password update for an authenticated user on /settings.
 */
export async function updatePassword(formData: FormData): Promise<PasswordActionResult> {
  const raw = {
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const parsed = updatePasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid password input.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to change your password.' }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    console.error('[auth/updatePassword]', { code: error.code, status: error.status, message: error.message })
    return { error: classifyAuthError(error) }
  }

  return { success: true }
}

/**
 * Handle password reset from a recovery link.
 * Strictly verifies the recovery session exists and is valid.
 */
export async function completePasswordRecovery(formData: FormData): Promise<PasswordActionResult> {
  const raw = {
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const parsed = updatePasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid password input.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: 'Your password reset link is invalid or has expired. Please request a new reset link.',
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    console.error('[auth/completePasswordRecovery]', { code: error.code, status: error.status, message: error.message })
    return { error: classifyAuthError(error) }
  }

  return { success: true }
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
