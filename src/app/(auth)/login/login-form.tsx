'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/features/auth/actions'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { GoogleIcon } from '@/components/icons/google-icon'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const errorParam = searchParams.get('error')
  const next = searchParams.get('next')

  const activeError = error || errorParam

  async function handleGoogleSignIn() {
    setError(null)
    setGoogleLoading(true)

    try {
      const supabase = createClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
      const callbackUrl = `${origin}/auth/callback${safeNext !== '/' ? `?next=${encodeURIComponent(safeNext)}` : ''}`

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      })

      if (oauthError) {
        setError(oauthError.message || 'Could not initiate Google sign-in.')
        setGoogleLoading(false)
      } else if (data?.url) {
        window.location.href = data.url
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to start Google sign-in.'
      setError(errMsg)
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
      }
    } catch {
      // redirect() throws — this is expected on success
    } finally {
      setLoading(false)
    }
  }

  const isSubmitting = loading || googleLoading

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-serif font-bold tracking-tight lg:hidden">
          Aurelia
        </h1>
        <h2 className="text-section-title">Welcome back</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sign in to continue to your culinary archive.
        </p>
      </div>

      {/* Success message from redirect */}
      {message && (
        <div
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-3.5"
        >
          <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
          <p className="text-sm text-success leading-relaxed">{message}</p>
        </div>
      )}

      {/* Error */}
      {activeError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 animate-fade-in"
        >
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive font-medium leading-relaxed">{activeError}</p>
        </div>
      )}

      {/* Primary OAuth: Continue with Google */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="w-full h-11 rounded-xl border border-border/80 hover:bg-muted/40 font-medium transition-colors flex items-center justify-center gap-3 shadow-xs"
          aria-label="Continue with Google"
        >
          {googleLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span>Connecting to Google…</span>
            </>
          ) : (
            <>
              <GoogleIcon className="h-4 w-4 shrink-0" />
              <span>Continue with Google</span>
            </>
          )}
        </Button>

        {/* Visual Divider */}
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground font-sans">
              Or continue with email
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
              disabled={isSubmitting}
              className="pl-10 h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground transition-colors hover:text-primary font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={isSubmitting}
              className="pl-10 pr-10 h-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="font-semibold text-primary transition-colors hover:text-primary/80"
        >
          Create one
        </Link>
      </p>
    </div>
  )
}

