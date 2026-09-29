import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { getProfile } from '@/features/auth/queries'
import { SettingsView } from '@/features/auth/components/settings-view'
import { AlertCircle, ArrowRight } from 'lucide-react'
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
      <div className="mx-auto max-w-2xl space-y-8 animate-fade-up">
        <PageHeader
          title="Password Reset"
          description="Update your credentials to secure your Aurelia account."
        />

        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 space-y-4 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-destructive/10 p-2.5 text-destructive shrink-0">
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
            <Button asChild variant="default" className="min-h-[44px] rounded-xl px-5">
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

  const profile = user ? await getProfile() : null

  return (
    <SettingsView
      user={{
        id: user?.id ?? '',
        email: user?.email,
        created_at: user?.created_at,
        user_metadata: user?.user_metadata,
      }}
      initialProfile={profile}
      isRecovery={isRecovery}
    />
  )
}
