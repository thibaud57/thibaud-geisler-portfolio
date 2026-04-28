import { describe, expect, it } from 'vitest'

import {
  buildBreadcrumbList,
  buildProfilePagePerson,
  type ProfilePagePersonInput,
  type BreadcrumbListInput,
} from './json-ld'

const SITE_URL_FIXTURE = 'https://thibaud-geisler.com'

function buildProfileInput(
  overrides?: Partial<ProfilePagePersonInput>,
): ProfilePagePersonInput {
  return {
    locale: 'fr',
    siteUrl: SITE_URL_FIXTURE,
    name: 'Thibaud Geisler',
    jobTitle: 'IA & développement full-stack',
    description: 'Description courte test',
    email: 'contact@thibaud-geisler.com',
    image: 'https://thibaud-geisler.com/api/assets/branding/portrait.jpg',
    sameAs: [
      'https://www.linkedin.com/in/thibaud-geisler/',
      'https://github.com/thibaud57',
    ],
    expertise: [
      {
        name: 'Artificial Intelligence',
        wikidataId: 'Q11660',
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
      },
      { name: 'AI Training' },
    ],
    ...overrides,
  }
}

describe('buildProfilePagePerson', () => {
  it('produit @context schema.org et @type ProfilePage à la racine', () => {
    const result = buildProfilePagePerson(buildProfileInput())
    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('ProfilePage')
  })

  it('imbrique mainEntity de @type Person avec toutes les propriétés requises', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({
        name: 'Thibaud Geisler',
        jobTitle: 'IA & développement full-stack',
        description: 'desc',
        email: 'a@b.c',
      }),
    )
    expect(result.mainEntity['@type']).toBe('Person')
    expect(result.mainEntity['@id']).toBeDefined()
    expect(result.mainEntity.name).toBe('Thibaud Geisler')
    expect(result.mainEntity.jobTitle).toBe('IA & développement full-stack')
    expect(result.mainEntity.description).toBe('desc')
    expect(result.mainEntity.email).toBe('a@b.c')
  })

  it('Person.@id locale-agnostic = siteUrl + /#person (même valeur en FR et EN)', () => {
    const fr = buildProfilePagePerson(buildProfileInput({ locale: 'fr' }))
    const en = buildProfilePagePerson(buildProfileInput({ locale: 'en' }))
    expect(fr.mainEntity['@id']).toBe('https://thibaud-geisler.com/#person')
    expect(en.mainEntity['@id']).toBe('https://thibaud-geisler.com/#person')
    expect(fr.mainEntity['@id']).toBe(en.mainEntity['@id'])
  })

  it('Person.url = siteUrl + /<locale>/a-propos', () => {
    expect(
      buildProfilePagePerson(buildProfileInput({ locale: 'fr' })).mainEntity.url,
    ).toBe('https://thibaud-geisler.com/fr/a-propos')
    expect(
      buildProfilePagePerson(buildProfileInput({ locale: 'en' })).mainEntity.url,
    ).toBe('https://thibaud-geisler.com/en/a-propos')
  })

  it('Person.image est une URL absolue', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({
        image: 'https://thibaud-geisler.com/api/assets/branding/portrait.jpg',
      }),
    )
    expect(result.mainEntity.image).toMatch(/^https?:\/\//)
  })

  it('Person.sameAs contient les URLs externes passées en argument', () => {
    const sameAs = [
      'https://www.linkedin.com/in/thibaud-geisler/',
      'https://github.com/thibaud57',
    ]
    const result = buildProfilePagePerson(buildProfileInput({ sameAs }))
    expect(result.mainEntity.sameAs).toEqual(sameAs)
  })

  it('mappe expertise avec wikidataId vers Thing complet (@type, name, @id Wikidata, sameAs Wikipedia)', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({
        expertise: [
          {
            name: 'Artificial Intelligence',
            wikidataId: 'Q11660',
            wikipediaUrl: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
          },
        ],
      }),
    )
    expect(result.mainEntity.knowsAbout).toEqual([
      {
        '@type': 'Thing',
        name: 'Artificial Intelligence',
        '@id': 'https://www.wikidata.org/wiki/Q11660',
        sameAs: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
      },
    ])
  })

  it('mappe expertise sans wikidataId vers string simple', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({ expertise: [{ name: 'AI Training' }] }),
    )
    expect(result.mainEntity.knowsAbout).toEqual(['AI Training'])
  })

  it('respecte l\'ordre des entrées EXPERTISE (Thing puis string)', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({
        expertise: [
          {
            name: 'Artificial Intelligence',
            wikidataId: 'Q11660',
            wikipediaUrl: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
          },
          { name: 'AI Training' },
        ],
      }),
    )
    expect(result.mainEntity.knowsAbout).toHaveLength(2)
    expect((result.mainEntity.knowsAbout[0] as { name: string }).name).toBe(
      'Artificial Intelligence',
    )
    expect(result.mainEntity.knowsAbout[1]).toBe('AI Training')
  })

  it('expose dateModified au format ISO 8601 sur ProfilePage', () => {
    const result = buildProfilePagePerson(buildProfileInput())
    expect(result.dateModified).toBeDefined()
    expect(new Date(result.dateModified).toISOString()).toBe(result.dateModified)
  })
})

