import { getTranslations } from 'next-intl/server'

import { setupLocalePage } from '@/i18n/locale-guard'

export default async function AProposPage({ params }: PageProps<'/[locale]/a-propos'>) {
  await setupLocalePage(params)
  const t = await getTranslations('AboutPage')

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('placeholder')}</p>
    </main>
  )
}
