'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useServerInsertedHTML } from 'next/navigation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThemeProviderProps {
  children: ReactNode
  /** HTML attribute modified based on the active theme. Default: "class" */
  attribute?: string | 'class'
  /** Default theme name. Default: "system" when enableSystem is true */
  defaultTheme?: string
  /** Whether to switch between dark/light based on prefers-color-scheme */
  enableSystem?: boolean
  /** Whether to set document.documentElement.style.colorScheme */
  enableColorScheme?: boolean
  /** Disable all CSS transitions when switching themes */
  disableTransitionOnChange?: boolean
  /** Key used to store theme in localStorage */
  storageKey?: string
  /** List of available theme names */
  themes?: string[]
  /** Forced theme name for the current page */
  forcedTheme?: string
}

export interface UseThemeReturn {
  theme: string | undefined
  setTheme: (theme: string) => void
  resolvedTheme: string | undefined
  themes: string[]
  systemTheme: 'dark' | 'light' | undefined
  forcedTheme: string | undefined
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<UseThemeReturn | undefined>(undefined)

const defaultContext: UseThemeReturn = {
  theme: undefined,
  setTheme: () => {},
  resolvedTheme: undefined,
  themes: [],
  systemTheme: undefined,
  forcedTheme: undefined,
}

export function useTheme(): UseThemeReturn {
  return useContext(ThemeContext) ?? defaultContext
}

// ---------------------------------------------------------------------------
// Anti-FOUC script (runs before React hydrates)
// ---------------------------------------------------------------------------
// This IIFE reads localStorage and applies the theme class/attribute to <html>
// before the first paint, preventing a flash of the wrong theme.

const MEDIA_QUERY = '(prefers-color-scheme: dark)'

function getAntiFlickerScript(
  attribute: string,
  storageKey: string,
  defaultTheme: string,
  enableSystem: boolean,
  enableColorScheme: boolean,
  themes: string[],
  forcedTheme?: string,
): string {
  const themeValues = JSON.stringify(themes)

  return `(function(){
  try {
    var d = document.documentElement;
    var themes = ${themeValues};
    var forced = ${forcedTheme ? `'${forcedTheme}'` : 'null'};
    var resolved = forced;

    if (!resolved) {
      var stored = localStorage.getItem('${storageKey}');
      var theme = stored || '${defaultTheme}';
      resolved = theme;

      if (theme === 'system' && ${enableSystem ? 'true' : 'false'}) {
        resolved = window.matchMedia('${MEDIA_QUERY}').matches ? 'dark' : 'light';
      }
    }

    ${
      attribute === 'class'
        ? `for (var i = 0; i < themes.length; i++) { d.classList.remove(themes[i]); }
    if (resolved) d.classList.add(resolved);`
        : `if (resolved) d.setAttribute('${attribute}', resolved);`
    }

    ${
      enableColorScheme
        ? `if (resolved === 'dark' || resolved === 'light') {
      d.style.colorScheme = resolved;
    }`
        : ''
    }
  } catch (e) {}
})()`
}

// ---------------------------------------------------------------------------
// External Stores for React 19 / SSR Hydration Safety
// ---------------------------------------------------------------------------

function createThemeStore(storageKey: string, defaultTheme: string, forcedTheme?: string) {
  const listeners = new Set<() => void>()

  const emit = () => {
    listeners.forEach((listener) => listener())
  }

  const subscribe = (callback: () => void) => {
    listeners.add(callback)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        emit()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      listeners.delete(callback)
      window.removeEventListener('storage', handleStorage)
    }
  }

  const getSnapshot = (): string => {
    if (forcedTheme) return forcedTheme
    try {
      return localStorage.getItem(storageKey) || defaultTheme
    } catch {
      return defaultTheme
    }
  }

  const getServerSnapshot = (): string | undefined => {
    return forcedTheme
  }

  const setTheme = (nextTheme: string) => {
    try {
      localStorage.setItem(storageKey, nextTheme)
    } catch {
      // localStorage may fail in restricted environments
    }
    emit()
  }

  return { subscribe, getSnapshot, getServerSnapshot, setTheme }
}

