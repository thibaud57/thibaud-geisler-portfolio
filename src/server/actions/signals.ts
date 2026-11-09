"use server"

import "server-only"

import { assertNever } from "@/lib/assert-never"
import { getCurrentUser } from "@/lib/get-current-user"
import { companyIdSchema, personIdSchema, signalIdSchema } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { signalSchema, type SignalInput } from "@/lib/schemas/signal"
import { rowExists, stringField } from "@/lib/server-utils"
import type { DomainResult } from "@/server/crm/result"
import {
  createSignal,
  revalidateSignalLists,
  updateSignal as updateSignalRecord,
  type SignalWriteError,
  type WrittenSignal,
} from "@/server/crm/signals"

import {
  deleteEntity,
  domainFailure,
  type DomainFailure,
  failureState,
  formStateHandlers,
  saveEntity,
  type ActionEvents,
} from "./_support/shared"
import type { SignalDeleteState, SignalFormMessage, SignalFormState } from "./signals.types"

const TYPE_MISMATCH = "Ce type ne concerne pas cette fiche"

function collectValues(formData: FormData): SignalFormState["values"] {
  return {
    type: stringField(formData, "type"),
    occurredOn: stringField(formData, "occurredOn"),
    content: stringField(formData, "content"),
    sourceUrl: stringField(formData, "sourceUrl"),
  }
}

const failure = domainFailure<SignalInput, SignalFormMessage>

function mapDomainError(
  error: SignalWriteError,
  values: SignalFormState["values"],
): DomainFailure<SignalFormState> {
  switch (error.code) {
    case "type_mismatch":
      return failure(values, { type: [TYPE_MISMATCH] }, null)
    case "lead_not_eligible":
      return failure(values, {}, "lead_not_eligible")
    case "company_not_found":
      return failure(values, {}, "company_not_found", true)
    case "not_found":
      return failure(values, {}, "signal_not_found", true)
    default:
      return assertNever(error)
  }
}

const signalExists = (id: string) => rowExists(prisma.signal, { id })

function saveSignal(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (data: SignalInput) => Promise<DomainResult<WrittenSignal, SignalWriteError>>,
): Promise<SignalFormState> {
  const values = collectValues(formData)

  return saveEntity<SignalInput, SignalFormState, WrittenSignal, SignalWriteError>({
    actionName,
    events,
    schema: signalSchema,
    input: values,
    persist,
    successLogFields: (_data, signal) => ({ id: signal.id }),
    invalidateCaches: revalidateSignalLists,
    onDomainError: (error) => mapDomainError(error, values),
    ...formStateHandlers(values),
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
    return failureState(
      mapDomainError({ code: "company_not_found" }, collectValues(formData)),
      revalidateSignalLists,
    )
  }
  const companyId = parsedId.data

  return saveSignal(
    "createCompanySignal",
    { success: "signal:created", failure: "signal:create_failed" },
    formData,
    (data) => createSignal({ companyId }, data),
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
    return failureState(
      mapDomainError({ code: "lead_not_eligible" }, collectValues(formData)),
      revalidateSignalLists,
    )
  }
  const personId = parsedId.data

  return saveSignal(
    "createPersonSignal",
    { success: "signal:created", failure: "signal:create_failed" },
    formData,
    (data) => createSignal({ personId }, data),
  )
}

export async function updateSignal(
  rawId: string,
  _prevState: SignalFormState,
  formData: FormData,
): Promise<SignalFormState> {
  await getCurrentUser()

  const parsedId = signalIdSchema.safeParse(rawId)
  if (!parsedId.success) {
    return failureState(
      mapDomainError({ code: "not_found" }, collectValues(formData)),
      revalidateSignalLists,
    )
  }
  const id = parsedId.data

  return saveSignal(
    "updateSignal",
    { success: "signal:updated", failure: "signal:update_failed" },
    formData,
    (data) => updateSignalRecord(id, data),
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
    invalidateCaches: revalidateSignalLists,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
