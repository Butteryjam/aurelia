import type { NextConfig } from 'next'

function getSupabaseHostname(): string {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      return new URL(supabaseUrl).hostname
    }
  } catch {
    // Fall back to known Aurelia Supabase project hostname
  }
  return 'upzkcqovqstfsizerulx.supabase.co'
}

const supabaseHost = getSupabaseHostname()

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
  },
  {
    protocol: 'https',
    hostname: supabaseHost,
  },
  {
    protocol: 'http',
    hostname: '127.0.0.1',
  },
  {
    protocol: 'http',
    hostname: 'localhost',
  },
]

// Ensure the specific production project host is explicitly present
if (supabaseHost !== 'upzkcqovqstfsizerulx.supabase.co') {
  remotePatterns.push({
    protocol: 'https',
    hostname: 'upzkcqovqstfsizerulx.supabase.co',
  })
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
}

export default nextConfig
