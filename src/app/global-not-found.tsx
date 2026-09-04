import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { fontVariables } from '@/lib/fonts'
import { routing } from '@/i18n/routing'
import { themeInitScript } from '@/lib/theme-script'
import '@/app/globals.css'

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

// Filet ultra-rare (experimental.globalNotFound) : URLs qui ne matchent aucune route.
// Le middleware next-intl redirige /foo → /fr/foo, donc [locale]/not-found.tsx capture
// quasi tout. Ce fichier rend son propre document, hors du root layout [locale] et de
// ses providers, d'où locale explicite, Link from 'next/link' et import CSS local.
export default async function GlobalNotFound() {
  const t = await getTranslations({
    locale: routing.defaultLocale,
    namespace: 'NotFound',
  })

  return (
    <html lang={routing.defaultLocale} className={fontVariables}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
          <SearchX
            aria-hidden
            className="size-16 text-muted-foreground"
            strokeWidth={1.5}
          />
          <h1>{t('title')}</h1>
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
