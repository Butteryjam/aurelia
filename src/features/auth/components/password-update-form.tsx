'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updatePassword, completePasswordRecovery } from '../actions'

interface PasswordUpdateFormProps {
  isRecovery?: boolean
  userEmail?: string
}

export function PasswordUpdateForm({ isRecovery = false, userEmail }: PasswordUpdateFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('password', password)
      formData.append('confirmPassword', confirmPassword)

      const result = isRecovery
        ? await completePasswordRecovery(formData)
        : await updatePassword(formData)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setPassword('')
        setConfirmPassword('')
        if (isRecovery) {
          setTimeout(() => {
            router.push('/recipes')
          }, 2000)
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div aria-live="polite" className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-medium">Password updated successfully</p>
            <p className="text-xs opacity-90">
              {isRecovery
                ? 'Your password has been reset. Redirecting to your archive…'
                : 'Your new password is now active.'}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive dark:text-red-400 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {userEmail && (
        <p className="text-xs text-muted-foreground">
          Account: <span className="font-medium text-foreground">{userEmail}</span>
        </p>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="new-password"
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          {isRecovery ? 'New Password' : 'Change Password'}
        </label>
        <div className="relative">
          <Input
            id="new-password"
            name="password"
            type="password"
            placeholder="At least 8 characters with upper, lower, & number"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending || success}
            required
            autoComplete="new-password"
            className="pr-10"
          />
          <KeyRound className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirm-password"
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          Confirm New Password
        </label>
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isPending || success}
          required
          autoComplete="new-password"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Must be at least 8 characters and include uppercase, lowercase, and numeric characters.
      </p>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={isPending || success || !password || !confirmPassword}
          className="w-full sm:w-auto"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isRecovery ? 'Resetting Password…' : 'Updating Password…'}
            </>
          ) : (
            isRecovery ? 'Set New Password & Continue' : 'Update Password'
          )}
        </Button>
      </div>
    </form>
  )
}
