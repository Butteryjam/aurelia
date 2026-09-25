'use client'

import React, { useState } from 'react'
import Image, { type ImageProps } from 'next/image'

/**
 * Validates whether an image source string is safe and syntactically valid.
 * Rejects javascript:, data: URIs (unless safe blob), protocol-relative //, and malformed strings.
 */
export function isValidImageUrl(src: string | null | undefined): boolean {
  if (!src || typeof src !== 'string') return false
  const trimmed = src.trim()
  if (!trimmed) return false

  // Allow internal relative paths (e.g., /images/placeholder.jpg)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return true
  }

  // Allow blob URLs from local file selections
  if (trimmed.startsWith('blob:')) {
    return true
  }

  // For absolute URLs, require http: or https:
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Determines whether the image hostname is included in Next.js's configured remotePatterns.
 * Trusted domains can be processed by the Next.js image optimization pipeline.
 * Untrusted / third-party domains MUST be rendered with unoptimized=true to avoid
 * Next.js 'Invalid src prop' crashes and prevent server-side image proxying abuse.
 */
export function isTrustedImageDomain(src: string | null | undefined): boolean {
  if (!src || typeof src !== 'string') return false
  const trimmed = src.trim()

  // Local relative paths are always trusted and handled locally
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return true
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false
    }

    const hostname = parsed.hostname.toLowerCase()

    // 1. Unsplash images
    if (hostname === 'images.unsplash.com' || hostname.endsWith('.unsplash.com')) {
      return true
    }

    // 2. Supabase Storage host
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      try {
        const supabaseHost = new URL(supabaseUrl).hostname.toLowerCase()
        if (hostname === supabaseHost) {
          return true
        }
      } catch {
        // Fall back to default Supabase host matching
      }
    }
    if (hostname === 'upzkcqovqstfsizerulx.supabase.co' || hostname.endsWith('.supabase.co')) {
      return true
    }

    // 3. Localhost development environments
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true
    }

    return false
  } catch {
    return false
  }
}

export interface SafeImageProps extends Omit<ImageProps, 'src' | 'onError'> {
  src: string | null | undefined
  fallback?: React.ReactNode
  unoptimized?: boolean
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
}

/**
 * SafeImage: Production-hardened image component for Aurelia.
 *
 * - Automatically detects trusted vs external domains.
 * - Trusted domains use Next.js server-side optimization.
 * - External imported domains use unoptimized=true (client-direct loading),
 *   preventing Next.js runtime crashes and protecting against SSRF attacks.
 * - Malformed, unsafe, or failed-to-load images gracefully display the fallback.
 */
export function SafeImage({
  src,
  fallback = null,
  unoptimized: explicitUnoptimized,
  onError,
  alt = '',
  ...props
}: SafeImageProps) {
  const [errorSrc, setErrorSrc] = useState<string | null>(null)

  // Verify URL validity
  if (!isValidImageUrl(src)) {
    return <>{fallback}</>
  }

  const cleanSrc = src!.trim()

  // If this specific source previously triggered an error, render fallback
  if (errorSrc === cleanSrc) {
    return <>{fallback}</>
  }

  // Determine optimization strategy
  const shouldBeUnoptimized =
    explicitUnoptimized !== undefined
      ? explicitUnoptimized
      : cleanSrc.startsWith('blob:') || !isTrustedImageDomain(cleanSrc)

  return (
    <Image
      {...props}
      src={cleanSrc}
      alt={alt}
      unoptimized={shouldBeUnoptimized}
      onError={(e) => {
        setErrorSrc(cleanSrc)
        onError?.(e)
      }}
    />
  )
}
