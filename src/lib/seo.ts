import type { Metadata } from 'next'
import { hasLocale, type Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'

// TODO: déplacer vers src/env.ts (t3-env + Zod) quand la config env centralisée sera mise en place.
function resolveSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

export const siteUrl = resolveSiteUrl()

export const localeToOgLocale = {
  fr: 'fr_FR',
  en: 'en_US',
} as const satisfies Record<Locale, string>

export function buildLanguageAlternates(path: string, base = ''): Record<string, string> {
  return {
    ...Object.fromEntries(
      routing.locales.map((locale) => [locale, `${base}/${locale}${path}`]),
    ),
    'x-default': `${base}/${routing.defaultLocale}${path}`,
  }
}

export async function setupLocaleMetadata<T extends { locale: string }>(
  params: Promise<T>,
) {
  const resolved = await params
  if (!hasLocale(routing.locales, resolved.locale)) notFound()
  const locale: Locale = resolved.locale
  const t = await getTranslations({ locale, namespace: 'Metadata' })
  return { ...resolved, locale, t }
}

export type BuildPageMetadataInput = {
  locale: Locale
  path: string
  title: string
  description: string
  siteName: string
  ogType?: 'website' | 'article'
}

export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  siteName,
  ogType = 'website',
}: BuildPageMetadataInput): Metadata {
  const url = `${resolveSiteUrl()}/${locale}${path}`
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    title,
    description,
    openGraph: {
      type: ogType,
      locale: localeToOgLocale[locale],
      url,
      siteName,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: url,
      languages: buildLanguageAlternates(path),
    },
    ...(isProduction ? {} : { robots: { index: false, follow: false } }),
  }
}
