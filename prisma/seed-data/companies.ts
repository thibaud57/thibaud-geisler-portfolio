import type { CompanySector, CompanySize } from '@/generated/prisma/client'

export const PERSONAL_COMPANY_SLUG = 'personnel'

export type CompanyInput = {
  slug: string
  name: string
  logoFilename: string | null
  websiteUrl: string | null
  sectors: CompanySector[]
  size: CompanySize | null
  legalEntitySlug: string | null
}

export const companies: CompanyInput[] = [
  {
    slug: 'acme',
    name: 'Acme',
    logoFilename: 'projets/client/acme/logo.png',
    websiteUrl: 'https://acme.example',
    sectors: ['ASSURANCE'],
    size: 'ETI',
    legalEntitySlug: 'acme-sa',
  },
  {
    slug: 'soylent',
    name: 'Soylent',
    logoFilename: 'projets/client/soylent/logo.png',
    websiteUrl: 'https://soylent.example',
    sectors: ['SAAS', 'LOGICIELS_ENTREPRISE'],
    size: 'TPE',
    legalEntitySlug: 'soylent-sarl',
  },
  {
    slug: 'umbrella',
    name: 'Umbrella',
    logoFilename: 'projets/client/umbrella/logo.png',
    websiteUrl: 'https://umbrella.example',
    sectors: ['SAAS', 'SERVICES_RH'],
    size: 'TPE',
    // TODO: site web inactif (umbrella.example en vente sur Sedo), entité juridique LU à compléter manuellement
    legalEntitySlug: null,
  },
  {
    slug: 'initech',
    name: 'Initech',
    logoFilename: 'projets/client/initech/logo.png',
    websiteUrl: 'https://initech.example',
    sectors: ['EMARKETING', 'IA_AUTOMATISATION'],
    size: 'TPE',
    legalEntitySlug: 'initech-sas',
  },
  {
    // Client contractuel de la mission
    slug: 'theodo-extend',
    name: 'Theodo Extend',
    logoFilename: 'projets/client/theodo-extend/logo.png',
    websiteUrl: 'https://www.theodo.com',
    sectors: ['ESN_CONSEIL'],
    size: 'ETI',
    legalEntitySlug: 'that-sas',
  },
  {
    slug: PERSONAL_COMPANY_SLUG,
    name: 'Personnel',
    logoFilename: null,
    websiteUrl: null,
    sectors: [],
    size: null,
    legalEntitySlug: null,
  },
]
