import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <Sidebar />
      <MobileHeader />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
