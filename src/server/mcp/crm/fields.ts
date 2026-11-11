import { z } from "zod"

import { assertNever } from "@/lib/assert-never"
import { NOTES_MAX_LENGTH } from "@/lib/schemas/fields"
import type { DetailsSectionError } from "@/server/crm/details-section"

// Champs communs aux outils CRM. Les `.describe()` arrivent au modèle : `null` efface un champ facultatif, un champ absent d'un patch reste inchangé.
export const optionalText = (description: string) =>
  z
    .string()
    .trim()
    .min(1, "Pass null to clear this field.")
    .nullable()
    .describe(`${description} null clears it.`)

// Le message et le pronom varient : une personne, un entretien ou une opportunité parlent « des notes », une revue « du champ ».
export const notes = (clearMessage = "Pass null to clear the notes.", pronoun = "them") =>
  z
    .string()
    .trim()
    .min(1, clearMessage)
    .max(NOTES_MAX_LENGTH)
    .nullable()
    .describe(`One-line markers, at most ${NOTES_MAX_LENGTH} characters. null clears ${pronoun}.`)

export const details = z
  .string()
  .trim()
  .min(1, "Pass null to clear the details.")
  .nullable()
  .describe(
    'Whole Details text in markdown, sections introduced by "# " headings. To change one section only, use detailsSection instead. null clears it.',
  )

export function detailsErrorMessage(error: DetailsSectionError, noun: string): string {
  switch (error.code) {
    case "no_details":
      return `This ${noun} has no Details text, so no section can be replaced. Write the whole text with fields.details instead.`
    case "section_not_found":
      return `No section of the Details matches detailsSection.heading. Sections present: ${error.headings.join(", ")}. Use one of these titles.`
    default:
      return assertNever(error)
  }
}
