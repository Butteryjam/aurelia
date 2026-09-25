'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setLoading(true)
    try {
      const result = await forgotPassword(formData)
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
      {/* Back link */}
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Reset your password</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset your password.
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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </div>
  )
}
