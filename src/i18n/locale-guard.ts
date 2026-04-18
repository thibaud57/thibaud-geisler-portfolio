import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from './routing'

type Locale = (typeof routing.locales)[number]

export async function setupLocalePage<T extends { locale: string }>(
  params: Promise<T>,
): Promise<Omit<T, 'locale'> & { locale: Locale }> {
  const resolved = await params
  if (!hasLocale(routing.locales, resolved.locale)) notFound()
  setRequestLocale(resolved.locale)
  return resolved as Omit<T, 'locale'> & { locale: Locale }
}
