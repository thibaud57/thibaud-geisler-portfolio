"use server"

import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { prospectingActionIdSchema, type PersonId, type ProspectingActionId } from "@/lib/ids"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { applyStatusRules } from "@/lib/crm/prospecting-action-status"
import {
  prospectingActionSchema,
  type ProspectingActionInput,
} from "@/lib/schemas/prospecting-action"
import { createActionLogger, isPrismaError, stringField } from "@/lib/server-utils"

import {
  assertProspectionAllowed,
  conflictErrors,
  revalidatePersonLists,
  PersonConflictError,
} from "./_support/person-guards"
import {
  deleteEntity,
  formStateHandlers,
  MISSING_PERSON,
  missingRelationState,
  rowExists,
  saveEntity,
  type ActionEvents,
} from "./_support/shared"
import type {
  ProspectingActionDeleteState,
  ProspectingActionFormState,
} from "./prospecting-actions.types"

const DELETED_ACTION_MESSAGE = "Cette action a été supprimée"
const TIMING_SELECT = { status: true, occurredAt: true, respondedAt: true, reply: true } as const

function collectValues(formData: FormData): ProspectingActionFormState["values"] {
  return {
    title: stringField(formData, "title"),
    personId: stringField(formData, "personId"),
    channel: stringField(formData, "channel"),
    status: stringField(formData, "status"),
    occurredAt: stringField(formData, "occurredAt"),
    respondedAt: stringField(formData, "respondedAt"),
    message: stringField(formData, "message"),
    reply: stringField(formData, "reply"),
  }
}

// Une action de prospection ne vise qu'un lead : une personne seulement contact n'a pas de pipeline à nourrir.
async function requireProspectableLead(
  tx: Prisma.TransactionClient,
  personId: PersonId,
  actionId?: ProspectingActionId,
): Promise<void> {
  const lead = await tx.lead.findUnique({ where: { personId }, select: { personId: true } })
  if (!lead) {
    throw new PersonConflictError("personId", "not_found", "Cette personne n'a pas de fiche lead")
  }
  await assertProspectionAllowed(tx, { personId, actionId })
}

function mapActionError(
  err: unknown,
  values: ProspectingActionFormState["values"],
): ProspectingActionFormState | null {
  if (err instanceof PersonConflictError) {
    return { ok: false, errors: conflictErrors(err), message: null, values }
  }
  if (!isPrismaError(err, "P2003")) return null
  return missingRelationState("personId", MISSING_PERSON, values)
}

const prospectingActionExists = (id: string) => rowExists(prisma.prospectingAction, { id })

function saveProspectingAction(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (tx: Prisma.TransactionClient, data: ProspectingActionInput) => Promise<{ id: string }>,
  updatedId?: ProspectingActionId,
): Promise<ProspectingActionFormState> {
  const values = collectValues(formData)

  return saveEntity<ProspectingActionInput, ProspectingActionFormState, { id: string }>({
    actionName,
    events,
    schema: prospectingActionSchema,
    input: values,
    persist: (data) =>
      prisma.$transaction(async (tx) => {
        await requireProspectableLead(tx, data.personId, updatedId)
        return persist(tx, data)
      }),
    successLogFields: (_data, action) => ({ id: action.id }),
    invalidateCaches: revalidatePersonLists,
    mapError: (err) => mapActionError(err, values),
    ...formStateHandlers(values, {
      message: "prospecting_action_not_found",
      updatedId,
      exists: prospectingActionExists,
    }),
  })
}

export async function createProspectingAction(
  _prevState: ProspectingActionFormState,
  formData: FormData,
): Promise<ProspectingActionFormState> {
  // Défense en profondeur, hors du try : une Server Action exportée est joignable sans passer par la page.
  await getCurrentUser()

  return saveProspectingAction(
    "createProspectingAction",
    { success: "prospecting_action:created", failure: "prospecting_action:create_failed" },
    formData,
    (tx, data) =>
      tx.prospectingAction.create({
        data: { ...data, ...applyStatusRules(null, data, new Date()) },
      }),
  )
}

export async function updateProspectingAction(
  rawId: string,
  _prevState: ProspectingActionFormState,
  formData: FormData,
): Promise<ProspectingActionFormState> {
  await getCurrentUser()

  const parsedId = prospectingActionIdSchema.safeParse(rawId)
  if (!parsedId.success) {
    return {
      ok: false,
      errors: {},
      message: "prospecting_action_not_found",
      values: collectValues(formData),
    }
  }
  const id = parsedId.data

  return saveProspectingAction(
    "updateProspectingAction",
    { success: "prospecting_action:updated", failure: "prospecting_action:update_failed" },
    formData,
    async (tx, data) => {
      const current = await tx.prospectingAction.findUniqueOrThrow({
        where: { id },
        select: TIMING_SELECT,
      })
      return tx.prospectingAction.update({
        where: { id },
        data: { ...data, ...applyStatusRules(current, data, new Date()) },
      })
    },
    id,
  )
}

