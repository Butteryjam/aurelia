import type { Metadata } from 'next'
import { fontSans, fontSerif } from '@/styles/fonts'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from 'sonner'
import './globals.css'

const defaultAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aurelia.app'
const appUrl = defaultAppUrl.startsWith('http')
  ? new URL(defaultAppUrl)
  : new URL(`https://${defaultAppUrl}`)

export const metadata: Metadata = {
  metadataBase: appUrl,
  title: {
    default: 'Aurelia — Your personal culinary archive',
    template: '%s — Aurelia',
  },
  description:
    'Your personal culinary archive. Store, organize, scale, and cook with intelligent meal planning, interactive Cook Mode timers, and an AI Chef.',
  applicationName: 'Aurelia',
  authors: [{ name: 'Aurelia' }],
  keywords: ['recipes', 'cooking', 'AI chef', 'meal planning', 'grocery list', 'culinary archive', 'aurelia'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: appUrl,
    siteName: 'Aurelia',
    title: 'Aurelia — Your personal culinary archive',
    description:
      'Your personal culinary archive. Store, organize, scale, and cook with intelligent meal planning, interactive Cook Mode timers, and an AI Chef.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aurelia — Your personal culinary archive',
    description:
      'Your personal culinary archive. Store, organize, scale, and cook with intelligent meal planning, interactive Cook Mode timers, and an AI Chef.',
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontSerif.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background font-sans antialiased">
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: 'border border-border bg-card text-card-foreground',
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
