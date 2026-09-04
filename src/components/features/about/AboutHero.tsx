import Image from 'next/image'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'
import { LeadParagraph } from '@/components/ui/lead-paragraph'
import { buildAssetUrl } from '@/lib/assets'
import { cn } from '@/lib/utils'

type Props = {
  locale: Locale
  className?: string
  children?: ReactNode
}

export async function AboutHero({ locale, className, children }: Props) {
  const t = await getTranslations('AboutPage.hero')

  return (
    <section
      className={cn(
        'grid gap-6 lg:grid-cols-2 lg:items-center lg:px-4',
        className,
      )}
    >
      <div className="order-1 mx-auto flex w-full max-w-sm flex-col gap-4 lg:order-2 lg:mx-0 lg:max-w-md lg:justify-self-end">
        <Image
          src={buildAssetUrl('branding/portrait.jpg')}
          alt={t('portraitAlt')}
          width={480}
          height={480}
          preload
          sizes="(max-width: 1024px) 80vw, 480px"
          className="aspect-square w-full rounded-xl object-cover"
        />
        <DownloadCvButton locale={locale} className="w-full" />
      </div>

      <div className="order-2 flex flex-col items-start gap-6 text-left lg:order-1">
        <h1 className="text-balance text-center lg:text-left">
          {t.rich('headline', {
            accent: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </h1>
        <LeadParagraph>{t('tagline')}</LeadParagraph>
        {children}
      </div>
    </section>
  )
}
