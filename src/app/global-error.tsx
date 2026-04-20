'use client'

import { routing } from '@/i18n/routing'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error: _error, reset }: Props) {
  return (
    <html lang={routing.defaultLocale} suppressHydrationWarning>
      <body>
        <main>
          <h1>Erreur critique</h1>
          <p>Une erreur critique est survenue. Veuillez réessayer.</p>
          <button onClick={reset}>Réessayer</button>
        </main>
      </body>
    </html>
  )
}
