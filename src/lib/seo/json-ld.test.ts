import { describe, expect, it } from 'vitest'

import {
  buildBreadcrumbList,
  buildContactPage,
  buildOfferCatalog,
  buildPersonId,
  buildPostalAddress,
  buildProfilePagePerson,
  buildProjectCreativeWork,
  buildWebSiteGraph,
  type ProfilePagePersonInput,
  type BreadcrumbListInput,
  type ProjectCreativeWorkInput,
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

  const LEGAL_FIXTURE = {
    siret: '88041912200036',
    address: {
      street: '11 rue Gouvy',
      postalCode: '57000',
      city: 'Metz',
      country: 'France',
    },
  } as const

  it('quand legal est fourni, mainEntity contient address PostalAddress, taxID, identifier PropertyValue', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({ legal: LEGAL_FIXTURE }),
    )
    expect(result.mainEntity.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '11 rue Gouvy',
      postalCode: '57000',
      addressLocality: 'Metz',
      addressCountry: 'France',
    })
    expect(result.mainEntity.taxID).toBe('88041912200036')
    expect(result.mainEntity.identifier).toEqual({
      '@type': 'PropertyValue',
      propertyID: 'SIRET',
      value: '88041912200036',
    })
  })

  it('quand legal est absent, mainEntity n\'a pas address, taxID, identifier (rétro-compat sub SEO 05)', () => {
    const result = buildProfilePagePerson(buildProfileInput())
    expect(result.mainEntity.address).toBeUndefined()
    expect(result.mainEntity.taxID).toBeUndefined()
    expect(result.mainEntity.identifier).toBeUndefined()
  })

  it('garde-fou cohérence : taxID est strictement égal à identifier.value (même SIRET)', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({ legal: LEGAL_FIXTURE }),
    )
    expect(result.mainEntity.taxID).toBe(result.mainEntity.identifier?.value)
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
          { name: 'Webapp Gestion Sinistres', path: '/projets/webapp-gestion-sinistres' },
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
          { name: 'Webapp Gestion Sinistres', path: '/projets/webapp-gestion-sinistres' },
        ],
      }),
    )
    expect(result.itemListElement.map((e) => e.position)).toEqual([1, 2, 3])
    expect(result.itemListElement.map((e) => e.name)).toEqual([
      'Home',
      'Projects',
      'Webapp Gestion Sinistres',
    ])
  })
})

describe('buildPostalAddress', () => {
  it('mappe les 4 champs Prisma (street, postalCode, city, country) vers le format Schema.org PostalAddress (streetAddress, postalCode, addressLocality, addressCountry)', () => {
    const result = buildPostalAddress({
      street: '7 place de la Gare',
      postalCode: '57200',
      city: 'Sarreguemines',
      country: 'France',
    })
    expect(result).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '7 place de la Gare',
      postalCode: '57200',
      addressLocality: 'Sarreguemines',
      addressCountry: 'France',
    })
  })
})

describe('buildPersonId', () => {
  it('@id Person = siteUrl + /#person, slash final absorbé', () => {
    expect(buildPersonId('https://thibaud-geisler.com/')).toBe('https://thibaud-geisler.com/#person')
  })
})

describe('buildWebSiteGraph', () => {
  const input = {
    locale: 'fr' as const,
    siteUrl: SITE_URL_FIXTURE,
    siteName: 'Thibaud Geisler : IA & Développement',
    siteDescription: 'Portfolio de Thibaud Geisler.',
    person: {
      name: 'Thibaud Geisler',
      jobTitle: 'IA & développement full-stack',
      image: 'https://thibaud-geisler.com/api/assets/branding/portrait.jpg',
      sameAs: ['https://www.linkedin.com/in/thibaud-geisler/'],
    },
  }

  it('WebSite.publisher référence le même @id que le nœud Person du graphe', () => {
    const graph = buildWebSiteGraph(input)

    const [webSite, person] = graph['@graph']
    expect(webSite.publisher['@id']).toBe(person['@id'])
    expect(person['@id']).toBe(buildPersonId(SITE_URL_FIXTURE))
  })

  it('Person.url pointe vers /a-propos de la locale courante, inLanguage suit la locale', () => {
    const graph = buildWebSiteGraph({ ...input, locale: 'en' })

    const [webSite, person] = graph['@graph']
    expect(person.url).toBe('https://thibaud-geisler.com/en/a-propos')
    expect(webSite.inLanguage).toBe('en-US')
  })
})

