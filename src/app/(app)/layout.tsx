import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/features/auth/queries'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let userProfile: { displayName?: string | null; email?: string | null; avatarUrl?: string | null } | null = null

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const profile = await getProfile().catch(() => null)
      userProfile = {
        displayName:
          profile?.display_name ||
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Chef',
        email: user.email || null,
        avatarUrl: profile?.avatar_url || null,
      }
    }
  } catch {
    // Gracefully handle SSR or auth timeout without failing layout render
  }

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <Sidebar userProfile={userProfile} />
      <MobileHeader userProfile={userProfile} />
      <main className="lg:pl-64 transition-all">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
