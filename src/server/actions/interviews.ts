"use server"

import "server-only"

import { assertNever } from "@/lib/assert-never"
import { getCurrentUser } from "@/lib/get-current-user"
import { interviewIdSchema } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { interviewSchema, type InterviewInput } from "@/lib/schemas/interview"
import { rowExists, stringField, stringValues } from "@/lib/server-utils"
import {
  createInterview as createInterviewRecord,
  updateInterview as updateInterviewRecord,
  type InterviewFieldsError,
  type WrittenInterview,
} from "@/server/crm/interviews"
import { revalidatePersonLists } from "@/server/crm/person-guards"
import type { DomainResult } from "@/server/crm/result"

import {
  type ActionEvents,
  deleteEntity,
  domainFailure,
  type DomainFailure,
  failureState,
  formStateHandlers,
  saveEntity,
} from "./_support/shared"
import type {
  InterviewDeleteState,
  InterviewFormMessage,
  InterviewFormState,
} from "./interviews.types"
import { CORRESPONDENT_WORDING, personConflictMessage } from "./_support/person-form"

// L'entretien s'affiche sur son opportunité et fait le statut « RDV planifié » de ses correspondants, leads comme contacts ; les entreprises en déduisent isProspect des leads actifs, qui lisent les entretiens ; `revalidatePersonLists` couvre les listes des entretiens et des entreprises.
function invalidateInterviewCaches(): void {
  revalidatePersonLists()
}

function collectValues(formData: FormData): InterviewFormState["values"] {
  return {
    opportunityId: stringField(formData, "opportunityId"),
    side: stringField(formData, "side"),
    correspondentIds: stringValues(formData, "correspondentIds"),
    newCorrespondents: stringField(formData, "newCorrespondents"),
    type: stringField(formData, "type"),
    format: stringField(formData, "format"),
    status: stringField(formData, "status"),
    outcome: stringField(formData, "outcome"),
    scheduledAt: stringField(formData, "scheduledAt"),
    score: stringField(formData, "score"),
    decision: stringField(formData, "decision"),
    notes: stringField(formData, "notes"),
    details: stringField(formData, "details"),
  }
}

const failure = domainFailure<InterviewInput, InterviewFormMessage>

function mapDomainError(
  error: InterviewFieldsError,
  values: InterviewFormState["values"],
): DomainFailure<InterviewFormState> {
  switch (error.code) {
    case "opportunity_not_found":
      return failure(
        values,
        { opportunityId: ["Cette opportunité n'existe plus, recharge la page"] },
        "opportunity_not_found",
      )
    case "opportunity_without_intermediary":
      return failure(
        values,
        { side: ["Cette opportunité n'a pas d'ESN : l'entretien est mené par le client final"] },
        "opportunity_without_intermediary",
      )
    case "correspondent_not_found":
      return failure(
        values,
        { correspondentIds: ["Un des correspondants n'existe plus, recharge la page"] },
        "correspondent_not_found",
      )
    // « exists » comme « opted_out » refusent le doublon ; le message du garde dit lequel des deux.
    case "correspondent_exists":
      return failure(
        values,
        { newCorrespondents: [personConflictMessage(error.conflict, CORRESPONDENT_WORDING)] },
        "correspondent_exists",
      )
    case "not_found":
      return failure(values, {}, "interview_not_found", true)
    default:
      return assertNever(error)
  }
}

const interviewExists = (id: string) => rowExists(prisma.interview, { id })

function saveInterview(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (data: InterviewInput) => Promise<DomainResult<WrittenInterview, InterviewFieldsError>>,
): Promise<InterviewFormState> {
  const values = collectValues(formData)

  return saveEntity<InterviewInput, InterviewFormState, WrittenInterview, InterviewFieldsError>({
    actionName,
    events,
    schema: interviewSchema,
    input: values,
    persist,
    successLogFields: (_data, interview) => ({ id: interview.id }),
    invalidateCaches: invalidateInterviewCaches,
    onDomainError: (error) => mapDomainError(error, values),
    ...formStateHandlers(values),
  })
}

export async function createInterview(
  _prevState: InterviewFormState,
  formData: FormData,
): Promise<InterviewFormState> {
  // Défense en profondeur, hors du try : une Server Action exportée est joignable sans passer par la page.
  await getCurrentUser()

  return saveInterview(
    "createInterview",
    { success: "interview:created", failure: "interview:create_failed" },
    formData,
    createInterviewRecord,
  )
}

export async function updateInterview(
  id: string,
  _prevState: InterviewFormState,
  formData: FormData,
): Promise<InterviewFormState> {
  await getCurrentUser()

  // Un id invalide ne désigne aucun entretien : même réponse qu'un entretien supprimé.
  const parsedId = interviewIdSchema.safeParse(id)
  if (!parsedId.success) {
    return failureState(
      mapDomainError({ code: "not_found" }, collectValues(formData)),
      invalidateInterviewCaches,
    )
  }
  const interviewId = parsedId.data

  return saveInterview(
    "updateInterview",
    { success: "interview:updated", failure: "interview:update_failed" },
    formData,
    (data) => updateInterviewRecord(interviewId, data),
  )
}

export async function deleteInterview(id: string): Promise<InterviewDeleteState> {
  await getCurrentUser()

  return deleteEntity<InterviewDeleteState>({
    actionName: "deleteInterview",
    events: { success: "interview:deleted", failure: "interview:delete_failed" },
    successLogFields: { id },
    exists: () => interviewExists(id),
    destroy: () => prisma.interview.delete({ where: { id } }),
    invalidateCaches: invalidateInterviewCaches,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
