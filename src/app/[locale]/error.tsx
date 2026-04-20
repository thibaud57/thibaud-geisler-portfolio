'use client'

import { useTranslations } from 'next-intl'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error: _error, reset }: Props) {
  const t = useTranslations('ErrorPage')
  const tCommon = useTranslations('Common')

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('message')}</p>
      <button onClick={reset}>{tCommon('retry')}</button>
    </main>
  )
}
