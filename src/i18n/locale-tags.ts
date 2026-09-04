import type { Locale } from 'next-intl'

// Source unique locale → région : BCP 47 pour le HTML et le JSON-LD, dérivé en format Open Graph.
export const localeToLanguageTag = {
  fr: 'fr-FR',
  en: 'en-US',
} as const satisfies Record<Locale, string>

export const localeToOgLocale = {
  fr: localeToLanguageTag.fr.replace('-', '_'),
  en: localeToLanguageTag.en.replace('-', '_'),
} satisfies Record<Locale, string>
