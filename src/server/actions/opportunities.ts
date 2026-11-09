"use server"

import "server-only"

import { assertNever } from "@/lib/assert-never"
import { getCurrentUser } from "@/lib/get-current-user"
import { opportunityIdSchema } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { opportunitySchema, type OpportunityInput } from "@/lib/schemas/opportunity"
import { rowExists, stringField } from "@/lib/server-utils"
import { revalidatePersonLists } from "@/server/crm/person-guards"
import {
  createOpportunity as createOpportunityRecord,
  updateOpportunity as updateOpportunityRecord,
  type OpportunityFieldsError,
  type WrittenOpportunity,
} from "@/server/crm/opportunities"
import type { DomainResult } from "@/server/crm/result"

import {
  type ActionEvents,
  deleteEntity,
  domainFailure,
  type DomainFailure,
  failureState,
  formStateHandlers,
  MISSING_COMPANY,
  MISSING_REFERRER,
  saveEntity,
} from "./_support/shared"
import type {
  OpportunityDeleteState,
  OpportunityFormMessage,
  OpportunityFormState,
} from "./opportunities.types"

// Les fiches lead, contact et entreprise montrent leurs opportunités (ou le statut Deal qu'elles dérivent), les entretiens leur titre, tarif, zone et contrat. Supprimer une opportunité supprime ses entretiens : leurs vues se rafraîchissent aussi (entretiens et entreprises via `revalidatePersonLists`).
function invalidateOpportunityCaches(): void {
  revalidatePersonLists()
}

function collectValues(formData: FormData): OpportunityFormState["values"] {
  return {
    title: stringField(formData, "title"),
    role: stringField(formData, "role"),
    status: stringField(formData, "status"),
    referrerId: stringField(formData, "referrerId"),
    intermediaryId: stringField(formData, "intermediaryId"),
    clientId: stringField(formData, "clientId"),
    dailyRate: stringField(formData, "dailyRate"),
    contract: stringField(formData, "contract"),
    workMode: stringField(formData, "workMode"),
    daysPerWeek: stringField(formData, "daysPerWeek"),
    onSiteDays: stringField(formData, "onSiteDays"),
    zone: stringField(formData, "zone"),
    startMonth: stringField(formData, "startMonth"),
    durationMonths: stringField(formData, "durationMonths"),
    notes: stringField(formData, "notes"),
    details: stringField(formData, "details"),
  }
}

const failure = domainFailure<OpportunityInput, OpportunityFormMessage>

function mapDomainError(
  error: OpportunityFieldsError,
  values: OpportunityFormState["values"],
): DomainFailure<OpportunityFormState> {
  switch (error.code) {
    case "intermediary_not_esn":
      return failure(
        values,
        { intermediaryId: ["L'ESN doit être une entreprise de type ESN / Recrutement"] },
        "intermediary_not_esn",
      )
    case "referrer_not_found":
      return failure(values, { referrerId: [MISSING_REFERRER.text] }, MISSING_REFERRER.code)
    case "company_not_found":
      return failure(values, { [error.field]: [MISSING_COMPANY.text] }, MISSING_COMPANY.code)
    case "client_is_intermediary":
      return failure(values, { clientId: ["Le client final ne peut pas être l'ESN"] }, null)
    case "days_out_of_range":
      return failure(
        values,
        { onSiteDays: ["Pas plus de jours sur site que de jours travaillés"] },
        null,
      )
    case "not_found":
      return failure(values, {}, "opportunity_not_found", true)
    default:
      return assertNever(error)
  }
}

const opportunityExists = (id: string) => rowExists(prisma.opportunity, { id })

function saveOpportunity(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (
    data: OpportunityInput,
  ) => Promise<DomainResult<WrittenOpportunity, OpportunityFieldsError>>,
): Promise<OpportunityFormState> {
  const values = collectValues(formData)

  return saveEntity<
    OpportunityInput,
    OpportunityFormState,
    WrittenOpportunity,
    OpportunityFieldsError
  >({
    actionName,
    events,
    schema: opportunitySchema,
    input: values,
    persist,
    successLogFields: (_data, opportunity) => ({ id: opportunity.id }),
    invalidateCaches: invalidateOpportunityCaches,
    onDomainError: (error) => mapDomainError(error, values),
    ...formStateHandlers(values),
  })
}

export async function createOpportunity(
  _prevState: OpportunityFormState,
  formData: FormData,
): Promise<OpportunityFormState> {
  // Défense en profondeur, hors du try : une Server Action exportée est joignable sans passer par la page.
  await getCurrentUser()

  return saveOpportunity(
    "createOpportunity",
    { success: "opportunity:created", failure: "opportunity:create_failed" },
    formData,
    createOpportunityRecord,
  )
}

export async function updateOpportunity(
  id: string,
  _prevState: OpportunityFormState,
  formData: FormData,
): Promise<OpportunityFormState> {
  await getCurrentUser()

  // Un id invalide ne désigne aucune fiche : même réponse qu'une opportunité supprimée.
  const parsedId = opportunityIdSchema.safeParse(id)
  if (!parsedId.success) {
    return failureState(
      mapDomainError({ code: "not_found" }, collectValues(formData)),
      invalidateOpportunityCaches,
    )
  }
  const opportunityId = parsedId.data

  return saveOpportunity(
    "updateOpportunity",
    { success: "opportunity:updated", failure: "opportunity:update_failed" },
    formData,
    (data) => updateOpportunityRecord(opportunityId, data),
  )
}

export async function deleteOpportunity(id: string): Promise<OpportunityDeleteState> {
  await getCurrentUser()

  return deleteEntity<OpportunityDeleteState>({
    actionName: "deleteOpportunity",
    events: { success: "opportunity:deleted", failure: "opportunity:delete_failed" },
    successLogFields: { id },
    exists: () => opportunityExists(id),
    destroy: () => prisma.opportunity.delete({ where: { id } }),
    invalidateCaches: invalidateOpportunityCaches,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
