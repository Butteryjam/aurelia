'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navigationItems } from '@/config/navigation'
import { ThemeToggle } from './theme-toggle'
import { logout } from '@/features/auth/actions'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 border-r border-sidebar-border bg-sidebar-background">
      {/* Brand */}
      <div className="flex h-14 items-center px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-serif font-semibold text-foreground tracking-tight">
            Aurelia
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border px-3 py-4 space-y-3">
        <div className="flex items-center justify-between px-3">
          <ThemeToggle />
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
