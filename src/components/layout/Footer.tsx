import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { env } from '@/env'

import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'
import { OpenCookiePreferencesLink } from '@/components/features/legal/OpenCookiePreferencesButton'
import { SocialLinks } from '@/components/features/contact/SocialLinks'
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
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-x-8 gap-y-3 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto] lg:items-center lg:px-8">
        <div className="lg:col-start-1 lg:row-start-1">
          <BrandLogo />
        </div>
        <p className="text-sm text-muted-foreground lg:col-start-1 lg:row-start-2">
          {t('tagline')}
        </p>
        <p className="text-sm text-muted-foreground lg:col-start-1 lg:row-start-3">
          {t('location')}
        </p>

        <div className="mt-5 lg:col-start-2 lg:row-start-1 lg:mt-0 lg:justify-self-end">
          <SocialLinks />
        </div>
        <p className="text-sm text-muted-foreground lg:col-start-2 lg:row-start-2 lg:text-right">
          {t('cv.label')}
        </p>
        <div className="lg:col-start-2 lg:row-start-3 lg:justify-self-end">
          <DownloadCvButton locale={locale} variant="outline" size="sm" />
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <FooterCopyrightAsync />
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
