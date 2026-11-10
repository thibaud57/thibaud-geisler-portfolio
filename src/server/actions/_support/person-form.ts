import { assertNever } from "@/lib/assert-never"
import { formatShortInstantDate } from "@/lib/date-time"
import { PERSON_NOT_FOUND_TOAST } from "@/lib/admin/toasts"
import type { FormFailure, FormValues } from "@/lib/form-state"
import { stringField } from "@/lib/server-utils"
import type { ConflictField, PersonConflict, PersonRole } from "@/server/crm/person-guards"
import type { PersonFieldsError } from "@/server/crm/person-write"

import { domainFailure, MISSING_COMPANY, type DomainFailure } from "./shared"

export function collectPersonValues(formData: FormData) {
  return {
    name: stringField(formData, "name"),
    jobRole: stringField(formData, "jobRole"),
    zone: stringField(formData, "zone"),
    companyId: stringField(formData, "companyId"),
    email: stringField(formData, "email"),
    phone: stringField(formData, "phone"),
    linkedinUrl: stringField(formData, "linkedinUrl"),
    metAt: stringField(formData, "metAt"),
    notes: stringField(formData, "notes"),
    details: stringField(formData, "details"),
  }
}

export interface DuplicateWording {
  role: PersonRole
  own: string
  other: string
  otherHint?: string
}

export const LEAD_WORDING: DuplicateWording = {
  role: "lead",
  own: "Ce lead existe déjà",
  other: "Cette personne est déjà un contact",
}

export const CONTACT_WORDING: DuplicateWording = {
  role: "contact",
  own: "Ce contact existe déjà",
  other: "Cette personne est déjà un lead",
}

// Seule la création propose « Depuis un lead » : en édition, la personne est déjà choisie.
export const CONTACT_CREATE_WORDING: DuplicateWording = {
  ...CONTACT_WORDING,
  otherHint: ", choisissez-la « Depuis un lead »",
}

export const CORRESPONDENT_WORDING: DuplicateWording = {
  ...CONTACT_WORDING,
  otherHint: ", choisissez-la parmi les correspondants existants",
}

const PERSON_EXISTS = "Cette personne existe déjà"

function existsMessage(
  conflict: Extract<PersonConflict, { reason: "exists" }>,
  wording: DuplicateWording | undefined,
): string {
  const name = conflict.personName ?? ""
  const generic = `${PERSON_EXISTS} : ${name}`
  if (wording === undefined) return generic
  if (conflict.roles[wording.role]) return `${wording.own} : ${name}`
  const otherRole: PersonRole = wording.role === "lead" ? "contact" : "lead"
  if (conflict.roles[otherRole]) return `${wording.other} : ${name}${wording.otherHint ?? ""}`
  return generic
}

export function personConflictMessage(
  conflict: PersonConflict,
  wording?: DuplicateWording,
): string {
  switch (conflict.reason) {
    case "exists":
      return existsMessage(conflict, wording)
    case "opted_out":
      return `Cette personne s'est opposée à la prospection le ${formatShortInstantDate(conflict.optedOutAt)}`
    case "person_missing":
      return PERSON_NOT_FOUND_TOAST
    case "not_a_lead":
      return "Cette personne n'est pas un lead"
    case "no_lead_role":
      return "Cette personne n'a pas de fiche lead"
    default:
      return assertNever(conflict)
  }
}

export function conflictErrors(
  conflict: PersonConflict,
  wording?: DuplicateWording,
): Partial<Record<ConflictField, string[]>> {
  return { [conflict.field]: [personConflictMessage(conflict, wording)] }
}

export interface PersonFailureMessages<TMessage extends string> {
  conflict: Record<PersonConflict["reason"], TMessage>
  locked: TMessage
  notFound: TMessage
}

// Un doublon d'identité rend le message de l'existant du rôle : `conflict.exists`.
export function mapPersonFieldsError<TInput, TMessage extends string>(
  error: PersonFieldsError,
  values: FormValues<TInput> | undefined,
  messages: PersonFailureMessages<TMessage>,
  wording: DuplicateWording,
): DomainFailure<FormFailure<TInput, TMessage | "company_not_found", ConflictField | "companyId">> {
  const failure = (
    errors: Partial<Record<ConflictField | "companyId", string[]>>,
    message: TMessage | "company_not_found",
    invalidate = false,
  ) =>
    domainFailure<TInput, TMessage | "company_not_found", ConflictField | "companyId">(
      values,
      errors,
      message,
      invalidate,
    )

  switch (error.code) {
    case "person_conflict":
      return failure(
        conflictErrors(error.conflict, wording),
        messages.conflict[error.conflict.reason],
      )
    case "identity_taken":
      return failure({ [error.field]: [PERSON_EXISTS] }, messages.conflict.exists)
    case "person_locked":
      return failure({}, messages.locked)
    case "company_not_found":
      return failure({ companyId: [MISSING_COMPANY.text] }, MISSING_COMPANY.code)
    case "not_found":
      return failure({}, messages.notFound, true)
    default:
      return assertNever(error)
  }
}
