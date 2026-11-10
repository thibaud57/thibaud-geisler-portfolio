import "server-only"

import { matchesSearch, normalizeForSearch } from "@/lib/admin/search"
import { normalizeLinkedinProfileUrl } from "@/lib/crm/linkedin"
import { findPersonsWithRole } from "@/server/queries/persons"

import { joinHint, type SearchHit } from "./entity-definition"
import { personRef, rolesOf } from "./person-ref"

const OPTED_OUT_HIT_LABEL = "Opposée à la prospection"

// Une personne opposée ne se trouve que par son email ou son LinkedIn exacts : un fragment exposerait les identifiants de toutes.
export async function searchPersons<E extends "lead" | "contact">(
  entity: E,
  query: string,
): Promise<SearchHit<E>[]> {
  const needle = normalizeForSearch(query)
  const email = query.trim().toLowerCase()
  const linkedin = normalizeLinkedinProfileUrl(query)
  const persons = await findPersonsWithRole(entity)

  return persons.flatMap((person): SearchHit<E>[] => {
    const ref = personRef(person)
    if (ref.optedOut) {
      const identifier = [person.email, person.linkedinUrl].find(
        (candidate): candidate is string =>
          candidate !== null && (candidate === email || candidate === linkedin),
      )
      return identifier === undefined
        ? []
        : [{ entity, id: person.id, label: OPTED_OUT_HIT_LABEL, hint: identifier, optedOut: true }]
    }

    const matches =
      (linkedin !== null && person.linkedinUrl === linkedin) ||
      matchesSearch(needle, ref.name, person.email, person.linkedinUrl)
    if (!matches) return []

    const hint = joinHint(person.company?.name, rolesOf(person).join(" and "))
    return [{ entity, id: person.id, label: ref.name, hint }]
  })
}
