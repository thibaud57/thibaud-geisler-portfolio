import type { Locale } from 'next-intl'

import type { Expertise } from '@/config/expertise'
import { localeToLanguageTag } from '@/i18n/locale-tags'
import { routing } from '@/i18n/routing'

type KnowsAboutEntry =
  | string
  | {
      '@type': 'Thing'
      name: string
      '@id': string
      sameAs: string
    }

export type ProfilePagePersonInput = {
  locale: Locale
  siteUrl: string
  name: string
  jobTitle: string
  description: string
  email: string
  image: string
  sameAs: readonly string[]
  expertise: readonly Expertise[]
  legal?: {
    siret: string
    address: AddressInput
  }
}

export type ProfilePagePerson = {
  '@context': 'https://schema.org'
  '@type': 'ProfilePage'
  dateModified: string
  mainEntity: {
    '@type': 'Person'
    '@id': string
    name: string
    jobTitle: string
    description: string
    url: string
    email: string
    image: string
    sameAs: readonly string[]
    knowsAbout: KnowsAboutEntry[]
    address?: SchemaOrgPostalAddress
    taxID?: string
    identifier?: {
      '@type': 'PropertyValue'
      propertyID: 'SIRET'
      value: string
    }
  }
}

export type BreadcrumbListInput = {
  locale: Locale
  siteUrl: string
  items: readonly { name: string; path: string }[]
}

export type BreadcrumbList = {
  '@context': 'https://schema.org'
  '@type': 'BreadcrumbList'
  itemListElement: {
    '@type': 'ListItem'
    position: number
    name: string
    item: string
  }[]
}

export type AddressInput = {
  street: string
  postalCode: string
  city: string
  country: string
}

export type SchemaOrgPostalAddress = {
  '@type': 'PostalAddress'
  streetAddress: string
  postalCode: string
  addressLocality: string
  addressCountry: string
}

function normalizeBase(siteUrl: string): string {
  return siteUrl.replace(/\/$/, '')
}

function localePageUrl(siteUrl: string, locale: Locale, path: string): string {
  return `${normalizeBase(siteUrl)}/${locale}${path}`
}

// Un seul @id pour la Person sur tout le site : c'est ce qui relie l'accueil, les services et le
// contact à l'entité complète déclarée sur /a-propos.
export function buildPersonId(siteUrl: string): string {
  return `${normalizeBase(siteUrl)}/#person`
}

type PersonReference = { '@id': string }

export type WebSiteGraphInput = {
  locale: Locale
  siteUrl: string
  siteName: string
  siteDescription: string
  person: {
    name: string
    jobTitle: string
    image: string
    sameAs: readonly string[]
  }
}

export type WebSiteGraph = {
  '@context': 'https://schema.org'
  '@graph': [
    {
      '@type': 'WebSite'
      '@id': string
      url: string
      name: string
      description: string
      inLanguage: string
      publisher: PersonReference
    },
    {
      '@type': 'Person'
      '@id': string
      name: string
      jobTitle: string
      url: string
      image: string
      sameAs: readonly string[]
    },
  ]
}

export type OfferCatalogInput = {
  locale: Locale
  siteUrl: string
  name: string
  services: readonly { slug: string; name: string; description: string }[]
  areaServed: readonly string[]
}

export type OfferCatalog = {
  '@context': 'https://schema.org'
  '@type': 'OfferCatalog'
  '@id': string
  name: string
  url: string
  provider: PersonReference
  itemListElement: {
    '@type': 'Offer'
    itemOffered: {
      '@type': 'Service'
      '@id': string
      name: string
      description: string
      serviceType: string
      provider: PersonReference
      areaServed: readonly string[]
      availableChannel: {
        '@type': 'ServiceChannel'
        serviceUrl: string
        availableLanguage: readonly string[]
      }
    }
  }[]
}

export type ContactPageInput = {
  locale: Locale
  siteUrl: string
  name: string
  description: string
  personName: string
  email: string
}

export type ProjectCreativeWorkInput = {
  locale: Locale
  siteUrl: string
  slug: string
  title: string
  description: string
  keywords: readonly string[]
  startedAt: Date | null
  endedAt: Date | null
  updatedAt: Date
  githubUrl: string | null
}

// SoftwareSourceCode est un sous-type de CreativeWork : réservé aux projets dont le dépôt est
// public, les projets clients n'en ont pas. Article (blog) et SoftwareApplication (prix + avis
// requis par Google) ont été écartés, cf. rapport SEO du 2026-09-04.
// dateModified suit updatedAt, comme le lastmod du sitemap : deux signaux de fraîcheur
// divergents sur une même URL font douter les crawlers. La période du projet va dans
// temporalCoverage (intervalle ISO 8601, borne ouverte « .. » tant que la mission dure).
// Le lien démo n'y figure pas : schema.org n'a pas de propriété « démo », et le déclarer
// autrement demanderait de basculer url/mainEntityOfPage pour un gain nul.
export type ProjectCreativeWork = {
  '@context': 'https://schema.org'
  '@type': 'CreativeWork' | 'SoftwareSourceCode'
  '@id': string
  url: string
  name: string
  description: string
  inLanguage: string
  author: PersonReference
  keywords: readonly string[]
  dateCreated?: string
  temporalCoverage?: string
  dateModified: string
  codeRepository?: string
}

