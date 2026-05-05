'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useConsentManager } from '@c15t/nextjs'

export function ConsentLanguageSync() {
  const locale = useLocale()
  const { setLanguage } = useConsentManager()

  useEffect(() => {
    setLanguage(locale)
  }, [locale, setLanguage])

  return null
}
