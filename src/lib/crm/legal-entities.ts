import { VatRegime } from "@/generated/prisma/browser"
import type { LegalForm } from "@/generated/prisma/client"

export const LEGAL_FORM_GROUPS: { country: string; forms: readonly LegalForm[] }[] = [
  {
    country: "France",
    forms: [
      "ENTREPRENEUR_INDIVIDUEL",
      "EURL",
      "SARL",
      "SAS",
      "SASU",
      "SA",
      "SNC",
      "SCI",
      "ASSOCIATION",
    ],
  },
  {
    country: "Luxembourg",
    forms: ["SARL_LU", "SARL_S_LU", "SA_LU"],
  },
  {
    country: "États-Unis",
    forms: ["INCORPORATED_US"],
  },
]

export const LEGAL_FORMS: LegalForm[] = LEGAL_FORM_GROUPS.flatMap((group) => group.forms)

// Le groupe suffit à situer une forme hors de France : inutile de répéter le pays dans les messages publics.
export const LEGAL_FORM_LABELS: Record<LegalForm, string> = {
  ENTREPRENEUR_INDIVIDUEL: "Entrepreneur individuel",
  EURL: "EURL",
  SARL: "SARL",
  SAS: "SAS",
  SASU: "SASU",
  SA: "SA",
  SNC: "SNC",
  SCI: "SCI",
  ASSOCIATION: "Association",
  SARL_LU: "S.à r.l.",
  SARL_S_LU: "S.à r.l.-S",
  SA_LU: "SA",
  INCORPORATED_US: "Incorporated",
}

export const REGISTERED_OFFICE_COUNTRIES = ["FR", "LU", "BE", "CH", "DE", "NL", "GB", "US"] as const

export const CAPITAL_CURRENCIES = ["EUR", "CHF", "USD", "GBP"] as const

export const DEFAULT_CURRENCY = "EUR"

// La franchise se dit par l'absence de régime, jamais par une valeur dédiée.
export const VAT_REGIMES = Object.values(VatRegime)

export const VAT_REGIME_LABELS: Record<VatRegime, string> = {
  REEL_SIMPLIFIE: "Réel simplifié",
  REEL_NORMAL: "Réel normal",
}

// En France, le SIREN tiré du SIRET tient lieu de numéro RCS.
export function isFrenchCountry(code: string | null | undefined): boolean {
  return code === "FR"
}

// Pays non renseigné : disposition française, le cas courant.
export function isFrenchLayout(country: string | null | undefined): boolean {
  return country === null || country === undefined || isFrenchCountry(country)
}

const COUNTRY_NAMES = new Map<string, Intl.DisplayNames>()

export function countryName(code: string, locale = "fr"): string {
  let names = COUNTRY_NAMES.get(locale)
  if (!names) {
    names = new Intl.DisplayNames([locale], { type: "region" })
    COUNTRY_NAMES.set(locale, names)
  }
  return names.of(code) ?? code
}

export function sirenFromSiret(siret: string | null): string | null {
  return siret?.length === 14 ? siret.slice(0, 9) : null
}

export function registrationLabel(entity: {
  siret: string | null
  rcsCity: string | null
  rcsNumber: string | null
  address: { country: string } | null
}): string | null {
  if (isFrenchLayout(entity.address?.country)) {
    if (!entity.rcsCity) return null
    const siren = sirenFromSiret(entity.siret)
    return siren ? `RCS ${entity.rcsCity} ${siren}` : `RCS ${entity.rcsCity}`
  }
  return [entity.rcsCity, entity.rcsNumber].filter(Boolean).join(" ") || null
}

export const LEGAL_ENTITY_FIELD_LABELS = {
  name: "Raison sociale",
  legalForm: "Forme juridique",
  siret: "SIRET",
  vatNumber: "N° TVA intracommunautaire",
  rcsCity: "Ville du RCS",
  rcsNumber: "Numéro RCS",
  phone: "Téléphone",
  capitalAmount: "Capital social",
  capitalCurrency: "Devise",
  registration: "Immatriculation",
  registeredOffice: "Siège social",
  street: "Rue",
  postalCode: "Code postal",
  city: "Ville",
  country: "Pays",
  vatSectionTitle: "TVA de l'éditeur",
  vatLiableSince: "Assujetti à la TVA depuis le",
  vatRegime: "Régime",
} as const

// Champs du bloc « Autres informations », replié par défaut : une valeur ou une erreur sur l'un d'eux l'ouvre.
export const LEGAL_ENTITY_MORE_FIELDS = [
  "legalEntityRcsCity",
  "legalEntityRcsNumber",
  "legalEntityPhone",
  "legalEntityCapitalAmount",
  "legalEntityCapitalCurrency",
] as const
