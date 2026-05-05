'use client'

import { useEffect, useEffectEvent } from 'react'
import { useLocale } from 'next-intl'
import { useConsentManager } from '@c15t/nextjs'

export function ConsentLanguageSync() {
  const locale = useLocale()
  const { setLanguage } = useConsentManager()

  // c15t 2.0.4 ne garantit plus une identité stable des fonctions retournées par
  // useConsentManager() entre renders ; `useEffectEvent` isole l'appel pour que
  // l'effect ne re-tire que sur changement de locale, sinon boucle infinie en
  // prod minifié (masquée en dev par React StrictMode).
  const syncLanguage = useEffectEvent(() => {
    setLanguage(locale)
  })

  useEffect(() => {
    syncLanguage()
  }, [locale])

  return null
}
