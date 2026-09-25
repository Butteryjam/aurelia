import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  SafeImage,
  isValidImageUrl,
  isTrustedImageDomain,
} from '@/components/shared/safe-image'

describe('SafeImage Production Hardening Suite', () => {
  describe('isValidImageUrl URL Sanitization & Protocol Validation', () => {
    it('accepts valid HTTPS URLs from external websites', () => {
      expect(isValidImageUrl('https://images.media-allrecipes.com/userphotos/5678.jpg')).toBe(true)
      expect(isValidImageUrl('https://cooking.nytimes.com/recipes/123/image.jpg')).toBe(true)
      expect(isValidImageUrl('https://foodnetwork.com/recipes/dish.png')).toBe(true)
    })

    it('accepts valid HTTP URLs', () => {
      expect(isValidImageUrl('http://localhost:3000/test.jpg')).toBe(true)
      expect(isValidImageUrl('http://example.com/food.png')).toBe(true)
    })

    it('accepts safe relative application URLs starting with a single slash', () => {
      expect(isValidImageUrl('/placeholder-recipe.jpg')).toBe(true)
      expect(isValidImageUrl('/images/chef-hat.svg')).toBe(true)
    })

    it('accepts blob: URLs for local browser image upload previews', () => {
      expect(isValidImageUrl('blob:http://localhost:3000/9876-uuid')).toBe(true)
    })

    it('rejects dangerous pseudo-protocols like javascript: and data:', () => {
      expect(isValidImageUrl("javascript:alert('xss')")).toBe(false)
      expect(isValidImageUrl('JAVASCRIPT:alert(1)')).toBe(false)
      expect(isValidImageUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false)
      expect(isValidImageUrl('file:///etc/passwd')).toBe(false)
      expect(isValidImageUrl('ftp://example.com/pic.jpg')).toBe(false)
    })

    it('rejects protocol-relative double-slash URLs', () => {
      expect(isValidImageUrl('//evil.com/phish.jpg')).toBe(false)
      expect(isValidImageUrl('/\\evil.com/phish.jpg')).toBe(false)
    })

    it('rejects null, undefined, empty, or malformed strings', () => {
      expect(isValidImageUrl(null)).toBe(false)
      expect(isValidImageUrl(undefined)).toBe(false)
      expect(isValidImageUrl('')).toBe(false)
      expect(isValidImageUrl('   ')).toBe(false)
      expect(isValidImageUrl('not-a-valid-url')).toBe(false)
    })
  })

  describe('isTrustedImageDomain Optimization Domain Checker', () => {
    it('identifies Unsplash as a trusted domain for server-side optimization', () => {
      expect(isTrustedImageDomain('https://images.unsplash.com/photo-1546069901-ba9599a7e63c')).toBe(true)
      expect(isTrustedImageDomain('https://plus.unsplash.com/premium_photo.jpg')).toBe(true)
    })

    it('identifies Supabase storage hosts as trusted domains', () => {
      expect(isTrustedImageDomain('https://upzkcqovqstfsizerulx.supabase.co/storage/v1/object/public/recipe-images/foo.jpg')).toBe(true)
      expect(isTrustedImageDomain('https://myproject.supabase.co/storage/v1/object/public/photo.png')).toBe(true)
    })

    it('identifies local development hosts as trusted domains', () => {
      expect(isTrustedImageDomain('http://localhost:3000/local.jpg')).toBe(true)
      expect(isTrustedImageDomain('http://127.0.0.1:3000/local.jpg')).toBe(true)
      expect(isTrustedImageDomain('/relative-path.jpg')).toBe(true)
    })

    it('classifies arbitrary external cooking websites as untrusted (requiring unoptimized client loading)', () => {
      expect(isTrustedImageDomain('https://images.media-allrecipes.com/userphotos/5678.jpg')).toBe(false)
      expect(isTrustedImageDomain('https://cooking.nytimes.com/recipes/123/image.jpg')).toBe(false)
      expect(isTrustedImageDomain('https://assets.bonappetit.com/photos/recipe.jpg')).toBe(false)
      expect(isTrustedImageDomain('https://cdn.foodnetwork.com/dish.jpg')).toBe(false)
    })
  })

  describe('SafeImage Component JSX Rendering & Fallbacks', () => {
    const FallbackPlaceholder = (
      <div data-testid="fallback-placeholder">Chef Hat Fallback</div>
    )

    it('renders trusted Unsplash image with server-side optimization enabled', () => {
      const element = (
        <SafeImage
          src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c"
          alt="Salad Bowl"
          width={400}
          height={300}
          fallback={FallbackPlaceholder}
        />
      )

      expect(React.isValidElement(element)).toBe(true)
      const html = renderToStaticMarkup(element)
      expect(html).toContain('<img')
      expect(html).toContain('alt="Salad Bowl"')
      // Next.js optimizes trusted domains by routing through /_next/image
      expect(html).toContain('/_next/image')
      expect(html).not.toContain('Chef Hat Fallback')
    })

    it('renders external imported recipe image with unoptimized=true without crashing or proxying', () => {
      const externalUrl = 'https://images.media-allrecipes.com/userphotos/5678.jpg'
      const element = (
        <SafeImage
          src={externalUrl}
          alt="Imported Pasta"
          width={400}
          height={300}
          fallback={FallbackPlaceholder}
        />
      )

      expect(React.isValidElement(element)).toBe(true)
      const html = renderToStaticMarkup(element)
      expect(html).toContain('<img')
      expect(html).toContain('alt="Imported Pasta"')
      // Unoptimized direct client loading outputs the original external URL in src
      expect(html).toContain(externalUrl)
      // Must NOT route through /_next/image (which would throw Next.js unconfigured host error)
      expect(html).not.toContain('/_next/image?url=')
    })

    it('immediately renders graceful fallback when src is invalid or malformed', () => {
      const element = (
        <SafeImage
          src="javascript:alert('xss')"
          alt="Malicious Image"
          width={400}
          height={300}
          fallback={FallbackPlaceholder}
        />
      )

      const html = renderToStaticMarkup(element)
      expect(html).toContain('Chef Hat Fallback')
      expect(html).not.toContain('<img')
      expect(html).not.toContain('javascript:')
    })

    it('immediately renders graceful fallback when src is null or empty', () => {
      const nullElement = (
        <SafeImage
          src={null}
          alt="No Image"
          width={400}
          height={300}
          fallback={FallbackPlaceholder}
        />
      )

      const htmlNull = renderToStaticMarkup(nullElement)
      expect(htmlNull).toContain('Chef Hat Fallback')

      const emptyElement = (
        <SafeImage
          src=""
          alt="Empty Image"
          width={400}
          height={300}
          fallback={FallbackPlaceholder}
        />
      )

      const htmlEmpty = renderToStaticMarkup(emptyElement)
      expect(htmlEmpty).toContain('Chef Hat Fallback')
    })

    it('renders img with onError attached and renders fallback when URL is broken or invalid', () => {
      // 1. Initial valid external URL renders <img /> with direct client src
      const initialElement = (
        <SafeImage
          src="https://example.com/broken-image.jpg"
          alt="Broken Link"
          width={400}
          height={300}
          fallback={FallbackPlaceholder}
        />
      )
      const initialHtml = renderToStaticMarkup(initialElement)
      expect(initialHtml).toContain('<img')
      expect(initialHtml).toContain('https://example.com/broken-image.jpg')
      expect(initialHtml).not.toContain('Chef Hat Fallback')

      // 2. Unparseable / broken URL immediately falls back to placeholder
      const brokenElement = (
        <SafeImage
          src="http://[invalid-ipv6-host"
          alt="Broken Link"
          width={400}
          height={300}
          fallback={FallbackPlaceholder}
        />
      )
      const brokenHtml = renderToStaticMarkup(brokenElement)
      expect(brokenHtml).toContain('Chef Hat Fallback')
      expect(brokenHtml).not.toContain('<img')
    })
  })
})
