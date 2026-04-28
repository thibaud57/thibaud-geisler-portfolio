import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'
import { SocialLinks } from '@/components/features/contact/SocialLinks'

import { BrandLogo } from './BrandLogo'

type Props = {
  locale: Locale
}

export async function Footer({ locale }: Props) {
  const t = await getTranslations('Footer')

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
          <p>© {process.env.NEXT_PUBLIC_BUILD_YEAR} Thibaud Geisler</p>

          {/* TODO(feature-7-conformite-legale): nav légale (mentions, confidentialité, cookies) */}
        </div>
      </div>
    </footer>
  )
}
