import type { CompanySector, CompanySize } from "@/generated/prisma/client"

export const OWNER_COMPANY_SLUG = "thibaud-geisler"

export interface CompanyInput {
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
    slug: "foyer",
    name: "Foyer",
    logoFilename: "freelance/crm/entreprises/foyer/logo.png",
    websiteUrl: "https://www.foyer.lu",
    sectors: ["ASSURANCE"],
    size: "ETI",
    legalEntitySlug: "foyer-group-sa",
  },
  {
    slug: "cloudsmart",
    name: "CloudSmart",
    logoFilename: "freelance/crm/entreprises/cloudsmart/logo.png",
    websiteUrl: "https://cloudsmart.lu",
    sectors: ["SAAS", "LOGICIELS_ENTREPRISE"],
    size: "TPE",
    legalEntitySlug: "cloudsmart-sarl",
  },
  {
    slug: "paysystem",
    name: "PaySystem",
    logoFilename: "freelance/crm/entreprises/paysystem/logo.png",
    websiteUrl: "https://www.paysystem.eu",
    sectors: ["SAAS", "SERVICES_RH"],
    size: "TPE",
    // TODO: site web inactif (paysystem.eu en vente sur Sedo), entité juridique LU à compléter manuellement
    legalEntitySlug: null,
  },
  {
    slug: "wanted-design",
    name: "Wanted Design",
    logoFilename: "freelance/crm/entreprises/wanted-design/logo.png",
    websiteUrl: "https://www.wanteddesign.fr",
    sectors: ["EMARKETING", "IA_AUTOMATISATION"],
    size: "TPE",
    legalEntitySlug: "wantedesign-sas",
  },
  {
    // Client contractuel de la mission ; le client final reste anonymise tant que
    // Theodo n'a pas donne son accord ecrit de referencement (contrat-cadre, art. 6)
    slug: "theodo-extend",
    name: "Theodo Extend",
    logoFilename: "freelance/crm/entreprises/theodo-extend/logo.png",
    websiteUrl: "https://www.theodo.com",
    sectors: ["ESN_CONSEIL"],
    size: "ETI",
    legalEntitySlug: "that-sas",
  },
  {
    slug: OWNER_COMPANY_SLUG,
    name: "Thibaud Geisler",
    logoFilename: "branding/favicon-light.png",
    websiteUrl: "https://thibaud-geisler.com",
    sectors: ["IA_AUTOMATISATION"],
    size: "TPE",
    legalEntitySlug: "thibaud",
  },
]
