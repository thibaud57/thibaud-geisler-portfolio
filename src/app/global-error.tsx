'use client'

import { routing } from '@/i18n/routing'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  return (
    <html lang={routing.defaultLocale} suppressHydrationWarning>
      <body>
        <main>
          <h1>Erreur critique</h1>
          <p>TODO: implement global error page</p>
          <button onClick={reset}>Réessayer</button>
        </main>
      </body>
    </html>
  )
}
