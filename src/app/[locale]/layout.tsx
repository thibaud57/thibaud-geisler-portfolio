import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { Geist, Geist_Mono, Sansation } from 'next/font/google'
import { cn } from '@/lib/utils'
import { Footer } from '@/components/layout/Footer'
import { Navbar } from '@/components/layout/Navbar'
import { Providers } from '@/components/providers/Providers'
import { routing } from '@/i18n/routing'
import { setupLocalePage } from '@/i18n/locale-guard'
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
  siteUrl,
} from '@/lib/seo'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
const sansation = Sansation({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-display',
  display: 'swap',
})

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
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        'h-full antialiased',
        geistSans.variable,
        geistMono.variable,
        sansation.variable,
      )}
    >
      <body className="min-h-full flex flex-col font-sans">
        <NextIntlClientProvider>
          <Providers>
            <Navbar />
            {children}
            <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