const systemThemeStore = {
  subscribe: (callback: () => void) => {
    if (typeof window === 'undefined') return () => {}
    const mq = window.matchMedia(MEDIA_QUERY)
    mq.addEventListener('change', callback)
    return () => mq.removeEventListener('change', callback)
  },
  getSnapshot: (): 'dark' | 'light' => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light'
  },
  getServerSnapshot: (): 'dark' | 'light' | undefined => {
    return undefined
  },
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme: defaultThemeProp,
  enableSystem = true,
  enableColorScheme = true,
  disableTransitionOnChange = false,
  storageKey = 'theme',
  themes: themesProp = ['light', 'dark'],
  forcedTheme,
}: ThemeProviderProps) {
  const defaultTheme = defaultThemeProp ?? (enableSystem ? 'system' : 'light')
  const allThemes = useMemo(
    () => (enableSystem ? [...themesProp, 'system'] : themesProp),
    [enableSystem, themesProp],
  )

  // Track whether the anti-FOUC script has been injected (once per SSR render)
  const scriptInjected = useRef(false)

  // Inject the anti-FOUC script via useServerInsertedHTML — this places the
  // <script> in the streamed HTML outside the React component tree, which is
  // the correct approach for Next.js 16+ / React 19.
  useServerInsertedHTML(() => {
    if (scriptInjected.current) return null
    scriptInjected.current = true

    return (
      <script
        key="theme-script"
        dangerouslySetInnerHTML={{
          __html: getAntiFlickerScript(
            attribute,
            storageKey,
            defaultTheme,
            enableSystem,
            enableColorScheme,
            themesProp,
            forcedTheme,
          ),
        }}
      />
    )
  })

  // Theme store for subscription without cascading setState inside effects
  const store = useMemo(
    () => createThemeStore(storageKey, defaultTheme, forcedTheme),
    [storageKey, defaultTheme, forcedTheme],
  )

  const rawTheme = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )

  const theme = useMemo(() => {
    if (!rawTheme) return undefined
    return allThemes.includes(rawTheme) ? rawTheme : defaultTheme
  }, [rawTheme, allThemes, defaultTheme])

  const rawSystemTheme = useSyncExternalStore(
    systemThemeStore.subscribe,
    systemThemeStore.getSnapshot,
    systemThemeStore.getServerSnapshot,
  )

  const systemTheme = enableSystem ? rawSystemTheme : undefined

  // Compute resolved theme
  const resolvedTheme = useMemo(() => {
    if (forcedTheme) return forcedTheme
    if (!theme) return undefined
    if (theme === 'system') {
      return enableSystem ? (systemTheme ?? 'light') : defaultTheme
    }
    return theme
  }, [forcedTheme, theme, enableSystem, systemTheme, defaultTheme])

  // Apply theme to DOM
  const applyTheme = useCallback(
    (resolved: string) => {
      const d = document.documentElement

      let cleanup: (() => void) | null = null
      if (disableTransitionOnChange) {
        const style = document.createElement('style')
        style.appendChild(
          document.createTextNode(
            '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}',
          ),
        )
        document.head.appendChild(style)
        cleanup = () => {
          window.getComputedStyle(document.body)
          setTimeout(() => {
            if (style.parentNode) {
              style.parentNode.removeChild(style)
            }
          }, 1)
        }
      }

      if (attribute === 'class') {
        for (const t of themesProp) {
          d.classList.remove(t)
        }
        if (resolved) d.classList.add(resolved)
      } else {
        if (resolved) {
          d.setAttribute(attribute, resolved)
        } else {
          d.removeAttribute(attribute)
        }
      }

      if (enableColorScheme && (resolved === 'dark' || resolved === 'light')) {
        d.style.colorScheme = resolved
      }

      cleanup?.()
    },
    [attribute, themesProp, enableColorScheme, disableTransitionOnChange],
  )

  // Apply theme to DOM whenever resolvedTheme changes
  useEffect(() => {
    if (resolvedTheme) {
      applyTheme(resolvedTheme)
    }
  }, [resolvedTheme, applyTheme])

  const setTheme = useCallback(
    (value: string) => {
      if (!allThemes.includes(value)) return
      store.setTheme(value)
    },
    [allThemes, store],
  )

  const contextValue = useMemo<UseThemeReturn>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      themes: allThemes,
      systemTheme,
      forcedTheme,
    }),
    [theme, setTheme, resolvedTheme, allThemes, systemTheme, forcedTheme],
  )

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}
