import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { ThemeScript } from '@/components/theme-script'
import { fontVariables } from '@/lib/fonts'
import { cn } from '@/lib/utils'
import '@/app/globals.css'
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

// Copie hors cascade de --background : la balise theme-color est lue par l'OS, pas par CSS,
// donc ni var() ni oklch (support inconstant dans cette balise). À resynchroniser si le token change.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await setupLocalePage(params)

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={cn(
        'h-full antialiased scroll-pt-16 motion-safe:scroll-smooth',
        fontVariables,
      )}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeScript />
        <NextIntlClientProvider>
          <Providers>
            <Navbar />
            {children}
            <Footer locale={locale} />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