describe('buildOfferCatalog', () => {
  const input = {
    locale: 'fr' as const,
    siteUrl: SITE_URL_FIXTURE,
    name: 'Services',
    services: [
      { slug: 'ia', name: 'IA & Automatisation', description: 'Desc IA' },
      { slug: 'formation', name: 'Formation IA', description: 'Desc formation' },
    ],
    areaServed: ['France', 'Luxembourg'],
  }

  it('un Offer par service, chaque Service ancré sur /services#<slug> avec provider = Person', () => {
    const catalog = buildOfferCatalog(input)

    expect(catalog.itemListElement).toHaveLength(2)
    const service = catalog.itemListElement[1]!.itemOffered
    expect(service['@id']).toBe('https://thibaud-geisler.com/fr/services#formation')
    expect(service.provider['@id']).toBe(buildPersonId(SITE_URL_FIXTURE))
    expect(catalog.provider['@id']).toBe(buildPersonId(SITE_URL_FIXTURE))
  })

  it('serviceUrl reprend le prefill ?service=<slug> de la page contact, dans la locale courante', () => {
    const catalog = buildOfferCatalog({ ...input, locale: 'en' })

    expect(catalog.itemListElement[0]!.itemOffered.availableChannel.serviceUrl).toBe(
      'https://thibaud-geisler.com/en/contact?service=ia',
    )
  })
})

describe('buildContactPage', () => {
  it('mainEntity est la Person canonique avec un ContactPoint email', () => {
    const page = buildContactPage({
      locale: 'fr',
      siteUrl: SITE_URL_FIXTURE,
      name: 'Contact',
      description: 'Desc contact',
      personName: 'Thibaud Geisler',
      email: 'contact@thibaud-geisler.com',
    })

    expect(page.url).toBe('https://thibaud-geisler.com/fr/contact')
    expect(page.mainEntity['@id']).toBe(buildPersonId(SITE_URL_FIXTURE))
    expect(page.mainEntity.contactPoint.email).toBe('contact@thibaud-geisler.com')
  })
})

describe('buildProjectCreativeWork', () => {
  function buildInput(overrides?: Partial<ProjectCreativeWorkInput>): ProjectCreativeWorkInput {
    return {
      locale: 'fr',
      siteUrl: SITE_URL_FIXTURE,
      slug: 'webapp-gestion-sinistres',
      title: 'Webapp Gestion Sinistres',
      description: 'Desc',
      keywords: ['Scala', 'Angular'],
      startedAt: new Date('2022-05-01T00:00:00Z'),
      endedAt: new Date('2025-10-01T00:00:00Z'),
      updatedAt: new Date('2026-09-01T00:00:00Z'),
      githubUrl: null,
      ...overrides,
    }
  }

  it('projet client sans dépôt : CreativeWork, auteur = Person canonique, période startedAt/endedAt, dateModified = updatedAt comme le sitemap', () => {
    const work = buildProjectCreativeWork(buildInput())

    expect(work['@type']).toBe('CreativeWork')
    expect(work.url).toBe('https://thibaud-geisler.com/fr/projets/webapp-gestion-sinistres')
    expect(work.author['@id']).toBe(buildPersonId(SITE_URL_FIXTURE))
    expect(work.dateCreated).toBe('2022-05-01')
    expect(work.temporalCoverage).toBe('2022-05-01/2025-10-01')
    expect(work.dateModified).toBe('2026-09-01')
    expect(work.codeRepository).toBeUndefined()
  })

  it('mission en cours : intervalle ouvert en temporalCoverage', () => {
    const work = buildProjectCreativeWork(buildInput({ endedAt: null }))

    expect(work.temporalCoverage).toBe('2022-05-01/..')
  })

  it('projet avec dépôt public : SoftwareSourceCode + codeRepository', () => {
    const work = buildProjectCreativeWork(
      buildInput({ githubUrl: 'https://github.com/thibaud57/portfolio' }),
    )

    expect(work['@type']).toBe('SoftwareSourceCode')
    expect(work.codeRepository).toBe('https://github.com/thibaud57/portfolio')
  })

  it('sans startedAt : ni dateCreated ni temporalCoverage', () => {
    const work = buildProjectCreativeWork(buildInput({ startedAt: null, endedAt: null }))

    expect(work.dateCreated).toBeUndefined()
    expect(work.temporalCoverage).toBeUndefined()
  })
})
