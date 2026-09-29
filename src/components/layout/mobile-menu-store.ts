'use client'

import { useSyncExternalStore } from 'react'

/**
 * Global lightweight hydration-safe store for mobile navigation drawer state.
 * Allows synchronized opening/closing from both MobileHeader and MobileNav.
 */

let isMenuOpen = false
const listeners = new Set<() => void>()

export function openMobileMenu() {
  if (isMenuOpen) return
  isMenuOpen = true
  listeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // ignore
    }
  })
}

export function closeMobileMenu() {
  if (!isMenuOpen) return
  isMenuOpen = false
  listeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // ignore
    }
  })
}

export function toggleMobileMenu() {
  if (isMenuOpen) {
    closeMobileMenu()
  } else {
    openMobileMenu()
  }
}

export function subscribeMobileMenu(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getMobileMenuSnapshot(): boolean {
  return isMenuOpen
}

export function getMobileMenuServerSnapshot(): boolean {
  return false
}

export function useMobileMenu() {
  const isOpen = useSyncExternalStore(
    subscribeMobileMenu,
    getMobileMenuSnapshot,
    getMobileMenuServerSnapshot
  )

  return {
    isOpen,
    open: openMobileMenu,
    close: closeMobileMenu,
    toggle: toggleMobileMenu,
  }
}
