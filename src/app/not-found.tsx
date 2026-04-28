import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { routing } from '@/i18n/routing'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({
    locale: routing.defaultLocale,
    namespace: 'NotFound',
  })
  return {
    title: t('message'),
    robots: { index: false, follow: false },
  }
}

// Filet ultra-rare : middleware next-intl redirige /foo → /fr/foo, donc
// [locale]/not-found.tsx capture quasi tout. Ce fichier vit hors providers
// (i18n, theme, fonts), d'où locale explicite et Link from 'next/link'.
export default async function RootNotFound() {
  const t = await getTranslations({
    locale: routing.defaultLocale,
    namespace: 'NotFound',
  })

  return (
    <html lang={routing.defaultLocale}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
          <SearchX
            aria-hidden
            className="size-16 text-muted-foreground"
            strokeWidth={1.5}
          />
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h1>
          <p className="text-base text-muted-foreground">{t('description')}</p>
          <Link
            href={`/${routing.defaultLocale}`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
          >
            {t('ctaLabel')}
          </Link>
        </main>
      </body>
    </html>
  )
}
