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
 * - Large tap targets for mobile cooking use (standing distance).
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
  const isPaused = !running && !finished && remaining < durationSeconds

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3.5 rounded-2xl border p-5 transition-all shadow-xs',
        finished
          ? 'border-emerald-500/50 bg-emerald-500/10'
          : running
            ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
            : isPaused
              ? 'border-amber-500/40 bg-amber-500/5'
              : 'border-border/80 bg-card/60',
        className
      )}
    >
      {/* Progress ring / time display */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            strokeWidth="6"
            className="stroke-muted/60"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
            className={cn(
              'transition-all duration-1000',
              finished
                ? 'stroke-emerald-500'
                : running
                  ? 'stroke-primary'
                  : 'stroke-amber-500'
            )}
          />
        </svg>

        <div className="flex flex-col items-center justify-center text-center">
          <span
            className={cn(
              'text-2xl font-bold font-mono tracking-tight tabular-nums',
              finished
                ? 'text-emerald-600 dark:text-emerald-400'
                : running
                  ? 'text-primary'
                  : 'text-foreground'
            )}
          >
            {finished ? (
              <Bell className="h-8 w-8 animate-bounce text-emerald-500" />
            ) : (
              formatTime(remaining)
            )}
          </span>
          {isPaused && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Paused
            </span>
          )}
        </div>
      </div>

      {finished && (
        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-fade-in">
          Time&apos;s up! Ready for the next action.
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/80 bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Reset timer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={running ? stop : start}
          className={cn(
            'flex h-12 min-w-[56px] px-5 items-center justify-center gap-2 rounded-xl text-white font-medium transition-all active:scale-95 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            finished
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : running
                ? 'bg-primary hover:bg-primary/90'
                : 'bg-primary hover:bg-primary/90'
          )}
          aria-label={running ? 'Pause timer' : 'Start timer'}
        >
          {running ? (
            <>
              <Pause className="h-4 w-4" />
              <span className="text-xs font-semibold">Pause</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span className="text-xs font-semibold">{isPaused ? 'Resume' : 'Start'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
