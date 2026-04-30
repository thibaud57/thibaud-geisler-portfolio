'use client'

import { useMemo, type ReactNode } from 'react'
import { useLocale } from 'next-intl'
import { ThemeProvider } from 'next-themes'
import {
  ConsentManagerProvider,
  ConsentBanner,
  ConsentDialog,
  type ConsentManagerOptions,
} from '@c15t/nextjs'
import { baseTranslations } from '@c15t/translations/all'
// Importé ici (pas dans globals.css) car c15t chaîne 3 packages CSS via @import et Lightning CSS
// Tailwind 4 ne suit pas la résolution npm transitive ; bundler Next.js le fait correctement.
import '@c15t/nextjs/styles.css'

import { Toaster } from '@/components/ui/sonner'
import { ConsentLanguageSync } from '@/components/cookies/consent-language-sync'
import { buildLegalLinks } from '@/lib/cookies/build-legal-links'

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

const themeColors = {
  primary: 'var(--primary)',
  primaryHover: 'var(--primary)',
  surface: 'var(--card)',
  surfaceHover: 'var(--muted)',
  border: 'var(--border)',
  text: 'var(--foreground)',
  textMuted: 'var(--muted-foreground)',
  textOnPrimary: 'var(--primary-foreground)',
  switchTrackActive: 'var(--primary)',
} as const

export function Providers({ children }: { children: ReactNode }) {
  const locale = useLocale()
  const consentOptions = useMemo<ConsentManagerOptions>(
    () => ({
      mode: 'offline',
      overrides: { country: 'FR' },
      consentCategories: ['necessary', 'marketing'],
      i18n: {
        locale,
        detectBrowserLanguage: false,
        messages: baseTranslations,
      },
      legalLinks: buildLegalLinks(locale),
      theme: {
        colors: themeColors,
        // Sans theme.dark explicite, c15t injecte ses defaults en :root.dark qui battent nos overrides par spécificité.
        dark: themeColors,
        radius: {
          md: 'var(--radius)',
        },
        typography: {
          fontFamily: 'var(--font-sans)',
        },
      },
    }),
    [locale],
  )

  return (
    <ConsentManagerProvider options={consentOptions}>
      <ConsentLanguageSync />
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <ConsentBanner hideBranding />
        <ConsentDialog hideBranding />
        <Toaster />
      </ThemeProvider>
    </ConsentManagerProvider>
  )
}
