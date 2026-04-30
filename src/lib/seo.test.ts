import type { Metadata } from 'next'
import { describe, expect, it, vi } from 'vitest'

import { buildPageMetadata, type BuildPageMetadataInput } from './seo'

function buildInput(overrides?: Partial<BuildPageMetadataInput>): BuildPageMetadataInput {
  return {
    locale: 'fr',
    path: '/services',
    title: 'Services',
    description: 'Description des services',
    siteName: 'Thibaud Geisler : IA & Développement',
    ...overrides,
  }
}

function ogType(meta: Metadata): string | undefined {
  return (meta.openGraph as { type?: string } | undefined)?.type
}

describe('buildPageMetadata', () => {
  it('passe title et description tels quels (le template est appliqué par Next.js via le root layout)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput({ title: 'X', description: 'Y' }))
    expect(meta.title).toBe('X')
    expect(meta.description).toBe('Y')
  })

  it('utilise ogType="website" par défaut quand non fourni', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput())
    expect(ogType(meta)).toBe('website')
  })

  it('utilise ogType="article" quand explicitement passé', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput({ ogType: 'article' }))
    expect(ogType(meta)).toBe('article')
  })

  it('mappe locale fr → fr_FR et en → en_US dans openGraph.locale', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(buildPageMetadata(buildInput({ locale: 'fr' })).openGraph?.locale).toBe('fr_FR')
    expect(buildPageMetadata(buildInput({ locale: 'en' })).openGraph?.locale).toBe('en_US')
  })

  it('compose openGraph.url absolue depuis siteUrl + locale + path', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput({ locale: 'fr', path: '/services' }))
    expect(meta.openGraph?.url).toBe('https://thibaud-geisler.com/fr/services')
  })

  it('home (path vide) : openGraph.url = siteUrl + /<locale> sans slash trailing', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput({ locale: 'fr', path: '' }))
    expect(meta.openGraph?.url).toBe('https://thibaud-geisler.com/fr')
  })

  it('case study (path nested) : openGraph.url couvre /<locale>/projets/<slug>', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput({ locale: 'en', path: '/projets/webapp-gestion-sinistres' }))
    expect(meta.openGraph?.url).toBe('https://thibaud-geisler.com/en/projets/webapp-gestion-sinistres')
  })

  it('expose siteName, title et description dans openGraph', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(
      buildInput({ siteName: 'Site', title: 'T', description: 'D' }),
    )
    expect(meta.openGraph?.siteName).toBe('Site')
    expect(meta.openGraph?.title).toBe('T')
    expect(meta.openGraph?.description).toBe('D')
  })

  it('compose twitter avec card="summary_large_image", title et description', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput({ title: 'T', description: 'D' }))
    expect(meta.twitter).toStrictEqual({
      card: 'summary_large_image',
      title: 'T',
      description: 'D',
    })
  })

  it('canonical absolu = openGraph.url (cohérence interne)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput({ locale: 'fr', path: '/services' }))
    expect(meta.alternates?.canonical).toBe('https://thibaud-geisler.com/fr/services')
    expect(meta.alternates?.canonical).toBe(meta.openGraph?.url)
  })

  it('languages alternates expose fr, en et x-default via buildLanguageAlternates(path)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput({ path: '/services' }))
    const langs = meta.alternates?.languages
    expect(langs).toBeDefined()
    expect(langs).toMatchObject({
      fr: '/fr/services',
      en: '/en/services',
      'x-default': '/fr/services',
    })
  })

  it('omet la clé robots quand NODE_ENV === "production"', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput())
    expect(meta.robots).toBeUndefined()
  })

  it('retourne robots: { index: false, follow: false } quand NODE_ENV === "development"', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const meta = buildPageMetadata(buildInput())
    expect(meta.robots).toEqual({ index: false, follow: false })
  })

  it('retourne robots: noindex quand NODE_ENV === "test"', () => {
    vi.stubEnv('NODE_ENV', 'test')
    const meta = buildPageMetadata(buildInput())
    expect(meta.robots).toEqual({ index: false, follow: false })
  })
})
