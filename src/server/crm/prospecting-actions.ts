import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { applyStatusRules } from "@/lib/crm/prospecting-action-status"
import {
  personIdSchema,
  prospectingActionIdSchema,
  type PersonId,
  type ProspectingActionId,
} from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import type { ProspectingActionInput } from "@/lib/schemas/prospecting-action"
import { isPrismaError } from "@/lib/server-utils"

import { PersonConflictError, type PersonConflict } from "./person-guards"
import { fail, ok, type DomainResult } from "@/server/result"

// La date de réponse reste facultative : la règle de statut la pose ou l'efface.
export type ProspectingActionWriteData = Omit<ProspectingActionInput, "respondedAt"> & {
  respondedAt?: ProspectingActionInput["respondedAt"]
}

// `reply` nul l'efface.
export type ProspectingActionPatch = Partial<ProspectingActionWriteData>

// `Extract` seul perdrait `no_lead_role`, qui partage son membre de l'union avec d'autres raisons.
type ProspectionConflict =
  Extract<PersonConflict, { reason: "opted_out" }> | (PersonConflict & { reason: "no_lead_role" })

const isProspectionConflict = (conflict: PersonConflict): conflict is ProspectionConflict =>
  conflict.reason === "no_lead_role" || conflict.reason === "opted_out"

export type ProspectingActionWriteError =
  | { code: "person_conflict"; conflict: ProspectionConflict }
  | { code: "person_not_found" }
  | { code: "not_found" }

export interface WrittenProspectingAction {
  id: ProspectingActionId
}

export const TIMING_SELECT = {
  status: true,
  occurredAt: true,
  respondedAt: true,
  reply: true,
} as const

const toWritten = (row: { id: string }): WrittenProspectingAction => ({
  id: prospectingActionIdSchema.parse(row.id),
})

// Une action de prospection ne vise qu'un lead : une personne seulement contact n'a pas de pipeline à nourrir.
async function requireProspectableLead(
  tx: Prisma.TransactionClient,
  personId: PersonId,
  actionId?: ProspectingActionId,
): Promise<void> {
  const lead = await tx.lead.findUnique({ where: { personId }, select: { personId: true } })
  if (!lead) throw new PersonConflictError({ reason: "no_lead_role", field: "personId" })
  await assertProspectionAllowed(tx, { personId, actionId })
}

// Une action ne se crée, ne se réécrit ni ne se replanifie pour une personne opposée, qu'elle la vise ou qu'elle y soit déjà rattachée : sans ce second cas, un déplacement vers un autre lead contournerait la règle.
// FOR SHARE attend le commit d'une opposition en cours (son UPDATE verrouille la ligne) : sans lui, une action s'écrirait entre la lecture et l'écriture.
export async function assertProspectionAllowed(
  tx: Prisma.TransactionClient,
  target:
    | { personId: PersonId; actionId?: ProspectingActionId }
    | { actionId: ProspectingActionId; personId?: undefined },
): Promise<void> {
  // Verrouille d'abord l'action : sans cela, un déplacement concurrent vers une autre personne passerait entre ce contrôle et l'écriture.
  if (target.actionId) {
    await tx.$queryRaw`SELECT id FROM "freelance"."ProspectingAction" WHERE id = ${target.actionId} FOR UPDATE`
  }
  const persons = await tx.$queryRaw<{ optedOutAt: Date | null }[]>`
    SELECT "optedOutAt" FROM "freelance"."Person"
    WHERE id = ${target.personId ?? null}
       OR id = (SELECT "personId" FROM "freelance"."ProspectingAction" WHERE id = ${target.actionId ?? null})
    FOR SHARE`
  const optedOutAt = persons.find((person) => person.optedOutAt)?.optedOutAt
  if (optedOutAt)
    throw new PersonConflictError({ reason: "opted_out", field: "personId", optedOutAt })
}

// Les gardes lèvent dans la transaction pour l'annuler : le conflit redevient une valeur à sa sortie.
function writeFailure(err: unknown): ProspectingActionWriteError | null {
  if (err instanceof PersonConflictError) {
    if (!isProspectionConflict(err.conflict)) throw err
    return { code: "person_conflict", conflict: err.conflict }
  }
  return isPrismaError(err, "P2003") ? { code: "person_not_found" } : null
}

export async function createProspectingAction(
  data: ProspectingActionWriteData,
): Promise<DomainResult<WrittenProspectingAction, ProspectingActionWriteError>> {
  try {
    return await prisma.$transaction(async (tx) => {
      await requireProspectableLead(tx, data.personId)
      const created = await tx.prospectingAction.create({
        data: {
          ...data,
          ...applyStatusRules(null, { ...data, respondedAt: data.respondedAt ?? null }, new Date()),
        },
        select: { id: true },
      })
      return ok(toWritten(created))
    })
  } catch (err) {
    const failure = writeFailure(err)
    if (failure) return fail(failure)
    throw err
  }
}

export async function updateProspectingAction(
  id: ProspectingActionId,
  patch: ProspectingActionPatch,
): Promise<DomainResult<WrittenProspectingAction, ProspectingActionWriteError>> {
  try {
    return await prisma.$transaction(
      async (tx): Promise<DomainResult<WrittenProspectingAction, ProspectingActionWriteError>> => {
        const stored = await tx.prospectingAction.findUnique({
          where: { id },
          select: { personId: true },
        })
        if (!stored) return fail({ code: "not_found" })

        // La garde (ses verrous) précède la lecture du timing : une opposition ou un déplacement concurrent se joue avant elle.
        await requireProspectableLead(
          tx,
          patch.personId ?? personIdSchema.parse(stored.personId),
          id,
        )

        const current = await tx.prospectingAction.findUnique({
          where: { id },
          select: TIMING_SELECT,
        })
        if (!current) return fail({ code: "not_found" })

        const next = {
          status: patch.status ?? current.status,
          occurredAt: patch.occurredAt ?? current.occurredAt,
          respondedAt: patch.respondedAt ?? null,
          reply: patch.reply === undefined ? current.reply : patch.reply,
        }
        const updated = await tx.prospectingAction.update({
          where: { id },
          data: { ...patch, ...applyStatusRules(current, next, new Date()) },
          select: { id: true },
        })
        return ok(toWritten(updated))
      },
    )
  } catch (err) {
    const failure = writeFailure(err)
    if (failure) return fail(failure)
    throw err
  }
}
