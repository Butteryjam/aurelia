'use client'

import Link from 'next/link'
import { Menu, LogOut, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navigationItems } from '@/config/navigation'
import { ThemeToggle } from './theme-toggle'
import { logout } from '@/features/auth/actions'

export function MobileHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-serif font-semibold text-foreground tracking-tight">
            Aurelia
          </span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors after:absolute after:-inset-1 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            className="fixed inset-y-0 right-0 z-50 w-72 bg-background border-l border-border shadow-xl animate-slide-in-right"
          >
            <div className="flex h-14 items-center justify-between px-4">
              <span className="text-sm font-semibold">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors after:absolute after:-inset-1 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="px-3 py-2 space-y-1">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 border-t border-border px-3 py-4 space-y-3">
              <div className="flex items-center justify-between px-3">
                <span className="text-xs text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-accent/50 hover:text-foreground transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}
