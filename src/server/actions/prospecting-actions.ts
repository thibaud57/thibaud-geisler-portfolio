"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import {
  ADMIN_COMPANIES_PATH,
  ADMIN_LEADS_PATH,
  ADMIN_PROSPECTING_ACTIONS_PATH,
} from "@/lib/admin-routes"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { applyStatusRules } from "@/lib/prospecting-action-status"
import {
  prospectingActionSchema,
  type ProspectingActionInput,
} from "@/lib/schemas/prospecting-action"
import { createActionLogger, isPrismaError, stringField } from "@/lib/server-utils"

import { deleteEntity, saveEntity, type ActionEvents } from "./shared"
import type { ProspectingActionFormState } from "./prospecting-actions.types"

const TIMING_SELECT = { status: true, occurredAt: true, respondedAt: true } as const

// Variante "layout" : les vues actions, leads et entreprises (le premier contact dérive des actions) se rafraîchissent toutes.
function invalidateActionCaches(): void {
  revalidatePath(ADMIN_PROSPECTING_ACTIONS_PATH, "layout")
  revalidatePath(ADMIN_LEADS_PATH, "layout")
  revalidatePath(ADMIN_COMPANIES_PATH, "layout")
}

function collectValues(formData: FormData): ProspectingActionFormState["values"] {
  return {
    title: stringField(formData, "title"),
    personId: stringField(formData, "personId"),
    channel: stringField(formData, "channel"),
    status: stringField(formData, "status"),
    occurredAt: stringField(formData, "occurredAt"),
    respondedAt: stringField(formData, "respondedAt"),
    message: stringField(formData, "message"),
  }
}

function mapActionError(
  err: unknown,
  values: ProspectingActionFormState["values"],
): ProspectingActionFormState | null {
  if (!isPrismaError(err, "P2003")) return null
  return {
    ok: false,
    errors: { personId: ["Cette personne n'existe plus, recharge la page"] },
    message: "person_not_found",
    values,
  }
}

function saveProspectingAction(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (data: ProspectingActionInput) => Promise<{ id: string }>,
): Promise<ProspectingActionFormState> {
  const values = collectValues(formData)

  return saveEntity<ProspectingActionInput, ProspectingActionFormState, { id: string }>({
    actionName,
    events,
    schema: prospectingActionSchema,
    input: values,
    persist,
    successLogFields: (_data, action) => ({ id: action.id }),
    invalidateCaches: invalidateActionCaches,
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) => mapActionError(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
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
    (data) =>
      prisma.prospectingAction.create({
        data: { ...data, ...applyStatusRules(null, data, new Date()) },
      }),
  )
}

export async function updateProspectingAction(
  id: string,
  _prevState: ProspectingActionFormState,
  formData: FormData,
): Promise<ProspectingActionFormState> {
  await getCurrentUser()

  return saveProspectingAction(
    "updateProspectingAction",
    { success: "prospecting_action:updated", failure: "prospecting_action:update_failed" },
    formData,
    async (data) => {
      const current = await prisma.prospectingAction.findUniqueOrThrow({
        where: { id },
        select: TIMING_SELECT,
      })
      return prisma.prospectingAction.update({
        where: { id },
        data: { ...data, ...applyStatusRules(current, data, new Date()) },
      })
    },
  )
}

export async function changeProspectingActionStatus(
  id: string,
  status: string,
): Promise<ProspectingActionFormState> {
  await getCurrentUser()

  return createActionLogger("changeProspectingActionStatus", async ({ log }) => {
    const parsed = prospectingActionSchema.shape.status.safeParse(status)
    if (!parsed.success) {
      return { ok: false, errors: { status: ["Statut inconnu"] }, message: null }
    }

    try {
      const current = await prisma.prospectingAction.findUniqueOrThrow({
        where: { id },
        select: TIMING_SELECT,
      })

      const timing = applyStatusRules(
        current,
        { status: parsed.data, occurredAt: current.occurredAt, respondedAt: null },
        new Date(),
      )
      await prisma.prospectingAction.update({ where: { id }, data: timing })
      invalidateActionCaches()
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
  id: string,
  occurredAt: string,
): Promise<ProspectingActionFormState> {
  await getCurrentUser()

  return createActionLogger("rescheduleProspectingAction", async ({ log }) => {
    const parsed = prospectingActionSchema.shape.occurredAt.safeParse(occurredAt)
    if (!parsed.success) {
      return { ok: false, errors: { occurredAt: ["Date invalide"] }, message: null }
    }

    try {
      const { count } = await prisma.prospectingAction.updateMany({
        where: { id, status: "A_FAIRE" },
        data: { occurredAt: parsed.data },
      })
      if (count === 0) {
        const stillExists = await prisma.prospectingAction.findUnique({
          where: { id },
          select: { id: true },
        })
        // L'écran montrait une action périmée (passée à Fait ou supprimée ailleurs) : la revalidation le réaligne sur la base, sans quoi chaque nouvel essai échouerait.
        invalidateActionCaches()
        log.warn({ event: "prospecting_action:reschedule_refused", id })
        return {
          ok: false,
          errors: {
            occurredAt: [
              stillExists
                ? "Seule une action à faire se replanifie"
                : "Cette action a été supprimée",
            ],
          },
          message: null,
        }
      }
      invalidateActionCaches()
      log.info({ event: "prospecting_action:rescheduled", id })
      return { ok: true, errors: {}, message: null }
    } catch (err) {
      log.error({ err, event: "prospecting_action:reschedule_failed", id })
      return { ok: false, errors: {}, message: "unknown_error" }
    }
  })
}

export async function deleteProspectingAction(id: string): Promise<ProspectingActionFormState> {
  await getCurrentUser()

  return deleteEntity<ProspectingActionFormState>({
    actionName: "deleteProspectingAction",
    events: { success: "prospecting_action:deleted", failure: "prospecting_action:delete_failed" },
    successLogFields: { id },
    destroy: () => prisma.prospectingAction.delete({ where: { id } }),
    invalidateCaches: invalidateActionCaches,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: () => null,
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
