import { DM_Sans, Playfair_Display } from 'next/font/google'

export const fontSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const fontSerif = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})
