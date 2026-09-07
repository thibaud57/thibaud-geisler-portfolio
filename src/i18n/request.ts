import { hasLocale } from "next-intl"
import { getRequestConfig } from "next-intl/server"
import { locale as rootLocale } from "next/root-params"
import type messagesShape from "../../messages/fr.json"
import { routing } from "./routing"

export default getRequestConfig(async ({ locale: override }) => {
  // `override` est renseigné quand un appel force la locale (`getTranslations({locale: "en"})`).
  // Sinon on lit le segment racine `[locale]` : `rootLocale()` remplace `requestLocale`, déprécié.
  // Il rend `undefined` hors du segment (global-not-found.tsx), d'où le repli sur defaultLocale.
  const requested = override ?? (await rootLocale())
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  const { default: messages } = (await import(`../../messages/${locale}.json`)) as {
    default: typeof messagesShape
  }

  return {
    locale,
    messages,
  }
})
