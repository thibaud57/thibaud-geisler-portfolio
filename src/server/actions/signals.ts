"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import type { Prisma, SignalType } from "@/generated/prisma/client"
import { ADMIN_COMPANIES_PATH, ADMIN_LEADS_PATH } from "@/lib/admin/routes"
import { assertNever } from "@/lib/assert-never"
import { getCurrentUser } from "@/lib/get-current-user"
import { companyIdSchema, personIdSchema, type PersonId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { signalSchema, type SignalInput } from "@/lib/schemas/signal"
import { isPrismaError, stringField, violatedConstraint } from "@/lib/server-utils"
import { canReceiveSignal, signalTypesFor, type SignalOwnerKind } from "@/lib/crm/signals"

import {
  deleteEntity,
  formStateHandlers,
  rowExists,
  saveEntity,
  type ActionEvents,
} from "./_support/shared"
import type { SignalDeleteState, SignalFormState } from "./signals.types"

const TYPE_MISMATCH = "Ce type ne concerne pas cette fiche"

class SignalRefusedError extends Error {
  constructor(readonly reason: "type_mismatch" | "lead_not_eligible" | "signal_not_found") {
    super(reason)
  }
}

function collectValues(formData: FormData): SignalFormState["values"] {
  return {
    type: stringField(formData, "type"),
    occurredOn: stringField(formData, "occurredOn"),
    content: stringField(formData, "content"),
    sourceUrl: stringField(formData, "sourceUrl"),
  }
}

function invalidateSignalCaches(): void {
  revalidatePath(ADMIN_COMPANIES_PATH, "layout")
  revalidatePath(ADMIN_LEADS_PATH, "layout")
}

function assertTypeFits(kind: SignalOwnerKind, type: SignalType): void {
  if (!signalTypesFor(kind).includes(type)) throw new SignalRefusedError("type_mismatch")
}

// Seul un lead outbound reçoit un signal, jamais une personne opposée. Lu sur le client de la
// transaction qui crée le signal : une opposition posée entre la lecture et l'écriture ne peut
// plus laisser passer un signal.
async function assertLeadAccepts(tx: Prisma.TransactionClient, personId: PersonId): Promise<void> {
  const lead = await tx.lead.findUnique({
    where: { personId },
    select: { origin: true, person: { select: { optedOutAt: true } } },
  })
  if (!lead || !canReceiveSignal({ origin: lead.origin, optedOutAt: lead.person.optedOutAt })) {
    throw new SignalRefusedError("lead_not_eligible")
  }
}

function mapSignalError(err: unknown, values: SignalFormState["values"]): SignalFormState | null {
  if (err instanceof SignalRefusedError) {
    switch (err.reason) {
      case "type_mismatch":
        return { ok: false, errors: { type: [TYPE_MISMATCH] }, message: null, values }
      case "signal_not_found":
        invalidateSignalCaches()
        return signalGone(values)
      case "lead_not_eligible":
        return { ok: false, errors: {}, message: "lead_not_eligible", values }
      default:
        return assertNever(err.reason)
    }
  }
  if (isPrismaError(err, "P2003") && violatedConstraint(err)?.includes("companyId")) {
    invalidateSignalCaches()
    return { ok: false, errors: {}, message: "company_not_found", values }
  }
  return null
}

function signalGone(values: SignalFormState["values"]): SignalFormState {
  return { ok: false, errors: {}, message: "signal_not_found", values }
}

const signalExists = (id: string) => rowExists(prisma.signal, { id })

function saveSignal(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (data: SignalInput) => Promise<{ id: string }>,
  updatedId?: string,
): Promise<SignalFormState> {
  const values = collectValues(formData)

  return saveEntity<SignalInput, SignalFormState, { id: string }>({
    actionName,
    events,
    schema: signalSchema,
    input: values,
    persist,
    successLogFields: (_data, signal) => ({ id: signal.id }),
    invalidateCaches: invalidateSignalCaches,
    mapError: (err) => mapSignalError(err, values),
    ...formStateHandlers(values, {
      message: "signal_not_found",
      updatedId,
      exists: signalExists,
    }),
  })
}

export async function createCompanySignal(
  rawCompanyId: string,
  _prevState: SignalFormState,
  formData: FormData,
): Promise<SignalFormState> {
  // Défense en profondeur, hors du try : une Server Action exportée est joignable sans passer par la page.
  await getCurrentUser()

  const parsedId = companyIdSchema.safeParse(rawCompanyId)
  if (!parsedId.success) {
    return { ok: false, errors: {}, message: "company_not_found", values: collectValues(formData) }
  }
  const companyId = parsedId.data

  return saveSignal(
    "createCompanySignal",
    { success: "signal:created", failure: "signal:create_failed" },
    formData,
    (data) => {
      assertTypeFits("company", data.type)
      return prisma.signal.create({ data: { ...data, companyId } })
    },
  )
}

export async function createPersonSignal(
  rawPersonId: string,
  _prevState: SignalFormState,
  formData: FormData,
): Promise<SignalFormState> {
  await getCurrentUser()

  const parsedId = personIdSchema.safeParse(rawPersonId)
  if (!parsedId.success) {
    return { ok: false, errors: {}, message: "lead_not_eligible", values: collectValues(formData) }
  }
  const personId = parsedId.data

  return saveSignal(
    "createPersonSignal",
    { success: "signal:created", failure: "signal:create_failed" },
    formData,
    (data) =>
      prisma.$transaction(async (tx) => {
        assertTypeFits("lead", data.type)
        await assertLeadAccepts(tx, personId)
        return tx.signal.create({ data: { ...data, personId } })
      }),
  )
}

export async function updateSignal(
  id: string,
  _prevState: SignalFormState,
  formData: FormData,
): Promise<SignalFormState> {
  await getCurrentUser()

  return saveSignal(
    "updateSignal",
    { success: "signal:updated", failure: "signal:update_failed" },
    formData,
    async (data) => {
      // Le rattachement ne change jamais : il se relit pour valider le type. Un signal déjà posé reste modifiable
      // après le passage du lead en inbound ; l'opposition supprime les signaux de la personne.
      const current = await prisma.signal.findUnique({
        where: { id },
        select: { companyId: true, personId: true },
      })
      if (!current) throw new SignalRefusedError("signal_not_found")
      assertTypeFits(current.companyId ? "company" : "lead", data.type)
      return prisma.signal.update({ where: { id }, data })
    },
    id,
  )
}

export async function deleteSignal(id: string): Promise<SignalDeleteState> {
  await getCurrentUser()

  return deleteEntity<SignalDeleteState>({
    actionName: "deleteSignal",
    events: { success: "signal:deleted", failure: "signal:delete_failed" },
    successLogFields: { id },
    exists: () => signalExists(id),
    destroy: () => prisma.signal.delete({ where: { id } }),
    invalidateCaches: invalidateSignalCaches,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
