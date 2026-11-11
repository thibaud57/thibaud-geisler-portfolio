import "server-only"
import type { CallToolResult } from "@modelcontextprotocol/server"

import { assertNever } from "@/lib/assert-never"
import { zonedIsoDay } from "@/lib/date-time"
import {
  revalidatePersonLists,
  type ConflictField,
  type PersonConflict,
  type PersonRole,
} from "@/server/crm/person-guards"
import type { PersonWriteError } from "@/server/crm/person-write"
import type { DomainResult } from "@/server/result"
import type { WriteContext } from "@/server/mcp/entity-definition"
import { writeRecord, writeTexts, type WriteTexts } from "@/server/mcp/results"

import { detailsErrorMessage } from "./fields"
import { rolesOf } from "./person-ref"

const IDENTITY_TAKEN: Record<ConflictField, string> = {
  email: "This email is already held by another person.",
  linkedinUrl: "This LinkedIn URL is already held by another person.",
  personId: "This lead is already a contact.",
}

const FIND_EXISTING = "Call crm_search to find the existing record instead of creating a duplicate."

export function conflictMessage(conflict: PersonConflict): string {
  switch (conflict.reason) {
    case "exists": {
      const roles = rolesOf(conflict.roles)
      const who = [
        ...(conflict.personName === null ? [] : [conflict.personName]),
        ...(roles.length === 0 ? [] : [`(${roles.join(" and ")})`]),
      ].join(" ")
      return `This person already exists${who === "" ? "" : `: ${who}`}. ${FIND_EXISTING}`
    }
    case "opted_out":
      return `This person opted out of prospecting on ${zonedIsoDay(conflict.optedOutAt)}: do not recreate or contact them.`
    case "person_missing":
      return "No person has this id. Call crm_search with the entity lead to find the right id, then call the tool again."
    case "not_a_lead":
      return "This person is not a lead, so fromLeadId cannot promote them. Create the contact from its person fields instead."
    case "no_lead_role":
      return "This person has no lead record. Call crm_search with the entity lead to find a lead."
    default:
      return assertNever(conflict)
  }
}

function personWriteErrorMessage(error: PersonWriteError): string {
  switch (error.code) {
    case "person_conflict":
      return conflictMessage(error.conflict)
    case "identity_taken":
      return `${IDENTITY_TAKEN[error.field]} ${FIND_EXISTING}`
    case "person_locked":
      return "This person opted out of prospecting: their record is locked and cannot be modified."
    case "company_not_found":
      return "No company has this companyId. Call crm_search with the entity company to find the right id, then call the tool again."
    case "not_found":
      return "No record of this entity has this id (the person may hold only the other role). Call crm_search to find the right id and entity, then call the tool again."
    case "no_details":
    case "section_not_found":
      return detailsErrorMessage(error, "person")
    default:
      return assertNever(error)
  }
}

export function personWrites(role: PersonRole): { create: WriteTexts; update: WriteTexts } {
  return writeTexts(
    { prefix: "crm", key: role, noun: role, pronoun: "their" },
    "Call crm_search with their name or email to check whether the person was created before retrying.",
  )
}

export function writePerson(
  run: () => Promise<DomainResult<{ personId: string }, PersonWriteError>>,
  ctx: WriteContext,
  texts: WriteTexts,
  logContext: object,
): Promise<CallToolResult> {
  return writeRecord({
    run,
    ctx,
    texts,
    logContext,
    errorMessage: personWriteErrorMessage,
    invalidate: revalidatePersonLists,
    // L'identifiant seulement : ni nom ni email dans les logs
    logged: ({ personId }) => ({ personId }),
    rendered: ({ personId }) => ({ id: personId }),
  })
}
