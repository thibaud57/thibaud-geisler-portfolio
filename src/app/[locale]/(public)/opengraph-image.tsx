import { ImageResponse } from 'next/og'

import { setupLocaleMetadata } from '@/lib/seo'
import { loadOgFonts } from '@/lib/seo/og-fonts'
import { OgTemplate } from '@/lib/seo/og-template'

export const runtime = 'nodejs'

export const alt = 'Thibaud Geisler · Portfolio IA & développement full-stack'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const [{ locale, t }, fonts] = await Promise.all([
    setupLocaleMetadata(params),
    loadOgFonts(),
  ])

  return new ImageResponse(
    (
      <OgTemplate
        kind="site"
        locale={locale}
        title={t('siteTitle')}
        subtitle={t('siteDescription')}
      />
    ),
    {
      ...size,
      fonts,
    },
  )
}
