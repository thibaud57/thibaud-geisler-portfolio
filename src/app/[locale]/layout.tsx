import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { Footer } from '@/components/layout/Footer'
import { Navbar } from '@/components/layout/Navbar'
import { Providers } from '@/app/providers'
import { routing } from '@/i18n/routing'
import { setupLocalePage } from '@/i18n/locale-guard'
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
  siteUrl,
} from '@/lib/seo'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)

  return {
    metadataBase: new URL(siteUrl),
    title: {
      template: `%s | ${t('siteTitle')}`,
      default: t('siteTitle'),
    },
    description: t('siteDescription'),
    openGraph: {
      locale: localeToOgLocale[locale],
      siteName: t('siteTitle'),
    },
    twitter: {
      card: 'summary_large_image',
    },
    alternates: {
      languages: buildLanguageAlternates(''),
    },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
  ],
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await setupLocalePage(params)

  return (
    <NextIntlClientProvider>
      <Providers>
        <Navbar />
        {children}
        <Footer locale={locale} />
      </Providers>
    </NextIntlClientProvider>
  )
}
