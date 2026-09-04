'use client'

import { useLocale } from 'next-intl'

import { localeLabels } from '@/i18n/locale-labels'
import { Link, usePathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

type Props = {
  className?: string
}

// Lien <a href> réel vers l'autre langue : le menu du LanguageSwitcher n'existe pas dans le HTML
// tant qu'il est fermé, donc les crawlers ne voyaient aucun lien entre les deux versions.
export function FooterLanguageLink({ className }: Props) {
  const locale = useLocale()
  const pathname = usePathname()
  const otherLocale = routing.locales.find((candidate) => candidate !== locale)
  if (!otherLocale) return null

  return (
    <Link href={pathname} locale={otherLocale} hrefLang={otherLocale} className={className}>
      {localeLabels[otherLocale]}
    </Link>
  )
}
