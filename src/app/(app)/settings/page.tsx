import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { PasswordUpdateForm } from '@/features/auth/components/password-update-form'
import { ShieldCheck, User, Mail, KeyRound, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SettingsPageProps {
  searchParams: Promise<{
    mode?: string
    message?: string
  }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { mode } = await searchParams
  const isRecovery = mode === 'recovery'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If in recovery mode but no session is active, the recovery token expired or was invalid
  if (isRecovery && !user) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <PageHeader
          title="Password Reset"
          description="Update your credentials to secure your Aurelia account."
        />

        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-destructive/10 p-2.5 text-destructive shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                Password Reset Link Expired or Invalid
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For your security, password recovery links are time-limited and single-use. The link you
                followed has expired or is no longer valid.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button asChild variant="default">
              <Link href="/forgot-password" className="inline-flex items-center gap-2">
                Request a New Reset Link
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={isRecovery ? 'Reset Your Password' : 'Account Settings'}
        description={
          isRecovery
            ? 'Set a new password for your account to complete recovery.'
            : 'Manage your profile and security credentials.'
        }
      />

      {isRecovery && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200 flex items-start gap-3">
          <KeyRound className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium">Password Recovery Mode</p>
            <p className="text-xs opacity-90">
              You are updating the password for {user?.email}. Enter a new strong password below.
            </p>
          </div>
        </div>
      )}

      {/* Account Info Card (only in normal settings mode) */}
      {!isRecovery && user && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Account Profile</h2>
              <p className="text-xs text-muted-foreground">Your authenticated account credentials</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-sm pt-1">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Email Address
              </span>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email ?? 'Unknown'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Account Security
              </span>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="h-4 w-4" />
                <span>Active & Verified</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Management Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {isRecovery ? 'Set New Password' : 'Change Password'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Ensure your account is protected with a unique, secure password
            </p>
          </div>
        </div>

        <PasswordUpdateForm isRecovery={isRecovery} userEmail={user?.email} />
      </div>
    </div>
  )
}
