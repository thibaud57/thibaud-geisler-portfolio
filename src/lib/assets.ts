import type { Locale } from 'next-intl'

export function buildAssetUrl(filename: string): string {
  return `/api/assets/${filename}`
}

const CV_FILENAMES = {
  fr: 'cv-thibaud-geisler-fr.pdf',
  en: 'cv-thibaud-geisler-en.pdf',
} as const satisfies Record<Locale, string>

export const CV_DOWNLOAD_FILENAME = 'CV_Thibaud_Geisler.pdf'

export function buildCvUrl(locale: Locale): string {
  return buildAssetUrl(`documents/cv/${CV_FILENAMES[locale]}`)
}
