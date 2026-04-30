'use client'

import { AlertTriangle } from 'lucide-react'
import { hasLocale } from 'next-intl'
import { useSyncExternalStore } from 'react'

import { routing } from '@/i18n/routing'

type Locale = (typeof routing.locales)[number]

// Messages hardcodés : global-error vit hors de NextIntlClientProvider et
// peut se déclencher quand next-intl lui-même crash. Garder ce fichier
// indépendant du runtime i18n pour rester affichable en dernier recours.
// Le titre diverge volontairement de Metadata.ErrorPage.title (« Erreur »)
// pour signaler un crash root layout plus grave qu'une erreur applicative.
const messages = {
  fr: {
    title: 'Erreur critique',
    description:
      'Une erreur critique est survenue. Veuillez réessayer ou revenir à l\'accueil.',
    retry: 'Réessayer',
    home: 'Retour à l\'accueil',
  },
  en: {
    title: 'Critical error',
    description:
      'A critical error occurred. Please retry or head back home.',
    retry: 'Retry',
    home: 'Back to home',
  },
} satisfies Record<Locale, Record<string, string>>

function getClientLocale(): Locale {
  const segment = window.location.pathname.split('/')[1]
  return hasLocale(routing.locales, segment) ? segment : routing.defaultLocale
}

// Pas de souscription : global-error ne survit pas à une navigation popstate.
const subscribe = () => () => {}
const getServerLocale = (): Locale => routing.defaultLocale

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  // TODO post-MVP : envoyer error à Sentry (cf. PRODUCTION.md > Monitoring)
  void error
  const locale = useSyncExternalStore(subscribe, getClientLocale, getServerLocale)
  const t = messages[locale]

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
          <AlertTriangle
            aria-hidden
            className="size-16 text-destructive"
            strokeWidth={1.5}
          />
          <h1>{t.title}</h1>
          <p className="text-base text-muted-foreground">{t.description}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
            >
              {t.retry}
            </button>
            <a
              href={`/${locale}`}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
            >
              {t.home}
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
