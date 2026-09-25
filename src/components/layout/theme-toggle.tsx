'use client'

import { useSyncExternalStore } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/components/providers/theme-context'
import { cn } from '@/lib/utils'

const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  )

  const options = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ] as const

  return (
    <div className="flex items-center gap-0.5 rounded-full bg-muted p-0.5">
      {options.map(({ value, icon: Icon, label }) => {
        const isActive = isHydrated && theme === value

        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              'relative inline-flex h-7 w-8 items-center justify-center rounded-full text-muted-foreground transition-all after:absolute after:-inset-1.5 after:content-[\'\'] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isActive && 'bg-background text-foreground shadow-sm'
            )}
            title={label}
            aria-label={`Switch to ${label} theme`}
            aria-pressed={isActive}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        )
      })}
    </div>
  )
}
