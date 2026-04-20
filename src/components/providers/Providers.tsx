'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'

// Faux positif React 19 × next-themes 0.4.6 : next-themes injecte un <script> inline
// pour éviter le FOUC, React 19 warne à tort (le script s'exécute bien en SSR).
// Workaround communautaire accepté, dev-only, filtre le message exact.
// Refs : https://github.com/pacocoursey/next-themes/issues/387
//        https://github.com/shadcn-ui/ui/issues/10104
// À retirer quand next-themes publie un fix (repo inactif depuis mars 2025).
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalConsoleError = console.error
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Encountered a script tag while rendering React component')
    ) {
      return
    }
    originalConsoleError.apply(console, args)
  }
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
