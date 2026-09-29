'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, ChefHat, Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navigationItems } from '@/config/navigation'
import { ThemeToggle } from './theme-toggle'
import { logout } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'

export interface SidebarProps {
  userProfile?: {
    displayName?: string | null
    email?: string | null
    avatarUrl?: string | null
  } | null
}

export function Sidebar({ userProfile }: SidebarProps) {
  const pathname = usePathname()

  const displayName = userProfile?.displayName?.trim() || 'Culinary Member'
  const email = userProfile?.email?.trim() || null
  const initial = displayName.charAt(0).toUpperCase() || 'A'

  return (
    <aside
      aria-label="Desktop Primary Navigation"
      className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-sidebar-border bg-sidebar-background/95 backdrop-blur-md z-30 transition-all select-none"
    >
      {/* 1. Brand Identity Header */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border/60">
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-xl py-1 px-1 -mx-1"
          aria-label="Aurelia Home"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs transition-transform group-hover:scale-105">
            <ChefHat className="h-5 w-5 stroke-[1.8]" />
          </div>
          <div className="space-y-0">
            <span className="text-xl font-serif font-bold text-foreground tracking-tight leading-none">
              Aurelia
            </span>
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-muted-foreground/80 block mt-0.5">
              Culinary Archive
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Primary Quick Action */}
      <div className="px-3.5 pt-4 pb-2 space-y-1.5">
        <Button
          asChild
          size="sm"
          className="w-full h-10 gap-2 rounded-xl text-xs font-semibold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-all min-h-[40px]"
        >
          <Link href="/recipes/new">
            <Plus className="h-4 w-4" />
            <span>New Recipe</span>
          </Link>
        </Button>
        <Link
          href="/recipes/import"
          className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring rounded-lg"
        >
          <Sparkles className="h-3 w-3 text-primary" />
          <span>Import with AI</span>
        </Link>
      </div>

      {/* 3. Navigation Items (Sourced from config/navigation.ts) */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Main Navigation">
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
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium min-h-[44px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
              )}
            >
              {/* Subtle active left indicator dot/pill */}
              {isActive && (
                <span
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary"
                  aria-hidden="true"
                />
              )}
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              <span className="flex-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* 4. Authenticated User Identity Section */}
      <div className="border-t border-sidebar-border px-3.5 pt-3 pb-1">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 p-2 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/60 hover:bg-sidebar-accent/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group"
          aria-label={`Settings for ${displayName}`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/25 font-serif font-bold text-xs shadow-2xs group-hover:scale-105 transition-transform">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {displayName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {email || 'Personal Archive'}
            </p>
          </div>
        </Link>
      </div>

      {/* 5. Footer: Theme Control & Sign Out */}
      <div className="px-3.5 pb-4 pt-1 space-y-1.5">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-muted-foreground">Theme</span>
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
    </aside>
  )
}
