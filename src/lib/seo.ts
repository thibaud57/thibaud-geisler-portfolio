import { hasLocale, type Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'

// TODO: déplacer vers src/env.ts (t3-env + Zod) quand la config env centralisée sera mise en place.
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

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
