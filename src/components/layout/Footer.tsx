import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { env } from '@/env'

import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'
import { OpenCookiePreferencesButton } from '@/components/features/legal/OpenCookiePreferencesButton'
import { SocialLinks } from '@/components/features/contact/SocialLinks'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from '@/i18n/navigation'
import { formatSiret } from '@/lib/legal/format-siret'
import { getPublisher } from '@/server/queries/legal'

import { BrandLogo } from './BrandLogo'

type Props = {
  locale: Locale
}

export async function Footer({ locale }: Props) {
  const [t, publisher] = await Promise.all([
    getTranslations('Footer'),
    getPublisher(),
  ])

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto grid gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="flex flex-col gap-3">
          <BrandLogo />
          <p className="text-sm text-muted-foreground">{t('tagline')}</p>
          <p className="text-sm text-muted-foreground">{t('location')}</p>
        </div>

        <div className="flex flex-col gap-6 lg:items-end">
          <SocialLinks />
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <p className="text-sm text-muted-foreground">{t('cv.label')}</p>
            <DownloadCvButton locale={locale} variant="outline" size="sm" />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {env.NEXT_PUBLIC_BUILD_YEAR} Thibaud Geisler
            {publisher?.siret && ` - SIRET ${formatSiret(publisher.siret)}`}
          </p>
          <Suspense fallback={<Skeleton className="h-5 w-72" />}>
            <nav
              aria-label={t('legalNav.ariaLabel')}
              className="flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              <Link href="/mentions-legales" className="hover:text-foreground transition-colors">
                {t('legalNav.mentions')}
              </Link>
              <Link href="/confidentialite" className="hover:text-foreground transition-colors">
                {t('legalNav.privacy')}
              </Link>
              <OpenCookiePreferencesButton
                variant="link"
                label={t('legalNav.cookies')}
                className="h-auto px-0 py-0 text-xs font-normal text-muted-foreground transition-colors hover:text-foreground hover:no-underline"
              />
            </nav>
          </Suspense>
        </div>
      </div>
    </footer>
  )
}