export type ContactPage = {
  '@context': 'https://schema.org'
  '@type': 'ContactPage'
  url: string
  name: string
  description: string
  mainEntity: {
    '@type': 'Person'
    '@id': string
    name: string
    contactPoint: {
      '@type': 'ContactPoint'
      contactType: 'sales'
      email: string
      availableLanguage: readonly string[]
    }
  }
}

export function buildPostalAddress(address: AddressInput): SchemaOrgPostalAddress {
  return {
    '@type': 'PostalAddress',
    streetAddress: address.street,
    postalCode: address.postalCode,
    addressLocality: address.city,
    addressCountry: address.country,
  }
}

function mapExpertise(entry: Expertise): KnowsAboutEntry {
  if (entry.wikidataId && entry.wikipediaUrl) {
    return {
      '@type': 'Thing',
      name: entry.name,
      '@id': `https://www.wikidata.org/wiki/${entry.wikidataId}`,
      sameAs: entry.wikipediaUrl,
    }
  }
  return entry.name
}

export function buildProfilePagePerson(
  input: ProfilePagePersonInput,
): ProfilePagePerson {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    dateModified: new Date().toISOString(),
    mainEntity: {
      '@type': 'Person',
      '@id': buildPersonId(input.siteUrl),
      name: input.name,
      jobTitle: input.jobTitle,
      description: input.description,
      url: localePageUrl(input.siteUrl, input.locale, '/a-propos'),
      email: input.email,
      image: input.image,
      sameAs: input.sameAs,
      knowsAbout: input.expertise.map(mapExpertise),
      ...(input.legal && {
        address: buildPostalAddress(input.legal.address),
        taxID: input.legal.siret,
        identifier: {
          '@type': 'PropertyValue' as const,
          propertyID: 'SIRET' as const,
          value: input.legal.siret,
        },
      }),
    },
  }
}

export function buildBreadcrumbList(input: BreadcrumbListInput): BreadcrumbList {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: input.items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: localePageUrl(input.siteUrl, input.locale, entry.path),
    })),
  }
}

export function buildWebSiteGraph(input: WebSiteGraphInput): WebSiteGraph {
  const base = normalizeBase(input.siteUrl)
  const personId = buildPersonId(input.siteUrl)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: `${base}/`,
        name: input.siteName,
        description: input.siteDescription,
        inLanguage: localeToLanguageTag[input.locale],
        publisher: { '@id': personId },
      },
      {
        '@type': 'Person',
        '@id': personId,
        name: input.person.name,
        jobTitle: input.person.jobTitle,
        url: localePageUrl(input.siteUrl, input.locale, '/a-propos'),
        image: input.person.image,
        sameAs: input.person.sameAs,
      },
    ],
  }
}

const availableLanguages = routing.locales

export function buildOfferCatalog(input: OfferCatalogInput): OfferCatalog {
  const pageUrl = localePageUrl(input.siteUrl, input.locale, '/services')
  const provider = { '@id': buildPersonId(input.siteUrl) }
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    '@id': `${pageUrl}#catalog`,
    name: input.name,
    url: pageUrl,
    provider,
    itemListElement: input.services.map((service) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        '@id': `${pageUrl}#${service.slug}`,
        name: service.name,
        description: service.description,
        serviceType: service.name,
        provider,
        areaServed: input.areaServed,
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: localePageUrl(input.siteUrl, input.locale, `/contact?service=${service.slug}`),
          availableLanguage: availableLanguages,
        },
      },
    })),
  }
}

export function buildContactPage(input: ContactPageInput): ContactPage {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    url: localePageUrl(input.siteUrl, input.locale, '/contact'),
    name: input.name,
    description: input.description,
    mainEntity: {
      '@type': 'Person',
      '@id': buildPersonId(input.siteUrl),
      name: input.personName,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: input.email,
        availableLanguage: availableLanguages,
      },
    },
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function buildProjectCreativeWork(input: ProjectCreativeWorkInput): ProjectCreativeWork {
  const pageUrl = localePageUrl(input.siteUrl, input.locale, `/projets/${input.slug}`)
  return {
    '@context': 'https://schema.org',
    '@type': input.githubUrl ? 'SoftwareSourceCode' : 'CreativeWork',
    '@id': `${pageUrl}#creativework`,
    url: pageUrl,
    name: input.title,
    description: input.description,
    inLanguage: localeToLanguageTag[input.locale],
    author: { '@id': buildPersonId(input.siteUrl) },
    keywords: input.keywords,
    ...(input.startedAt && {
      dateCreated: toIsoDate(input.startedAt),
      temporalCoverage: `${toIsoDate(input.startedAt)}/${input.endedAt ? toIsoDate(input.endedAt) : '..'}`,
    }),
    dateModified: toIsoDate(input.updatedAt),
    ...(input.githubUrl && { codeRepository: input.githubUrl }),
  }
}
