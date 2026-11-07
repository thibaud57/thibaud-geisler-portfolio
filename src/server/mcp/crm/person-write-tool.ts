import "server-only"
import type { CallToolResult } from "@modelcontextprotocol/server"

import { assertNever } from "@/lib/assert-never"
import {
  revalidatePersonLists,
  type ConflictField,
  type PersonConflict,
  type PersonRole,
} from "@/server/crm/person-guards"
import type { PersonWriteError } from "@/server/crm/person-write"
import type { DomainResult } from "@/server/crm/result"

import type { CrmWriteContext } from "./entity-definition"
import { guardTool, toolError, toolJson, type WriteTexts } from "./results"

const IDENTITY_TAKEN: Record<ConflictField, string> = {
  email: "This email is already held by another person.",
  linkedinUrl: "This LinkedIn URL is already held by another person.",
  personId: "This lead is already a contact.",
}

const FIND_EXISTING = "Call crm_search to find the existing record instead of creating a duplicate."

function conflictMessage(conflict: PersonConflict): string {
  switch (conflict.reason) {
    case "exists": {
      const roles = (["lead", "contact"] as const).filter((role) => conflict.roles[role])
      const who = [
        ...(conflict.personName === null ? [] : [conflict.personName]),
        ...(roles.length === 0 ? [] : [`(${roles.join(" and ")})`]),
      ].join(" ")
      return `This person already exists${who === "" ? "" : `: ${who}`}. ${FIND_EXISTING}`
    }
    case "opted_out":
      return `This person opted out of prospecting on ${conflict.optedOutAt.toISOString().slice(0, 10)}: do not recreate or contact her.`
    case "person_missing":
      return "No person has this id. Call crm_search with the entity lead to find the right id, then call the tool again."
    case "not_a_lead":
      return "This person is not a lead, so fromLeadId cannot promote her. Create the contact from its person fields instead."
    case "no_lead_role":
      return "This person has no lead record. Call crm_search with the entity lead to find a lead."
    default:
      return assertNever(conflict)
  }
}

// Chaque code devient un message qui nomme la correction : l'agent corrige l'appel sans deviner.
export function personWriteErrorMessage(error: PersonWriteError): string {
  switch (error.code) {
    case "person_conflict":
      return conflictMessage(error.conflict)
    case "identity_taken":
      return `${IDENTITY_TAKEN[error.field]} ${FIND_EXISTING}`
    case "person_locked":
      return "This person opted out of prospecting: her record is locked and cannot be modified."
    case "company_not_found":
      return "No company has this companyId. Call crm_search with the entity company to find the right id, then call the tool again."
    case "not_found":
      return "No record of this entity has this id (the person may hold only the other role). Call crm_search to find the right id and entity, then call the tool again."
    case "no_details":
      return "This person has no Details text, so no section can be replaced. Write the whole text with fields.details instead."
    case "section_not_found":
      return `No section of the Details matches detailsSection.heading. Sections present: ${error.headings.join(", ")}. Use one of these titles.`
    default:
      return assertNever(error)
  }
}

// Un create n'a pas d'id à relire : le nom ou l'email dit si la personne existe déjà avant de réessayer.
export function personWrites(role: PersonRole): { create: WriteTexts; update: WriteTexts } {
  const unsaved = `The ${role} could not be saved because of an internal error.`
  return {
    create: {
      events: { success: `${role}:created`, failure: `${role}:create_failed` },
      failureMessage: `${unsaved} Call crm_search with her name or email to check whether she was created before retrying.`,
    },
    update: {
      events: { success: `${role}:updated`, failure: `${role}:update_failed` },
      failureMessage: `${unsaved} Call crm_fetch to check her current state before retrying.`,
    },
  }
}

export function writePerson(
  run: () => Promise<DomainResult<{ personId: string }, PersonWriteError>>,
  ctx: CrmWriteContext,
  { events, failureMessage }: WriteTexts,
  logContext: object,
): Promise<CallToolResult> {
  return guardTool(
    ctx.log,
    { event: events.failure, message: failureMessage, context: logContext },
    run,
    (result) => {
      if (!result.ok) return toolError(personWriteErrorMessage(result.error))

      revalidatePersonLists()
      // L'identifiant seulement : ni nom ni email dans les logs
      ctx.log.info({ event: events.success, personId: result.value.personId })
      return toolJson({ id: result.value.personId })
    },
  )
}
