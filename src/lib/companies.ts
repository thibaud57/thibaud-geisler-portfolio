import { COMPANY_SECTORS, COMPANY_SIZES } from "@/lib/schemas/company"

export const COMPANY_SECTOR_LABELS: Record<(typeof COMPANY_SECTORS)[number], string> = {
  ASSURANCE: "Assurance",
  FINTECH: "Fintech",
  SAAS: "SaaS",
  SERVICES_RH: "Services RH",
  ESN_CONSEIL: "ESN / Conseil",
  LOGICIELS_ENTREPRISE: "Logiciels d'entreprise",
  ECOMMERCE: "E-commerce",
  IA_AUTOMATISATION: "IA / Automatisation",
  EMARKETING: "E-marketing",
  BANQUE: "Banque",
  AUTRE: "Autre",
}

export const COMPANY_SIZE_LABELS: Record<(typeof COMPANY_SIZES)[number], string> = {
  TPE: "TPE",
  PME: "PME",
  ETI: "ETI",
  GROUPE: "Groupe",
}
