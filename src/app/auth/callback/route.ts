import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Validate that a redirect target is a safe internal relative path.
 * Rejects protocol-relative URLs (e.g. //attacker.com), backslashes (e.g. /\attacker.com),
 * external schemes (e.g. https://evil.com, javascript:), and control characters.
 */
export function getSafeRedirectUrl(target: string | null, origin: string): string {
  if (!target || typeof target !== 'string') {
    return `${origin}/`
  }

  const trimmed = target.trim()

  // Must begin with a single forward slash, never double slash or backslash
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return `${origin}/`
  }

  // Reject newlines, tabs, and control characters
  if (/[\r\n\t\0]/.test(trimmed)) {
    return `${origin}/`
  }

  try {
    const parsed = new URL(trimmed, origin)
    // Destination must strictly stay on the same origin
    if (parsed.origin !== origin) {
      return `${origin}/`
    }
    return `${origin}${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return `${origin}/`
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next')
  const safeRedirectUrl = getSafeRedirectUrl(rawNext, origin)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(safeRedirectUrl)
    }
  }

  // Redirect to login with error if code exchange fails
  return NextResponse.redirect(`${origin}/login?message=Could not authenticate. Please try again.`)
}
