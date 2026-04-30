import { describe, expect, it } from 'vitest'

import { buildSitemapEntries, PUBLIC_STATIC_PATHS } from './sitemap'

const SITE_URL_FIXTURE = 'https://thibaud-geisler.com'

function buildProject(overrides?: { slug?: string; updatedAt?: Date }) {
  return {
    slug: overrides?.slug ?? 'sample',
    updatedAt: overrides?.updatedAt ?? new Date('2026-01-01T00:00:00Z'),
  }
}

describe('PUBLIC_STATIC_PATHS', () => {
  it('expose les 5 paths publics du portfolio', () => {
    expect(PUBLIC_STATIC_PATHS).toEqual([
      '',
      '/services',
      '/projets',
      '/a-propos',
      '/contact',
    ])
  })
})

describe('buildSitemapEntries', () => {
  it('canonical statique = siteUrl + /<defaultLocale> + path', () => {
    const entries = buildSitemapEntries({
      staticPaths: ['/services'],
      projects: [],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries[0]?.url).toBe('https://thibaud-geisler.com/fr/services')
  })

  it('home (path vide) produit siteUrl/<defaultLocale> sans slash trailing', () => {
    const entries = buildSitemapEntries({
      staticPaths: [''],
      projects: [],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries[0]?.url).toBe('https://thibaud-geisler.com/fr')
  })

  it('alternates statiques exposent fr, en et x-default', () => {
    const entries = buildSitemapEntries({
      staticPaths: ['/services'],
      projects: [],
      siteUrl: SITE_URL_FIXTURE,
    })
    const langs = entries[0]?.alternates?.languages
    expect(langs).toBeDefined()
    expect(langs).toMatchObject({
      fr: 'https://thibaud-geisler.com/fr/services',
      en: 'https://thibaud-geisler.com/en/services',
      'x-default': 'https://thibaud-geisler.com/fr/services',
    })
  })

  it('génère une entrée par projet publié au format /projets/<slug>', () => {
    const entries = buildSitemapEntries({
      staticPaths: [],
      projects: [
        buildProject({ slug: 'webapp-gestion-sinistres' }),
        buildProject({ slug: 'foyer' }),
      ],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries).toHaveLength(2)
    expect(entries[0]?.url).toBe('https://thibaud-geisler.com/fr/projets/webapp-gestion-sinistres')
    expect(entries[1]?.url).toBe('https://thibaud-geisler.com/fr/projets/foyer')
  })

  it('lastModified projet = updatedAt (pas new Date())', () => {
    const updatedAt = new Date('2026-03-15T10:00:00Z')
    const entries = buildSitemapEntries({
      staticPaths: [],
      projects: [buildProject({ updatedAt })],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries[0]?.lastModified).toBe(updatedAt)
  })

  it('alternates projets exposent fr, en et x-default pointant vers /projets/<slug>', () => {
    const entries = buildSitemapEntries({
      staticPaths: [],
      projects: [buildProject({ slug: 'webapp-gestion-sinistres' })],
      siteUrl: SITE_URL_FIXTURE,
    })
    const langs = entries[0]?.alternates?.languages
    expect(langs).toMatchObject({
      fr: 'https://thibaud-geisler.com/fr/projets/webapp-gestion-sinistres',
      en: 'https://thibaud-geisler.com/en/projets/webapp-gestion-sinistres',
      'x-default': 'https://thibaud-geisler.com/fr/projets/webapp-gestion-sinistres',
    })
  })

  it('composition : 5 statiques + 3 projets → 8 entrées', () => {
    const entries = buildSitemapEntries({
      staticPaths: PUBLIC_STATIC_PATHS,
      projects: [
        buildProject({ slug: 'a' }),
        buildProject({ slug: 'b' }),
        buildProject({ slug: 'c' }),
      ],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries).toHaveLength(8)
  })

  it('ordre : statiques d\'abord, projets ensuite', () => {
    const entries = buildSitemapEntries({
      staticPaths: ['/services'],
      projects: [buildProject({ slug: 'webapp-gestion-sinistres' })],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries[0]?.url).toBe('https://thibaud-geisler.com/fr/services')
    expect(entries[1]?.url).toBe('https://thibaud-geisler.com/fr/projets/webapp-gestion-sinistres')
  })

  it('aucun projet : retourne uniquement les entrées statiques', () => {
    const entries = buildSitemapEntries({
      staticPaths: PUBLIC_STATIC_PATHS,
      projects: [],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries).toHaveLength(5)
  })

  it('siteUrl avec trailing slash : ne produit pas de double slash', () => {
    const entries = buildSitemapEntries({
      staticPaths: ['/services'],
      projects: [],
      siteUrl: 'https://thibaud-geisler.com/',
    })
    expect(entries[0]?.url).toBe('https://thibaud-geisler.com/fr/services')
    expect(entries[0]?.url).not.toContain('//fr')
  })
})
