import { assertNever } from "@/lib/assert-never"
import { replaceDetailsSection } from "@/lib/crm/details-sections"

import { fail, ok, type DomainResult } from "./result"

export interface DetailsSection {
  heading: string
  content: string
}

export type DetailsSectionError =
  { code: "no_details" } | { code: "section_not_found"; headings: string[] }

export function resolveDetailsSection(
  details: string | null,
  section: DetailsSection,
): DomainResult<string, DetailsSectionError> {
  const replaced = replaceDetailsSection(details, section.heading, section.content)
  if (replaced.ok) return ok(replaced.details)
  switch (replaced.code) {
    case "no_details":
      return fail({ code: "no_details" })
    case "section_not_found":
      return fail({ code: "section_not_found", headings: replaced.headings })
    default:
      return assertNever(replaced)
  }
}
