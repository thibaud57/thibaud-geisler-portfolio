import type {
  CompanyLocation,
  CompanySector,
  CompanySize,
} from '@/generated/prisma/client'

export type CompanyInput = {
  slug: string
  name: string
  // Convention de stockage : assets/projets/{client,personal}/<slug>/logo.png
  logoFilename: string | null
  websiteUrl: string | null
  sectors: CompanySector[]
  size: CompanySize | null
  locations: CompanyLocation[]
}

// Mapping taille : 1-50 → TPE, 50-250 → PME, 250-5000 → ETI, 5000+ → GROUPE
export const companies: CompanyInput[] = [
  {
    slug: 'foyer',
    name: 'Foyer Group',
    logoFilename: 'projets/client/foyer/logo.png',
    websiteUrl: 'https://www.foyer.lu',
    sectors: ['ASSURANCE'],
    size: 'ETI',
    locations: ['LUXEMBOURG', 'BELGIQUE'],
  },
  {
    slug: 'cloudsmart',
    name: 'CloudSmart',
    logoFilename: 'projets/client/cloudsmart/logo.png',
    websiteUrl: 'https://cloudsmart.lu',
    sectors: ['SAAS', 'LOGICIELS_ENTREPRISE'],
    size: 'TPE',
    locations: ['LUXEMBOURG'],
  },
  {
    slug: 'paysystem',
    name: 'PaySystem',
    logoFilename: 'projets/client/paysystem/logo.png',
    websiteUrl: 'https://www.paysystem.eu',
    sectors: ['SAAS', 'SERVICES_RH'],
    size: 'TPE',
    locations: ['LUXEMBOURG'],
  },
  {
    slug: 'wanted-design',
    name: 'Wanted Design',
    logoFilename: 'projets/client/wanted-design/logo.png',
    websiteUrl: 'https://www.wanteddesign.fr',
    sectors: ['EMARKETING', 'IA_AUTOMATISATION'],
    size: 'TPE',
    locations: ['GRAND_EST'],
  },
  {
    slug: 'personnel',
    name: 'Personnel',
    logoFilename: null,
    websiteUrl: null,
    sectors: [],
    size: null,
    locations: [],
  },
]
