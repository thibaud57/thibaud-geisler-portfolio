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
    slug: 'foyer',
    name: 'Foyer',
    logoFilename: 'projets/client/foyer/logo.png',
    websiteUrl: 'https://www.foyer.lu',
    sectors: ['ASSURANCE'],
    size: 'ETI',
    legalEntitySlug: 'foyer-group-sa',
  },
  {
    slug: 'cloudsmart',
    name: 'CloudSmart',
    logoFilename: 'projets/client/cloudsmart/logo.png',
    websiteUrl: 'https://cloudsmart.lu',
    sectors: ['SAAS', 'LOGICIELS_ENTREPRISE'],
    size: 'TPE',
    legalEntitySlug: 'cloudsmart-sarl',
  },
  {
    slug: 'paysystem',
    name: 'PaySystem',
    logoFilename: 'projets/client/paysystem/logo.png',
    websiteUrl: 'https://www.paysystem.eu',
    sectors: ['SAAS', 'SERVICES_RH'],
    size: 'TPE',
    // TODO: site web inactif (paysystem.eu en vente sur Sedo), entité juridique LU à compléter manuellement
    legalEntitySlug: null,
  },
  {
    slug: 'wanted-design',
    name: 'Wanted Design',
    logoFilename: 'projets/client/wanted-design/logo.png',
    websiteUrl: 'https://www.wanteddesign.fr',
    sectors: ['EMARKETING', 'IA_AUTOMATISATION'],
    size: 'TPE',
    legalEntitySlug: 'wantedesign-sas',
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
