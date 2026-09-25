'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const message = searchParams.get('message')

  async function handleSubmit(formData: FormData) {
    setError(null)
    setLoading(true)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-serif font-bold tracking-tight lg:hidden">
          Aurelia
        </h1>
        <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Sign in to your account to continue.</p>
      </div>

      {/* Success message from redirect */}
      {message && (
        <div aria-live="polite" className="rounded-md border border-success/20 bg-success/10 px-4 py-3">
          <p className="text-sm text-success">{message}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}

      {/* Form */}
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="font-medium text-primary transition-colors hover:text-primary/80"
        >
          Sign up
        </Link>
      </p>
    </div>
  )
}
