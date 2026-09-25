'use client'

import { useSyncExternalStore } from 'react'

function subscribe(query: string) {
  return (callback: () => void) => {
    const media = window.matchMedia(query)
    media.addEventListener('change', callback)
    return () => media.removeEventListener('change', callback)
  }
}

function getSnapshot(query: string) {
  return () => window.matchMedia(query).matches
}

function getServerSnapshot() {
  return false
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(subscribe(query), getSnapshot(query), () => getServerSnapshot())
}
