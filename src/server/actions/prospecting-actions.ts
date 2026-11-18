"use server"

import "server-only"

import { assertNever } from "@/lib/assert-never"
import { prospectingActionIdSchema } from "@/lib/ids"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import {
  STATUS_NOT_ALLOWED_MESSAGE,
  UNSENT_ACTION_IGNORED_MESSAGE,
} from "@/lib/crm/prospecting-action-status"
import {
  prospectingActionSchema,
  type ProspectingActionInput,
} from "@/lib/schemas/prospecting-action"
import { createActionLogger, rowExists, stringField } from "@/lib/server-utils"
import { PersonConflictError, revalidatePersonLists } from "@/server/crm/person-guards"
import {
  assertProspectionAllowed,
  createProspectingAction as createProspectingActionRecord,
  updateProspectingAction as updateProspectingActionRecord,
  type ProspectingActionWriteError,
  type WrittenProspectingAction,
} from "@/server/crm/prospecting-actions"
import type { DomainResult } from "@/server/result"

import { conflictErrors, personConflictMessage } from "./_support/person-form"
import {
  deleteEntity,
  domainFailure,
  type DomainFailure,
  failureState,
  formStateHandlers,
  MISSING_PERSON,
  saveEntity,
  type ActionEvents,
} from "./_support/shared"
import type {
  ProspectingActionDeleteState,
  ProspectingActionFormMessage,
  ProspectingActionFormState,
} from "./prospecting-actions.types"

const DELETED_ACTION_MESSAGE = "Cette action a été supprimée"

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

const failure = domainFailure<ProspectingActionInput, ProspectingActionFormMessage>

function mapDomainError(
  error: ProspectingActionWriteError,
  values: ProspectingActionFormState["values"],
): DomainFailure<ProspectingActionFormState> {
  switch (error.code) {
    case "person_conflict":
      return failure(values, conflictErrors(error.conflict), null)
    case "person_not_found":
      return failure(values, { personId: [MISSING_PERSON.text] }, MISSING_PERSON.code)
    case "not_found":
      return failure(values, {}, "prospecting_action_not_found", true)
    case "status_not_allowed":
      return failure(values, { status: [STATUS_NOT_ALLOWED_MESSAGE] }, null)
    case "unsent_action_ignored":
      return failure(values, { status: [UNSENT_ACTION_IGNORED_MESSAGE] }, null)
    default:
      return assertNever(error)
  }
}

// Le plateau n'a pas de champ où afficher l'erreur : chaque refus du domaine devient celle du statut.
function statusErrorMessage(error: ProspectingActionWriteError): string {
  switch (error.code) {
    case "person_conflict":
      return personConflictMessage(error.conflict)
    case "person_not_found":
      return MISSING_PERSON.text
    case "not_found":
      return DELETED_ACTION_MESSAGE
    case "status_not_allowed":
      return STATUS_NOT_ALLOWED_MESSAGE
    case "unsent_action_ignored":
      return UNSENT_ACTION_IGNORED_MESSAGE
    default:
      return assertNever(error)
  }
}

const prospectingActionExists = (id: string) => rowExists(prisma.prospectingAction, { id })

function saveProspectingAction(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (
    data: ProspectingActionInput,
  ) => Promise<DomainResult<WrittenProspectingAction, ProspectingActionWriteError>>,
): Promise<ProspectingActionFormState> {
  const values = collectValues(formData)

  return saveEntity<
    ProspectingActionInput,
    ProspectingActionFormState,
    WrittenProspectingAction,
    ProspectingActionWriteError
  >({
    actionName,
    events,
    schema: prospectingActionSchema,
    input: values,
    persist,
    successLogFields: (_data, action) => ({ id: action.id }),
    invalidateCaches: revalidatePersonLists,
    onDomainError: (error) => mapDomainError(error, values),
    ...formStateHandlers(values),
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
    createProspectingActionRecord,
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
    return failureState(
      mapDomainError({ code: "not_found" }, collectValues(formData)),
      revalidatePersonLists,
    )
  }
  const id = parsedId.data

  return saveProspectingAction(
    "updateProspectingAction",
    { success: "prospecting_action:updated", failure: "prospecting_action:update_failed" },
    formData,
    (data) => updateProspectingActionRecord(id, data),
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
      const result = await updateProspectingActionRecord(id, { status: parsed.data })
      if (!result.ok) {
        // L'écran montrait une action supprimée ailleurs : la revalidation le réaligne sur la base, sans quoi chaque glissement échouerait.
        if (result.error.code === "not_found") revalidatePersonLists()
        log.warn({
          event: "prospecting_action:status_change_refused",
          id,
          reason: result.error.code,
        })
        return {
          ok: false,
          errors: { status: [statusErrorMessage(result.error)] },
          message: null,
        }
      }
      revalidatePersonLists()
      log.info({ event: "prospecting_action:status_changed", id, status: parsed.data })
      return { ok: true, errors: {}, message: null }
    } catch (err) {
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
        return {
          ok: false,
          errors: { occurredAt: [personConflictMessage(err.conflict)] },
          message: null,
        }
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
