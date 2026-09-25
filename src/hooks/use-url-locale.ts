"use client"

import { hasLocale, type Locale } from "next-intl"
import { useSyncExternalStore } from "react"

import { routing } from "@/i18n/routing"

function getUrlLocale(): Locale {
  const segment = window.location.pathname.split("/")[1]
  return hasLocale(routing.locales, segment) ? segment : routing.defaultLocale
}

// Pas de souscription : les pages qui l'emploient ne survivent pas à une navigation popstate.
// eslint-disable-next-line @typescript-eslint/no-empty-function -- no-op requis par la signature useSyncExternalStore
const subscribe = () => () => {}
const getServerLocale = (): Locale => routing.defaultLocale

// Pour les pages hors du layout [locale] (global-error, global-not-found), que next-intl ne voit
// pas : la locale se lit dans l'URL, après l'hydratation, la locale par défaut servant au rendu serveur.
export function useUrlLocale(): Locale {
  return useSyncExternalStore(subscribe, getUrlLocale, getServerLocale)
}
