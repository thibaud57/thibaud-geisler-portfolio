"use client"

import { useEffect } from "react"
import { useLocale } from "next-intl"
import { useSetLanguage } from "c15t/next"

export function ConsentLanguageSync() {
  const locale = useLocale()
  const setLanguage = useSetLanguage()

  useEffect(() => {
    setLanguage(locale)
  }, [locale, setLanguage])

  return null
}
