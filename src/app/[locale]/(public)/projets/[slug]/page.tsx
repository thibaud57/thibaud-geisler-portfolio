import { getTranslations } from 'next-intl/server'

import { setupLocalePage } from '@/i18n/locale-guard'

export default async function ProjetDetailPage({
  params,
}: PageProps<'/[locale]/projets/[slug]'>) {
  const { slug } = await setupLocalePage(params)
  const t = await getTranslations('ProjectPage')

  return (
    <main>
      <h1>{t('title', { slug })}</h1>
      <p>{t('placeholder')}</p>
    </main>
  )
}
