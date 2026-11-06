import "server-only"

import type { LegalForm, Prisma } from "@/generated/prisma/client"
import { assertNever } from "@/lib/assert-never"
import { companyFields } from "@/lib/crm/companies"
import { replaceDetailsSection } from "@/lib/crm/details-sections"
import { DEFAULT_CURRENCY, isFrenchCountry } from "@/lib/crm/legal-entities"
import type { CompanyId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import type { CompanyInput } from "@/lib/schemas/company"
import { companyLogoRequestSchema } from "@/lib/schemas/company-logo"
import { isPrismaError, violatedConstraint } from "@/lib/server-utils"
import {
  retrieveCompanyLogo,
  type CompanyIconFailure,
} from "@/server/company-logo/fetch-company-logo"

import { fail, ok, type DomainResult } from "./result"

export type LegalEntityKey = Extract<keyof CompanyInput, `legalEntity${string}`>

export type CompanyWriteData = CompanyInput

export type CompanyPatch =
  | { kind: "fields"; fields: Partial<CompanyInput> }
  | {
      kind: "section"
      fields: Partial<Omit<CompanyInput, "details" | LegalEntityKey>>
      detailsSection: { heading: string; content: string }
    }

export type CompanyCreateError =
  { code: "slug_taken" } | { code: "siret_taken" } | { code: "legal_entity_slug_taken" }

export type CompanyFieldsError = CompanyCreateError | { code: "not_found" }

export type CompanyWriteError =
  CompanyFieldsError | { code: "no_details" } | { code: "section_not_found"; headings: string[] }

const SUMMARY_SELECT = { id: true, slug: true, name: true } as const

export type CompanySummary = Prisma.CompanyGetPayload<{ select: typeof SUMMARY_SELECT }>

export type CompanyLogoError =
  | { code: "not_found" }
  | { code: "no_website" }
  | { code: "invalid_website" }
  | { code: CompanyIconFailure["message"] }

type FieldsPatch = Extract<CompanyPatch, { kind: "fields" }>

// Les tags que lit le site public : chaque adaptateur les invalide avec sa primitive (updateTag en action, revalidateTag en outil MCP).
export const COMPANY_CACHE_TAGS = ["projects", "legal-entity"] as const

// Un champ absent du patch reste undefined : Prisma l'ignore à la mise à jour, donc inchangé.
interface LegalEntityDraft {
  fields: {
    name: string
    legalForm?: LegalForm | null
    siret?: string | null
    vatNumber?: string | null
    rcsCity?: string | null
    rcsNumber?: string | null
    phone?: string | null
    capitalAmount?: number | null
    capitalCurrency?: string | null
  }
  address: { street: string; postalCode: string; city: string; country: string } | null
}

function toLegalEntityDraft(data: Partial<CompanyInput>): LegalEntityDraft | undefined {
  // Après validation (refineLegalEntity), un nom présent garantit aussi un siège complet : aucun champ rempli n'en tient lieu.
  const name = data.legalEntityName
  if (!name) return undefined

  const address =
    data.legalEntityStreet &&
    data.legalEntityPostalCode &&
    data.legalEntityCity &&
    data.legalEntityCountry
      ? {
          street: data.legalEntityStreet,
          postalCode: data.legalEntityPostalCode,
          city: data.legalEntityCity,
          country: data.legalEntityCountry,
        }
      : null
  const capitalAmount = data.legalEntityCapitalAmount
  const capitalCurrency =
    capitalAmount === undefined
      ? undefined
      : capitalAmount === null
        ? null
        : (data.legalEntityCapitalCurrency ?? DEFAULT_CURRENCY)

  return {
    fields: {
      name,
      legalForm: data.legalEntityStatusKey,
      siret: data.legalEntitySiret,
      vatNumber: data.legalEntityVatNumber,
      rcsCity: data.legalEntityRcsCity,
      rcsNumber: isFrenchCountry(address?.country) ? null : data.legalEntityRcsNumber,
      phone: data.legalEntityPhone,
      capitalAmount,
      capitalCurrency,
    },
    address,
  }
}

function legalEntityCreate(slug: string, legal: LegalEntityDraft) {
  return {
    slug,
    ...legal.fields,
    ...(legal.address ? { address: { create: legal.address } } : {}),
  }
}

function toCreateData(data: CompanyWriteData): Prisma.CompanyCreateInput {
  const legal = toLegalEntityDraft(data)
  return {
    ...companyFields(data),
    ...(legal ? { legalEntity: { create: legalEntityCreate(data.slug, legal) } } : {}),
  }
}

interface CurrentLegalEntity {
  addressId: string | null
  publisher: { id: string } | null
}

function addressMutation(legal: LegalEntityDraft, current: CurrentLegalEntity | null) {
  if (legal.address) return { upsert: { create: legal.address, update: legal.address } }
  if (current?.addressId) return { delete: true as const }
  return undefined
}

function legalEntityUpsert(
  data: Partial<CompanyInput>,
  slug: string,
  legal: LegalEntityDraft,
  current: CurrentLegalEntity | null,
): NonNullable<Prisma.CompanyUpdateInput["legalEntity"]> {
  const address = addressMutation(legal, current)
  // Jamais de Publisher créé ici : seule l'entité de l'éditeur en porte un, posé hors de ce formulaire.
  const publisher = current?.publisher
    ? {
        update: {
          vatRegime: data.legalEntityVatRegime,
          vatLiableSince: data.legalEntityVatLiableSince,
        },
      }
    : undefined

  return {
    upsert: {
      create: legalEntityCreate(slug, legal),
      update: {
        ...legal.fields,
        ...(address ? { address } : {}),
        ...(publisher ? { publisher } : {}),
      },
    },
  }
}

function uniqueViolation(err: unknown): CompanyCreateError | null {
  if (!isPrismaError(err, "P2002")) return null

  const constraint = violatedConstraint(err)
  if (constraint?.includes("siret")) return { code: "siret_taken" }
  if (constraint?.includes("LegalEntity_slug")) return { code: "legal_entity_slug_taken" }
  return { code: "slug_taken" }
}

async function companyExists(id: CompanyId): Promise<boolean> {
  return (await prisma.company.count({ where: { id } })) > 0
}

export async function createCompany(
  data: CompanyWriteData,
): Promise<DomainResult<CompanySummary, CompanyCreateError>> {
  try {
    return ok(await prisma.company.create({ data: toCreateData(data), select: SUMMARY_SELECT }))
  } catch (err) {
    const taken = uniqueViolation(err)
    if (taken) return fail(taken)
    throw err
  }
}

type Tx = Prisma.TransactionClient

async function writeFields(
  tx: Tx,
  id: CompanyId,
  fields: Partial<CompanyInput>,
): Promise<DomainResult<CompanySummary, CompanyFieldsError>> {
  const legal = toLegalEntityDraft(fields)
  // Sans nom d'entité légale, seuls les champs de l'entreprise s'écrivent et l'entité reste intacte.
  if (!legal) {
    return ok(
      await tx.company.update({
        where: { id },
        data: companyFields(fields),
        select: SUMMARY_SELECT,
      }),
    )
  }

  const current = await tx.company.findUnique({
    where: { id },
    select: {
      slug: true,
      legalEntity: { select: { addressId: true, publisher: { select: { id: true } } } },
    },
  })
  if (!current) return fail({ code: "not_found" })

  return ok(
    await tx.company.update({
      where: { id },
      data: {
        ...companyFields(fields),
        legalEntity: legalEntityUpsert(
          fields,
          fields.slug ?? current.slug,
          legal,
          current.legalEntity,
        ),
      },
      select: SUMMARY_SELECT,
    }),
  )
}

async function resolveDetails(
  tx: Tx,
  id: CompanyId,
  section: { heading: string; content: string },
): Promise<DomainResult<string, CompanyWriteError>> {
  const company = await tx.company.findUnique({ where: { id }, select: { details: true } })
  if (!company) return fail({ code: "not_found" })

  const replaced = replaceDetailsSection(company.details, section.heading, section.content)
  if (replaced.ok) return ok(replaced.details)
  switch (replaced.code) {
    case "no_details":
      return fail({ code: "no_details" })
    case "section_not_found":
      return fail({ code: "section_not_found", headings: replaced.headings })
    default:
      return assertNever(replaced)
  }
}

export function updateCompany(
  id: CompanyId,
  patch: FieldsPatch,
): Promise<DomainResult<CompanySummary, CompanyFieldsError>>
export function updateCompany(
  id: CompanyId,
  patch: CompanyPatch,
): Promise<DomainResult<CompanySummary, CompanyWriteError>>
export async function updateCompany(
  id: CompanyId,
  patch: CompanyPatch,
): Promise<DomainResult<CompanySummary, CompanyWriteError>> {
  try {
    return await prisma.$transaction(async (tx) => {
      if (patch.kind === "fields") return writeFields(tx, id, patch.fields)

      const details = await resolveDetails(tx, id, patch.detailsSection)
      if (!details.ok) return details
      return writeFields(tx, id, { ...patch.fields, details: details.value })
    })
  } catch (err) {
    const taken = uniqueViolation(err)
    if (taken) return fail(taken)
    // Un P2025 vient aussi d'une instruction secondaire (siège ou Publisher absent) : seule l'absence réelle de l'entreprise vaut « introuvable ».
    if (isPrismaError(err, "P2025") && !(await companyExists(id))) {
      return fail({ code: "not_found" })
    }
    throw err
  }
}

export async function refreshCompanyLogo(
  id: CompanyId,
): Promise<DomainResult<{ key: string }, CompanyLogoError>> {
  const company = await prisma.company.findUnique({
    where: { id },
    select: { websiteUrl: true, slug: true },
  })
  if (!company) return fail({ code: "not_found" })
  if (!company.websiteUrl) return fail({ code: "no_website" })

  const request = companyLogoRequestSchema.safeParse({
    websiteUrl: company.websiteUrl,
    slug: company.slug,
  })
  if (!request.success) return fail({ code: "invalid_website" })

  const outcome = await retrieveCompanyLogo(request.data.websiteUrl, request.data.slug)
  if (!outcome.ok) return fail({ code: outcome.message })

  await prisma.company.update({ where: { id }, data: { logoFilename: outcome.key } })
  return ok({ key: outcome.key })
}
