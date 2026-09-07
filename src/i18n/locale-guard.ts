import { hasLocale } from "next-intl"
import { notFound } from "next/navigation"
import { routing } from "./routing"

type Locale = (typeof routing.locales)[number]

// Plus de `setRequestLocale` : la locale est lue depuis le segment racine par `next/root-params`
// dans `request.ts`, disponible au rendu statique sans avoir à l'annoncer page par page.
export async function setupLocalePage<T extends { locale: string }>(
  params: Promise<T>,
): Promise<Omit<T, "locale"> & { locale: Locale }> {
  const resolved = await params
  if (!hasLocale(routing.locales, resolved.locale)) notFound()
  return resolved as Omit<T, "locale"> & { locale: Locale }
}
