'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setLoading(true)
    try {
      const result = await signup(formData)
      if (result?.error) {
        setError(result.error)
      }
    } catch {
      // redirect() throws — expected on success
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
        <h2 className="text-xl font-semibold tracking-tight">Create your account</h2>
        <p className="text-sm text-muted-foreground">
          Start building your personal recipe collection.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3">
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}

      {/* Form */}
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Name</Label>
          <Input
            id="displayName"
            name="displayName"
            type="text"
            placeholder="Your name"
            required
            autoComplete="name"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">
            At least 8 characters, with uppercase, lowercase, and a number.
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
