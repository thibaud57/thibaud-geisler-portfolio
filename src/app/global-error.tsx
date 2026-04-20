'use client'

import { useEffect, useState } from 'react'

import { routing } from '@/i18n/routing'

type Locale = (typeof routing.locales)[number]

// Messages hardcodés : global-error vit hors de NextIntlClientProvider et
// peut se déclencher quand next-intl lui-même crash. Garder ce fichier
// indépendant du runtime i18n pour rester affichable en dernier recours.
const messages = {
  fr: {
    title: 'Erreur critique',
    message: 'Une erreur critique est survenue. Veuillez réessayer.',
    retry: 'Réessayer',
  },
  en: {
    title: 'Critical error',
    message: 'A critical error occurred. Please try again.',
    retry: 'Retry',
  },
} satisfies Record<Locale, Record<string, string>>

function detectLocale(): Locale {
  if (typeof window === 'undefined') return routing.defaultLocale
  const segment = window.location.pathname.split('/')[1]
  return routing.locales.find((loc) => loc === segment) ?? routing.defaultLocale
}

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error: _error, reset }: Props) {
  const [locale, setLocale] = useState<Locale>(routing.defaultLocale)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- locale dépend de window.location, disponible uniquement après mount
  useEffect(() => setLocale(detectLocale()), [])

  const t = messages[locale]

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <main>
          <h1>{t.title}</h1>
          <p>{t.message}</p>
          <button onClick={reset}>{t.retry}</button>
        </main>
      </body>
    </html>
  )
}