export async function changeProspectingActionStatus(
  rawId: string,
  status: string,
): Promise<ProspectingActionFormState> {
  await getCurrentUser()

  return createActionLogger("changeProspectingActionStatus", async ({ log }) => {
    const parsed = prospectingActionSchema.shape.status.safeParse(status)
    if (!parsed.success) {
      return { ok: false, errors: { status: ["Statut inconnu"] }, message: null }
    }
    const parsedId = prospectingActionIdSchema.safeParse(rawId)
    if (!parsedId.success) {
      return { ok: false, errors: { status: [DELETED_ACTION_MESSAGE] }, message: null }
    }
    const id = parsedId.data

    try {
      await prisma.$transaction(async (tx) => {
        await assertProspectionAllowed(tx, { actionId: id })
        const current = await tx.prospectingAction.findUniqueOrThrow({
          where: { id },
          select: TIMING_SELECT,
        })
        const timing = applyStatusRules(
          current,
          { ...current, status: parsed.data, respondedAt: null },
          new Date(),
        )
        await tx.prospectingAction.update({ where: { id }, data: timing })
      })
      revalidatePersonLists()
      log.info({ event: "prospecting_action:status_changed", id, status: parsed.data })
      return { ok: true, errors: {}, message: null }
    } catch (err) {
      if (err instanceof PersonConflictError) {
        log.warn({ event: "prospecting_action:status_change_refused", id, reason: "opted_out" })
        return { ok: false, errors: { status: [err.message] }, message: null }
      }
      if (isPrismaError(err, "P2025") && !(await prospectingActionExists(id))) {
        // L'écran montrait une action supprimée ailleurs : la revalidation le réaligne sur la base, sans quoi chaque glissement échouerait.
        revalidatePersonLists()
        log.warn({ event: "prospecting_action:status_change_refused", id, reason: "deleted" })
        return { ok: false, errors: { status: [DELETED_ACTION_MESSAGE] }, message: null }
      }
      log.error({ err, event: "prospecting_action:status_change_failed", id })
      return { ok: false, errors: {}, message: "unknown_error" }
    }
  })
}

// La garde vit dans la requête (updateMany conditionné au statut), pas seulement dans le calendrier : une action passée à Fait dans un autre onglet garde sa date réelle d'envoi.
export async function rescheduleProspectingAction(
  rawId: string,
  occurredAt: string,
): Promise<ProspectingActionFormState> {
  await getCurrentUser()

  return createActionLogger("rescheduleProspectingAction", async ({ log }) => {
    const parsed = prospectingActionSchema.shape.occurredAt.safeParse(occurredAt)
    if (!parsed.success) {
      return { ok: false, errors: { occurredAt: ["Date invalide"] }, message: null }
    }
    const parsedId = prospectingActionIdSchema.safeParse(rawId)
    if (!parsedId.success) {
      return { ok: false, errors: { occurredAt: [DELETED_ACTION_MESSAGE] }, message: null }
    }
    const id = parsedId.data

    try {
      const { count } = await prisma.$transaction(async (tx) => {
        await assertProspectionAllowed(tx, { actionId: id })
        return tx.prospectingAction.updateMany({
          where: { id, status: "A_FAIRE" },
          data: { occurredAt: parsed.data },
        })
      })
      if (count === 0) {
        const stillExists = await prospectingActionExists(id)
        // L'écran montrait une action périmée (passée à Fait ou supprimée ailleurs) : la revalidation le réaligne sur la base, sans quoi chaque nouvel essai échouerait.
        revalidatePersonLists()
        log.warn({ event: "prospecting_action:reschedule_refused", id })
        return {
          ok: false,
          errors: {
            occurredAt: [
              stillExists ? "Seule une action à faire se replanifie" : DELETED_ACTION_MESSAGE,
            ],
          },
          message: null,
        }
      }
      revalidatePersonLists()
      log.info({ event: "prospecting_action:rescheduled", id })
      return { ok: true, errors: {}, message: null }
    } catch (err) {
      if (err instanceof PersonConflictError) {
        revalidatePersonLists()
        log.warn({ event: "prospecting_action:reschedule_refused", id })
        return { ok: false, errors: { occurredAt: [err.message] }, message: null }
      }
      log.error({ err, event: "prospecting_action:reschedule_failed", id })
      return { ok: false, errors: {}, message: "unknown_error" }
    }
  })
}

export async function deleteProspectingAction(id: string): Promise<ProspectingActionDeleteState> {
  await getCurrentUser()

  return deleteEntity<ProspectingActionDeleteState>({
    actionName: "deleteProspectingAction",
    events: { success: "prospecting_action:deleted", failure: "prospecting_action:delete_failed" },
    successLogFields: { id },
    exists: () => prospectingActionExists(id),
    destroy: () => prisma.prospectingAction.delete({ where: { id } }),
    invalidateCaches: revalidatePersonLists,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
