import { getTranslations } from 'next-intl/server'

export default async function NotFound() {
  const t = await getTranslations('NotFound')

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('message')}</p>
    </main>
  )
}
