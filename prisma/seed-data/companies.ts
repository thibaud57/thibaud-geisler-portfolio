import type {
  CompanyLocation,
  CompanySector,
  CompanySize,
} from '@/generated/prisma/client'

/**
 * Company input shape consumed by `prisma/seed.ts` (upsert by slug).
 *
 * @see docs/superpowers/specs/projets/03-seed-projets-design.md
 */
export type CompanyInput = {
  slug: string
  name: string
  /**
   * Nom de fichier du logo placé manuellement dans `/assets/` (servi par
   * `/api/assets/[filename]` via le sub-project 04).
   * null si pas de logo disponible (badge UI affiche le nom seul).
   */
  logoFilename: string | null
  websiteUrl: string | null
  sectors: CompanySector[]
  size: CompanySize | null
  locations: CompanyLocation[]
}

/**
 * Référentiel des entreprises clientes (réutilisables entre plusieurs projets).
 *
 * Source : DB Notion "Entreprises", filtré sur `Travaillé = true` et limité aux
 * entreprises liées à des projets CLIENT publiés sur le portfolio.
 *
 * Mapping taille : `1-50` → TPE, `50-250` → PME, `250-5000` → ETI, `5000+` → GROUPE.
 */
export const companies: CompanyInput[] = [
  {
    slug: 'foyer',
    name: 'Foyer Group',
    logoFilename: 'foyer-logo.png',
    websiteUrl: 'https://www.foyer.lu',
    sectors: ['ASSURANCE'],
    size: 'ETI',
    locations: ['LUXEMBOURG', 'BELGIQUE'],
  },
  {
    slug: 'cloudsmart',
    name: 'CloudSmart',
    logoFilename: 'cloudsmart-logo.png',
    websiteUrl: 'https://cloudsmart.lu',
    sectors: ['SAAS', 'LOGICIELS_ENTREPRISE'],
    size: 'TPE',
    locations: ['LUXEMBOURG'],
  },
  {
    slug: 'paysystem',
    name: 'PaySystem',
    logoFilename: 'paysystem-logo.png',
    websiteUrl: 'https://www.paysystem.eu',
    sectors: ['SAAS', 'SERVICES_RH'],
    size: 'TPE',
    locations: ['LUXEMBOURG'],
  },
  {
    slug: 'wanted-design',
    name: 'Wanted Design',
    logoFilename: 'wanted-design-logo.png',
    websiteUrl: 'https://www.wanteddesign.fr',
    sectors: ['EMARKETING', 'IA_AUTOMATISATION'],
    size: 'TPE',
    locations: ['GRAND_EST'],
  },
]
