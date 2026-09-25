'use client'

import { ThemeProvider as ThemeProviderImpl } from './theme-context'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProviderImpl attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProviderImpl>
  )
}
