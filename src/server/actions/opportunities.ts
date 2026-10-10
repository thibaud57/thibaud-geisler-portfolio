"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import { ADMIN_COMPANIES_PATH, ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin-routes"
import { isEsn } from "@/lib/companies"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { opportunitySchema, type OpportunityInput } from "@/lib/schemas/opportunity"
import { isPrismaError, stringField, violatedConstraint } from "@/lib/server-utils"

import { type ActionEvents, deleteEntity, saveEntity } from "./shared"
import type { OpportunityFormState } from "./opportunities.types"
import { revalidatePersonLists } from "./person-guards"

// Les fiches lead, contact et entreprise montrent leurs opportunités (ou le statut Deal qu'elles dérivent) : leurs vues se rafraîchissent aussi.
function invalidateOpportunityCaches(): void {
  revalidatePath(ADMIN_OPPORTUNITIES_PATH, "layout")
  revalidatePath(ADMIN_COMPANIES_PATH, "layout")
  revalidatePersonLists()
}

class IntermediaryNotEsnError extends Error {}

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

// Le formulaire ne propose que des ESN : le serveur revérifie, le type ayant pu changer depuis l'affichage.
// Une ESN disparue passe ici et se lit ensuite sur la clé étrangère violée.
async function assertIntermediaryIsEsn(intermediaryId: string | null): Promise<void> {
  if (!intermediaryId) return
  const company = await prisma.company.findUnique({
    where: { id: intermediaryId },
    select: { types: true },
  })
  if (company && !isEsn(company)) throw new IntermediaryNotEsnError()
}

function mapOpportunityError(
  err: unknown,
  values: OpportunityFormState["values"],
): OpportunityFormState | null {
  const errors: OpportunityFormState["errors"] = {}
  if (err instanceof IntermediaryNotEsnError) {
    errors.intermediaryId = ["L'ESN doit être une entreprise de type ESN / Recrutement"]
    return { ok: false, errors, message: "intermediary_not_esn", values }
  }
  // Clé étrangère en `<Table>_<col>_fkey` : le nom dit quelle fiche a disparu.
  if (isPrismaError(err, "P2003")) {
    const constraint = violatedConstraint(err)
    if (constraint.includes("referrerId")) {
      errors.referrerId = ["Cet apporteur n'existe plus, recharge la page"]
      return { ok: false, errors, message: "referrer_not_found", values }
    }
    const companyField = (["intermediaryId", "clientId"] as const).find((field) =>
      constraint.includes(field),
    )
    if (companyField) {
      errors[companyField] = ["Cette entreprise n'existe plus, recharge la page"]
      return { ok: false, errors, message: "company_not_found", values }
    }
  }
  return null
}

function saveOpportunity(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  write: (data: OpportunityInput) => Promise<{ id: string }>,
  storedIntermediaryId?: () => Promise<string | null>,
): Promise<OpportunityFormState> {
  const values = collectValues(formData)

  return saveEntity<OpportunityInput, OpportunityFormState, { id: string }>({
    actionName,
    events,
    schema: opportunitySchema,
    input: values,
    persist: async (data) => {
      // Une ESN déjà reliée qui a perdu son type reste acceptée, sinon plus aucune modification ne passerait : seul un nouveau choix est revérifié.
      const unchanged =
        storedIntermediaryId !== undefined && data.intermediaryId === (await storedIntermediaryId())
      if (!unchanged) await assertIntermediaryIsEsn(data.intermediaryId)
      return write(data)
    },
    successLogFields: (_data, opportunity) => ({ id: opportunity.id }),
    invalidateCaches: invalidateOpportunityCaches,
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) => mapOpportunityError(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
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
    (data) => prisma.opportunity.create({ data }),
  )
}

export async function updateOpportunity(
  id: string,
  _prevState: OpportunityFormState,
  formData: FormData,
): Promise<OpportunityFormState> {
  await getCurrentUser()

  return saveOpportunity(
    "updateOpportunity",
    { success: "opportunity:updated", failure: "opportunity:update_failed" },
    formData,
    (data) => prisma.opportunity.update({ where: { id }, data }),
    async () =>
      (await prisma.opportunity.findUnique({ where: { id }, select: { intermediaryId: true } }))
        ?.intermediaryId ?? null,
  )
}

export async function deleteOpportunity(id: string): Promise<OpportunityFormState> {
  await getCurrentUser()

  return deleteEntity<OpportunityFormState>({
    actionName: "deleteOpportunity",
    events: { success: "opportunity:deleted", failure: "opportunity:delete_failed" },
    successLogFields: { id },
    destroy: () => prisma.opportunity.delete({ where: { id } }),
    invalidateCaches: invalidateOpportunityCaches,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: () => null,
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