function buildBreadcrumbInput(
  overrides?: Partial<BreadcrumbListInput>,
): BreadcrumbListInput {
  return {
    locale: 'fr',
    siteUrl: SITE_URL_FIXTURE,
    items: [
      { name: 'Accueil', path: '' },
      { name: 'Services', path: '/services' },
    ],
    ...overrides,
  }
}

describe('buildBreadcrumbList', () => {
  it('produit @context schema.org et @type BreadcrumbList', () => {
    const result = buildBreadcrumbList(buildBreadcrumbInput())
    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('BreadcrumbList')
  })

  it('itemListElement contient un ListItem par segment passé', () => {
    const result = buildBreadcrumbList(
      buildBreadcrumbInput({
        items: [
          { name: 'Home', path: '' },
          { name: 'Projects', path: '/projets' },
          { name: 'Digiclaims', path: '/projets/digiclaims' },
        ],
      }),
    )
    expect(result.itemListElement).toHaveLength(3)
  })

  it('chaque ListItem a position 1-based, name et item URL absolue', () => {
    const result = buildBreadcrumbList(
      buildBreadcrumbInput({
        items: [{ name: 'Home', path: '' }, { name: 'Services', path: '/services' }],
      }),
    )
    expect(result.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://thibaud-geisler.com/fr',
    })
    expect(result.itemListElement[1]).toEqual({
      '@type': 'ListItem',
      position: 2,
      name: 'Services',
      item: 'https://thibaud-geisler.com/fr/services',
    })
  })

  it('item URL = siteUrl + /<locale> + path en EN', () => {
    const result = buildBreadcrumbList(
      buildBreadcrumbInput({
        locale: 'en',
        items: [{ name: 'Home', path: '' }, { name: 'Services', path: '/services' }],
      }),
    )
    expect(result.itemListElement[0]?.item).toBe('https://thibaud-geisler.com/en')
    expect(result.itemListElement[1]?.item).toBe(
      'https://thibaud-geisler.com/en/services',
    )
  })

  it('respecte l\'ordre des items (parent → enfant)', () => {
    const result = buildBreadcrumbList(
      buildBreadcrumbInput({
        items: [
          { name: 'Home', path: '' },
          { name: 'Projects', path: '/projets' },
          { name: 'Digiclaims', path: '/projets/digiclaims' },
        ],
      }),
    )
    expect(result.itemListElement.map((e) => e.position)).toEqual([1, 2, 3])
    expect(result.itemListElement.map((e) => e.name)).toEqual([
      'Home',
      'Projects',
      'Digiclaims',
    ])
  })
})
