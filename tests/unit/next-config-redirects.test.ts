import { describe, it, expect } from 'vitest'
import nextConfig from '../../next.config'

describe('Next.js Config Redirects', () => {
  it('defines a redirect from /favorites to /recipes?favorite=true', async () => {
    expect(nextConfig.redirects).toBeDefined()
    if (!nextConfig.redirects) return

    const redirects = await nextConfig.redirects()
    const favRedirect = redirects.find((r) => r.source === '/favorites')

    expect(favRedirect).toBeDefined()
    expect(favRedirect?.destination).toBe('/recipes?favorite=true')
    expect(favRedirect?.permanent).toBe(false)
  })

  it('does not alter or define unintended redirects', async () => {
    if (!nextConfig.redirects) return
    const redirects = await nextConfig.redirects()
    expect(redirects).toHaveLength(1)
  })
})
