import type { Locale } from 'next-intl'

import type { Expertise } from '@/config/expertise'

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

function normalizeBase(siteUrl: string): string {
  return siteUrl.replace(/\/$/, '')
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
  const base = normalizeBase(input.siteUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    dateModified: new Date().toISOString(),
    mainEntity: {
      '@type': 'Person',
      '@id': `${base}/#person`,
      name: input.name,
      jobTitle: input.jobTitle,
      description: input.description,
      url: `${base}/${input.locale}/a-propos`,
      email: input.email,
      image: input.image,
      sameAs: input.sameAs,
      knowsAbout: input.expertise.map(mapExpertise),
    },
  }
}

export function buildBreadcrumbList(input: BreadcrumbListInput): BreadcrumbList {
  const base = normalizeBase(input.siteUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: input.items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: `${base}/${input.locale}${entry.path}`,
    })),
  }
}
