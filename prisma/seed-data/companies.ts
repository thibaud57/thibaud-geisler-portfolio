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
   * Chemin relatif du logo dans `/assets/` (servi par `/api/assets/[...path]`).
   * Convention : `projets/client/<slug>/logo.png`. null si pas de logo disponible.
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
    slug: 'acme',
    name: 'Acme',
    logoFilename: 'projets/client/acme/logo.png',
    websiteUrl: 'https://acme.example',
    sectors: ['ASSURANCE'],
    size: 'ETI',
    locations: ['LUXEMBOURG', 'BELGIQUE'],
  },
  {
    slug: 'soylent',
    name: 'Soylent',
    logoFilename: 'projets/client/soylent/logo.png',
    websiteUrl: 'https://soylent.example',
    sectors: ['SAAS', 'LOGICIELS_ENTREPRISE'],
    size: 'TPE',
    locations: ['LUXEMBOURG'],
  },
  {
    slug: 'umbrella',
    name: 'Umbrella',
    logoFilename: 'projets/client/umbrella/logo.png',
    websiteUrl: 'https://umbrella.example',
    sectors: ['SAAS', 'SERVICES_RH'],
    size: 'TPE',
    locations: ['LUXEMBOURG'],
  },
  {
    slug: 'initech',
    name: 'Initech',
    logoFilename: 'projets/client/initech/logo.png',
    websiteUrl: 'https://initech.example',
    sectors: ['EMARKETING', 'IA_AUTOMATISATION'],
    size: 'TPE',
    locations: ['GRAND_EST'],
  },
]
