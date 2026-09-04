import type { Locale } from 'next-intl'

// Nom de chaque langue dans sa propre langue : ne se traduit pas, d'où l'absence de clé i18n.
export const localeLabels = {
  fr: 'Français',
  en: 'English',
} satisfies Record<Locale, string>
