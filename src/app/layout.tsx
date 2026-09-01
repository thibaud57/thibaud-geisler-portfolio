import type { ReactNode } from 'react'
import { Geist, Geist_Mono, Sansation } from 'next/font/google'
import { getLocale } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'

import { cn } from '@/lib/utils'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
const sansation = Sansation({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-display',
  display: 'swap',
})

// ThemeProvider ici et non sous [locale] : React 19 Activity garde les arbres de route masqués
// montés, une instance par locale réécrirait le thème en redevenant active (next-themes#375).
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        'h-full antialiased scroll-pt-16 motion-safe:scroll-smooth',
        geistSans.variable,
        geistMono.variable,
        sansation.variable,
      )}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
