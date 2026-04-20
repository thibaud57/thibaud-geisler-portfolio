import { getTranslations } from 'next-intl/server'

import { setupLocalePage } from '@/i18n/locale-guard'

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  await setupLocalePage(params)
  const t = await getTranslations('HomePage')

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('placeholder')}</p>
    </main>
  )
}
