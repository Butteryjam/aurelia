'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, LogOut, X, ChefHat, Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navigationItems } from '@/config/navigation'
import { ThemeToggle } from './theme-toggle'
import { logout } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'
import { useMobileMenu } from './mobile-menu-store'

export interface MobileHeaderProps {
  userProfile?: {
    displayName?: string | null
    email?: string | null
    avatarUrl?: string | null
  } | null
}

export function MobileHeader({ userProfile }: MobileHeaderProps) {
  const { isOpen, close, toggle } = useMobileMenu()
  const pathname = usePathname()
  const drawerRef = useRef<HTMLDivElement>(null)

  const displayName = userProfile?.displayName?.trim() || 'Culinary Member'
  const email = userProfile?.email?.trim() || null
  const initial = displayName.charAt(0).toUpperCase() || 'A'

  // Handle keyboard events (Escape to close) and focus trapping
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  return (
    <>
      {/* Sticky Mobile Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur-md px-4 lg:hidden select-none">
        <Link
          href="/"
          className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1 -m-1"
          aria-label="Aurelia Home"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-2xs">
            <ChefHat className="h-4.5 w-4.5 stroke-[1.8]" />
          </div>
          <span className="text-lg font-serif font-bold text-foreground tracking-tight">
            Aurelia
          </span>
        </Link>

        {/* Right Action Affordances */}
        <div className="flex items-center gap-1.5">
          <Link
            href="/recipes/new"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-foreground hover:bg-accent hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="New Recipe"
          >
            <Plus className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-foreground hover:bg-accent hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open navigation menu"
            aria-expanded={isOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Refined Mobile Navigation Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in lg:hidden"
            onClick={close}
            aria-hidden="true"
          />

          {/* Drawer Body */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-card border-l border-border shadow-dialog flex flex-col animate-slide-in-right overflow-hidden lg:hidden"
          >
            {/* Drawer Header */}
            <div className="flex h-14 items-center justify-between px-5 border-b border-border/70 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <ChefHat className="h-4 w-4 stroke-[1.8]" />
                </div>
                <span className="font-serif font-bold text-base text-foreground tracking-tight">
                  Culinary Navigation
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Actions inside Drawer */}
            <div className="p-4 border-b border-border/60 space-y-2 shrink-0 bg-muted/20">
              <Button
                asChild
                size="sm"
                className="w-full h-10 gap-2 rounded-xl text-xs font-semibold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all min-h-[40px]"
                onClick={close}
              >
                <Link href="/recipes/new">
                  <Plus className="h-4 w-4" />
                  <span>New Recipe</span>
                </Link>
              </Button>
              <Link
                href="/recipes/import"
                onClick={close}
                className="flex items-center justify-center gap-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors rounded-lg min-h-[36px]"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Import with AI</span>
              </Link>
            </div>

            {/* Navigation Destinations */}
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto" aria-label="Mobile Drawer Navigation">
              {navigationItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium min-h-[44px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                        : 'text-foreground/75 hover:bg-accent/60 hover:text-foreground'
                    )}
                  >
                    {isActive && (
                      <span
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      className={cn(
                        'h-4.5 w-4.5 shrink-0 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* User Identity Section */}
            <div className="border-t border-border/70 px-4 pt-3 pb-2 shrink-0 bg-muted/10">
              <Link
                href="/settings"
                onClick={close}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/80 hover:bg-accent/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/25 font-serif font-bold text-xs shadow-2xs">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {email || 'Culinary Member'}
                  </p>
                </div>
              </Link>
            </div>

            {/* Drawer Footer: Theme & Sign Out */}
            <div className="border-t border-border/70 p-4 space-y-2 shrink-0 bg-background/50">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-muted-foreground">Appearance</span>
                <ThemeToggle />
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Sign out</span>
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}
