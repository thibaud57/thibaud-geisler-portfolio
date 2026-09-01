'use client'

import { useMemo, type ReactNode } from 'react'
import { useLocale } from 'next-intl'
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

import frMessages from '../../messages/fr.json'
import enMessages from '../../messages/en.json'

import { Toaster } from '@/components/ui/sonner'
import { ConsentLanguageSync } from '@/components/cookies/consent-language-sync'
import { buildLegalLinks } from '@/lib/cookies/build-legal-links'

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

// Override des descriptions par défaut de c15t : sa copie générique mentionne mesure
// d'audience et contenu personnalisé, deux traitements que ce site ne fait pas.
// Clone obligatoire : ne pas muter l'objet exporté par la lib.
const consentMessages = structuredClone(baseTranslations)
consentMessages.fr.cookieBanner.description = frMessages.Cookies.bannerDescription
consentMessages.en.cookieBanner.description = enMessages.Cookies.bannerDescription

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
        messages: consentMessages,
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
        slots: {
          consentBannerDescription: '[&_a]:text-primary',
          consentDialogDescription: '[&_a]:text-primary',
        },
      },
    }),
    [locale],
  )

  return (
    <ConsentManagerProvider options={consentOptions}>
      <ConsentLanguageSync />
      {children}
      <ConsentBanner hideBranding legalLinks={['privacyPolicy']} />
      <ConsentDialog hideBranding legalLinks={['privacyPolicy']} />
      <Toaster />
    </ConsentManagerProvider>
  )
}
