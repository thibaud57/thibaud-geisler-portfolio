import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { env } from '@/env'

import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'
import { OpenCookiePreferencesLink } from '@/components/features/legal/OpenCookiePreferencesButton'
import { SocialLinks } from '@/components/features/contact/SocialLinks'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from '@/i18n/navigation'
import { formatSiret } from '@/lib/legal/format-siret'
import { getPublisher } from '@/server/queries/legal'

import { BrandLogo } from './BrandLogo'

type Props = {
  locale: Locale
}

const legalNavLinkClass = 'transition-colors hover:text-foreground'

export async function Footer({ locale }: Props) {
  const t = await getTranslations('Footer')

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-2 grid-rows-[auto_auto_auto] items-center gap-x-4 gap-y-3 px-4 py-8 sm:gap-x-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="col-start-1 row-start-1">
          <BrandLogo />
        </div>
        <p className="text-sm text-muted-foreground col-start-1 row-start-2">
          {t('tagline')}
        </p>
        <p className="text-sm text-muted-foreground col-start-1 row-start-3">
          {t('location')}
        </p>

        <div className="col-start-2 row-start-1 justify-self-end">
          <SocialLinks />
        </div>
        <p className="text-sm text-muted-foreground col-start-2 row-start-2 text-right">
          {t('cv.label')}
        </p>
        <div className="col-start-2 row-start-3 justify-self-end">
          <DownloadCvButton locale={locale} variant="outline" size="sm" />
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <Suspense fallback={<Skeleton className="h-5 w-64" />}>
            <FooterCopyrightAsync />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-5 w-72" />}>
            <nav
              aria-label={t('legalNav.ariaLabel')}
              className="flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              <Link href="/mentions-legales" className={legalNavLinkClass}>
                {t('legalNav.mentions')}
              </Link>
              <Link href="/confidentialite" className={legalNavLinkClass}>
                {t('legalNav.privacy')}
              </Link>
              <OpenCookiePreferencesLink
                label={t('legalNav.cookies')}
                className={legalNavLinkClass}
              />
            </nav>
          </Suspense>
        </div>
      </div>
    </footer>
  )
}

async function FooterCopyrightAsync() {
  const publisher = await getPublisher()
  return (
    <p>
      © {env.NEXT_PUBLIC_BUILD_YEAR} Thibaud Geisler
      {publisher?.siret && ` - SIRET ${formatSiret(publisher.siret)}`}
    </p>
  )
}
