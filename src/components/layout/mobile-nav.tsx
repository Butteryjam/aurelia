'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, CalendarDays, ChefHat, ShoppingCart, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMobileMenu } from './mobile-menu-store'

export function MobileNav() {
  const pathname = usePathname()
  const { open } = useMobileMenu()

  const primaryTabs = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Recipes', href: '/recipes', icon: BookOpen },
    { label: 'Planner', href: '/meal-planner', icon: CalendarDays },
    { label: 'AI Chef', href: '/ai-chef', icon: ChefHat },
    { label: 'Shopping', href: '/shopping', icon: ShoppingCart },
  ] as const

  const isMoreActive =
    pathname.startsWith('/collections') ||
    pathname.startsWith('/settings')

  return (
    <nav
      role="navigation"
      aria-label="Mobile Primary Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 lg:hidden pb-[env(safe-area-inset-bottom,0px)] shadow-lg select-none"
    >
      <div className="flex items-center justify-around px-1 py-1">
        {primaryTabs.map((item) => {
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
                'group relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 px-1 min-h-[48px] min-w-[44px] rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
              )}
            >
              {/* Active pill background */}
              <div
                className={cn(
                  'flex items-center justify-center h-7 w-10 rounded-full transition-all',
                  isActive ? 'bg-primary/15 text-primary shadow-2xs' : 'bg-transparent'
                )}
              >
                <Icon className={cn('h-4.5 w-4.5 transition-transform group-active:scale-95', isActive ? 'stroke-[2.2]' : 'stroke-[1.7]')} />
              </div>
              <span className={cn('text-[10px] tracking-tight leading-none truncate max-w-[54px]', isActive ? 'font-bold' : 'font-medium')}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* More / Menu Drawer trigger */}
        <button
          type="button"
          onClick={open}
          aria-label="More navigation destinations (Collections, Settings, New Recipe)"
          aria-haspopup="dialog"
          className={cn(
            'group relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 px-1 min-h-[48px] min-w-[44px] rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isMoreActive
              ? 'text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-center h-7 w-10 rounded-full transition-all',
              isMoreActive ? 'bg-primary/15 text-primary shadow-2xs' : 'bg-transparent'
            )}
          >
            <MoreHorizontal className={cn('h-4.5 w-4.5 transition-transform group-active:scale-95', isMoreActive ? 'stroke-[2.2]' : 'stroke-[1.7]')} />
          </div>
          <span className={cn('text-[10px] tracking-tight leading-none truncate max-w-[54px]', isMoreActive ? 'font-bold' : 'font-medium')}>
            More
          </span>
        </button>
      </div>
    </nav>
  )
}
