'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepTimerProps {
  /** Timer duration in seconds from recipe_instructions.timer_duration */
  durationSeconds: number
  className?: string
}

/**
 * Self-contained step countdown timer.
 * - Starts paused; user explicitly starts it.
 * - Does NOT block navigation — navigation just means the timer unmounts.
 * - Uses setInterval + useRef to avoid stale closures.
 * - Large tap targets for mobile cooking use.
 */
export function StepTimer({ durationSeconds, className }: StepTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const remainingRef = useRef(durationSeconds)

  // Keep ref in sync so setInterval callback always has fresh value
  useEffect(() => {
    remainingRef.current = remaining
  }, [remaining])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setRunning(false)
  }, [])

  const start = useCallback(() => {
    if (intervalRef.current) return // Already running
    setFinished(false)
    setRunning(true)
    intervalRef.current = setInterval(() => {
      const next = remainingRef.current - 1
      if (next <= 0) {
        setRemaining(0)
        setFinished(true)
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        setRunning(false)
        // Best-effort browser notification (no service worker needed)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Timer done!', { body: 'Your cooking step timer has finished.' })
        }
      } else {
        setRemaining(next)
      }
    }, 1000)
  }, [])

  const reset = useCallback(() => {
    stop()
    setRemaining(durationSeconds)
    setFinished(false)
  }, [durationSeconds, stop])

  // Cleanup on unmount — does NOT block navigation
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const progress = durationSeconds > 0 ? ((durationSeconds - remaining) / durationSeconds) * 100 : 0

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border p-4 transition-colors',
        finished
          ? 'border-emerald-500/40 bg-emerald-500/10'
          : 'border-primary/20 bg-primary/5',
        className
      )}
    >
      {/* Progress ring / time display */}
      <div className="relative flex h-20 w-20 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            strokeWidth="5"
            className="stroke-muted"
          />
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
            className={cn(
              'transition-all duration-1000',
              finished ? 'stroke-emerald-500' : 'stroke-primary'
            )}
          />
        </svg>
        <span className={cn(
          'text-lg font-bold tabular-nums',
          finished ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
        )}>
          {finished ? <Bell className="h-6 w-6" /> : formatTime(remaining)}
        </span>
      </div>

      {finished && (
        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Time&apos;s up!
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Reset timer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={running ? stop : start}
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            finished
              ? 'bg-emerald-500 hover:bg-emerald-600'
              : 'bg-primary hover:bg-primary/90'
          )}
          aria-label={running ? 'Pause timer' : 'Start timer'}
        >
          {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}
