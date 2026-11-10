import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { isEsn } from "@/lib/crm/companies"
import { exceedsDaysPerWeek, isClientIntermediary } from "@/lib/crm/opportunities"
import { opportunityIdSchema, type CompanyId, type OpportunityId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import type { OpportunityInput } from "@/lib/schemas/opportunity"
import { isPrismaError, isRowGone, rowExists, violatedConstraint } from "@/lib/server-utils"

import {
  resolveDetailsSection,
  type DetailsSection,
  type DetailsSectionError,
} from "./details-section"
import { fail, ok, type DomainResult } from "./result"

export type OpportunityWriteData = OpportunityInput

export type OpportunityPatch = Partial<OpportunityWriteData> & { detailsSection?: DetailsSection }

type OpportunityFieldsPatch = Partial<OpportunityWriteData> & { detailsSection?: undefined }

export type OpportunityCreateError =
  | { code: "client_is_intermediary" }
  | { code: "days_out_of_range" }
  | { code: "intermediary_not_esn" }
  | { code: "referrer_not_found"; field: "referrerId" }
  | { code: "company_not_found"; field: "intermediaryId" | "clientId" }

export type OpportunityFieldsError = OpportunityCreateError | { code: "not_found" }

export type OpportunityWriteError = OpportunityFieldsError | DetailsSectionError

export interface WrittenOpportunity {
  id: OpportunityId
  title: string
}

const WRITTEN_SELECT = { id: true, title: true } as const

const toWritten = (row: { id: string; title: string }): WrittenOpportunity => ({
  id: opportunityIdSchema.parse(row.id),
  title: row.title,
})

// Une ESN disparue passe ici et se lit ensuite sur la clé étrangère violée.
async function isNotEsn(
  client: Prisma.TransactionClient,
  companyId: CompanyId | null,
): Promise<boolean> {
  if (companyId === null) return false
  const company = await client.company.findUnique({
    where: { id: companyId },
    select: { types: true },
  })
  return company !== null && !isEsn(company)
}

// Clé étrangère en `<Table>_<col>_fkey` : le nom dit quelle fiche a disparu.
function missingRelation(err: unknown): OpportunityCreateError | null {
  if (!isPrismaError(err, "P2003")) return null

  const constraint = violatedConstraint(err)
  if (constraint?.includes("referrerId")) return { code: "referrer_not_found", field: "referrerId" }

  const field = (["intermediaryId", "clientId"] as const).find((candidate) =>
    constraint?.includes(candidate),
  )
  return field ? { code: "company_not_found", field } : null
}

export async function createOpportunity(
  data: OpportunityWriteData,
): Promise<DomainResult<WrittenOpportunity, OpportunityCreateError>> {
  if (isClientIntermediary(data.clientId, data.intermediaryId)) {
    return fail({ code: "client_is_intermediary" })
  }
  if (exceedsDaysPerWeek(data.onSiteDays, data.daysPerWeek)) {
    return fail({ code: "days_out_of_range" })
  }
  if (await isNotEsn(prisma, data.intermediaryId)) return fail({ code: "intermediary_not_esn" })

  try {
    return ok(toWritten(await prisma.opportunity.create({ data, select: WRITTEN_SELECT })))
  } catch (err) {
    const missing = missingRelation(err)
    if (missing) return fail(missing)
    throw err
  }
}

export function updateOpportunity(
  id: OpportunityId,
  patch: OpportunityFieldsPatch,
): Promise<DomainResult<WrittenOpportunity, OpportunityFieldsError>>
export function updateOpportunity(
  id: OpportunityId,
  patch: OpportunityPatch,
): Promise<DomainResult<WrittenOpportunity, OpportunityWriteError>>
export async function updateOpportunity(
  id: OpportunityId,
  patch: OpportunityPatch,
): Promise<DomainResult<WrittenOpportunity, OpportunityWriteError>> {
  const { detailsSection, ...fields } = patch

  try {
    return await prisma.$transaction(
      async (tx): Promise<DomainResult<WrittenOpportunity, OpportunityWriteError>> => {
        const stored = await tx.opportunity.findUnique({
          where: { id },
          select: {
            intermediaryId: true,
            clientId: true,
            daysPerWeek: true,
            onSiteDays: true,
            details: true,
          },
        })
        if (!stored) return fail({ code: "not_found" })

        // Le CHECK `Opportunity_intermediary_client_check` porte sur la ligne fusionnée : un patch d'un seul côté se compare à l'autre en base.
        const clientId = fields.clientId === undefined ? stored.clientId : fields.clientId
        const intermediaryId =
          fields.intermediaryId === undefined ? stored.intermediaryId : fields.intermediaryId
        if (isClientIntermediary(clientId, intermediaryId)) {
          return fail({ code: "client_is_intermediary" })
        }

        // Une ESN déjà reliée qui a perdu son type reste acceptée, sinon plus aucune modification ne passerait : seul un nouveau choix est revérifié.
        const intermediaryChanged =
          fields.intermediaryId !== undefined && fields.intermediaryId !== stored.intermediaryId
        if (intermediaryChanged && (await isNotEsn(tx, fields.intermediaryId ?? null))) {
          return fail({ code: "intermediary_not_esn" })
        }

        // Un patch qui ne change qu'un des deux jours se compare à la valeur en base.
        if (fields.daysPerWeek !== undefined || fields.onSiteDays !== undefined) {
          const daysPerWeek =
            fields.daysPerWeek === undefined ? stored.daysPerWeek : fields.daysPerWeek
          const onSiteDays = fields.onSiteDays === undefined ? stored.onSiteDays : fields.onSiteDays
          if (exceedsDaysPerWeek(onSiteDays, daysPerWeek)) {
            return fail({ code: "days_out_of_range" })
          }
        }

        const section = detailsSection
          ? resolveDetailsSection(stored.details, detailsSection)
          : null
        if (section && !section.ok) return section

        const updated = await tx.opportunity.update({
          where: { id },
          data: section ? { ...fields, details: section.value } : fields,
          select: WRITTEN_SELECT,
        })
        return ok(toWritten(updated))
      },
    )
  } catch (err) {
    const missing = missingRelation(err)
    if (missing) return fail(missing)
    if (await isRowGone(err, () => rowExists(prisma.opportunity, { id }))) {
      return fail({ code: "not_found" })
    }
    throw err
  }
}
