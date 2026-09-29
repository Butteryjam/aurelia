'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Requests and maintains a Screen Wake Lock while the component is mounted.
 * Progressive enhancement — silently no-ops on browsers that don't support
 * the Wake Lock API or when permission is denied by the user.
 *
 * The lock is automatically re-acquired when the page becomes visible again
 * (e.g. after switching tabs).
 */
export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false)
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    // Check support at runtime only (SSR-safe)
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return
    }

    let released = false

    async function acquire() {
      if (released) return
      try {
        sentinelRef.current = await (navigator as Navigator & {
          wakeLock: { request: (type: string) => Promise<WakeLockSentinel> }
        }).wakeLock.request('screen')
        setIsLocked(true)
        sentinelRef.current.addEventListener('release', () => {
          sentinelRef.current = null
          setIsLocked(false)
        })
      } catch {
        // Denied or unsupported — no-op, Cook Mode still works normally
        setIsLocked(false)
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        acquire()
      } else {
        setIsLocked(false)
      }
    }

    acquire()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      sentinelRef.current?.release().catch(() => {})
      setIsLocked(false)
    }
  }, [])

  return { isLocked }
}
