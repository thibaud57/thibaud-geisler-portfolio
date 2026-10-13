"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import type { Prisma } from "@/generated/prisma/client"
import { ADMIN_COMPANIES_PATH } from "@/lib/admin/routes"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { interviewSchema, type InterviewInput } from "@/lib/schemas/interview"
import { stringField, stringValues } from "@/lib/server-utils"

import { type ActionEvents, deleteEntity, saveEntity } from "./_support/shared"
import type { InterviewFormMessage, InterviewFormState } from "./interviews.types"
import {
  assertNewIdentity,
  type DuplicateWording,
  PersonConflictError,
  revalidatePersonLists,
} from "./_support/person-guards"

// L'entretien s'affiche sur son opportunité et fait le statut « RDV planifié » de ses correspondants, leads comme contacts ; les entreprises en déduisent isProspect des leads actifs, qui lisent les entretiens ; `revalidatePersonLists` couvre aussi la liste des entretiens.
function invalidateInterviewCaches(): void {
  revalidatePath(ADMIN_COMPANIES_PATH, "layout")
  revalidatePersonLists()
}

const CORRESPONDENT_WORDING: DuplicateWording = {
  role: "contact",
  own: "Ce contact existe déjà",
  other: "Cette personne est déjà un lead",
  otherHint: ", choisissez-la parmi les correspondants existants",
}

type RuleField = "opportunityId" | "side" | "correspondentIds" | "newCorrespondents"

class InterviewRuleError extends Error {
  readonly field: RuleField
  readonly code: Exclude<InterviewFormMessage, "unknown_error" | null>

  constructor(field: RuleField, code: InterviewRuleError["code"], message: string) {
    super(message)
    this.field = field
    this.code = code
  }
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

// Mener côté ESN suppose que l'opportunité en a une ; les correspondants existants doivent exister, et un correspondant opposé reste un fait de l'entretien : seul un nouveau ne doit pas l'être.
async function assertInterviewTargets(
  data: InterviewInput,
  interviewId: string | null,
): Promise<void> {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: data.opportunityId },
    select: { intermediaryId: true },
  })
  if (!opportunity) {
    throw new InterviewRuleError(
      "opportunityId",
      "opportunity_not_found",
      "Cette opportunité n'existe plus, recharge la page",
    )
  }
  if (data.side === "ESN" && !opportunity.intermediaryId) {
    throw new InterviewRuleError(
      "side",
      "opportunity_without_intermediary",
      "Cette opportunité n'a pas d'ESN : l'entretien est mené par le client final",
    )
  }
  if (data.correspondentIds.length > 0) {
    const found = await prisma.person.count({
      where: {
        id: { in: data.correspondentIds },
        ...(interviewId === null
          ? { optedOutAt: null }
          : { OR: [{ optedOutAt: null }, { interviews: { some: { id: interviewId } } }] }),
      },
    })
    if (found !== data.correspondentIds.length) {
      throw new InterviewRuleError(
        "correspondentIds",
        "correspondent_not_found",
        "Un des correspondants n'existe plus, recharge la page",
      )
    }
  }
}

// Correspondant inconnu : personne au rôle Contact créée dans la même transaction ; email ou LinkedIn déjà
// connu (ou opposé à la prospection) refusé plutôt que dupliqué, par le garde partagé des fiches personne.
async function correspondentRefs(
  tx: Prisma.TransactionClient,
  correspondentIds: InterviewInput["correspondentIds"],
  newCorrespondents: InterviewInput["newCorrespondents"],
): Promise<{ id: string }[]> {
  const refs = correspondentIds.map((id) => ({ id }))
  for (const { contactType, ...person } of newCorrespondents) {
    await assertNewIdentity(
      tx,
      { email: person.email, linkedinUrl: person.linkedinUrl },
      null,
      CORRESPONDENT_WORDING,
    )
    const created = await tx.person.create({
      data: { ...person, contact: { create: { types: [contactType], status: "ACTIF" } } },
      select: { id: true },
    })
    refs.push(created)
  }
  return refs
}

function mapInterviewError(
  err: unknown,
  values: InterviewFormState["values"],
): InterviewFormState | null {
  const errors: InterviewFormState["errors"] = {}
  // « exists » comme « opted_out » refusent le doublon ; le message du garde dit lequel des deux.
  if (err instanceof PersonConflictError) {
    errors.newCorrespondents = [err.message]
    return { ok: false, errors, message: "correspondent_exists", values }
  }
  if (!(err instanceof InterviewRuleError)) return null
  errors[err.field] = [err.message]
  return { ok: false, errors, message: err.code, values }
}

const interviewExists = (id: string) =>
  prisma.interview.count({ where: { id } }).then((count) => count > 0)

function saveInterview(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (data: InterviewInput) => Promise<{ id: string }>,
  updatedId?: string,
): Promise<InterviewFormState> {
  const values = collectValues(formData)

  return saveEntity<InterviewInput, InterviewFormState, { id: string }>({
    actionName,
    events,
    schema: interviewSchema,
    input: values,
    persist,
    successLogFields: (_data, interview) => ({ id: interview.id }),
    invalidateCaches: invalidateInterviewCaches,
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    notFound:
      updatedId === undefined
        ? undefined
        : {
            exists: () => interviewExists(updatedId),
            state: () => ({ ok: false, errors: {}, message: "interview_not_found", values }),
          },
    mapError: (err) => mapInterviewError(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
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
    async (input) => {
      await assertInterviewTargets(input, null)
      const { correspondentIds, newCorrespondents, ...data } = input
      return prisma.$transaction(async (tx) => {
        const correspondents = await correspondentRefs(tx, correspondentIds, newCorrespondents)
        return tx.interview.create({
          data: { ...data, correspondents: { connect: correspondents } },
        })
      })
    },
  )
}

export async function updateInterview(
  id: string,
  _prevState: InterviewFormState,
  formData: FormData,
): Promise<InterviewFormState> {
  await getCurrentUser()

  return saveInterview(
    "updateInterview",
    { success: "interview:updated", failure: "interview:update_failed" },
    formData,
    async (input) => {
      await assertInterviewTargets(input, id)
      const { correspondentIds, newCorrespondents, ...data } = input
      return prisma.$transaction(async (tx) => {
        const correspondents = await correspondentRefs(tx, correspondentIds, newCorrespondents)
        return tx.interview.update({
          where: { id },
          data: { ...data, correspondents: { set: correspondents } },
        })
      })
    },
    id,
  )
}

export async function deleteInterview(id: string): Promise<InterviewFormState> {
  await getCurrentUser()

  return deleteEntity<InterviewFormState>({
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
