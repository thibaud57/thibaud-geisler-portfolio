import { z } from "zod"

import { JobRole, Zone } from "@/generated/prisma/browser"
import type { Prisma } from "@/generated/prisma/client"
import { normalizeLinkedinProfileUrl } from "@/lib/crm/linkedin"
import { companyIdSchema } from "@/lib/ids"
import { PERSON_NAME_MAX_LENGTH } from "@/lib/schemas/person"
import type { DetailsSection } from "@/server/crm/details-section"

import { details, notes } from "./fields"

// Les `.describe()` arrivent au modèle. `null` efface un champ facultatif, un champ absent d'un patch reste inchangé.
// Mêmes bornes et normalisations que l'admin (`src/lib/schemas/person.ts`), écrites pour des types JSON et non du FormData.
export const personFieldShape = {
  name: z
    .string()
    .trim()
    .min(1)
    .max(PERSON_NAME_MAX_LENGTH)
    .describe(`Full name, at most ${PERSON_NAME_MAX_LENGTH} characters.`),
  jobRole: z.enum(JobRole).nullable().describe("Job role of the person. null clears it."),
  zone: z.enum(Zone).nullable().describe("Geographic zone of the person. null clears it."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(z.regexes.email, "Invalid email address.")
    .nullable()
    .describe("Email address, trimmed and lowercased like in the admin. null clears it."),
  phone: z
    .string()
    .trim()
    .min(1, "Pass null to clear the phone.")
    .nullable()
    .describe("Phone number. null clears it."),
  linkedinUrl: z
    .string()
    .trim()
    // check plutôt que transform : le schéma reste représentable en JSON Schema et idempotent
    .check((payload) => {
      const normalized = normalizeLinkedinProfileUrl(payload.value)
      if (normalized === null) {
        payload.issues.push({
          code: "custom",
          input: payload.value,
          message: "Expected a LinkedIn profile URL (linkedin.com/in/<handle>).",
        })
        return
      }
      payload.value = normalized
    })
    .nullable()
    .describe(
      "LinkedIn profile URL (linkedin.com/in/<handle>), stored in its normalized form. null clears it.",
    ),
  metAt: z.iso.date().nullable().describe("Date of the first meeting, YYYY-MM-DD. null clears it."),
  notes: notes(),
  details,
  companyId: companyIdSchema
    .nullable()
    .describe("Id of the company of the person. Get it from crm_search. null clears it."),
} as const

// Les champs d'une personne à la création, sauf `details` dont le gabarit dépend du rôle : seul le nom est requis.
export const newPersonShape = {
  name: personFieldShape.name,
  jobRole: personFieldShape.jobRole.default(null),
  zone: personFieldShape.zone.default(null),
  email: personFieldShape.email.default(null),
  phone: personFieldShape.phone.default(null),
  linkedinUrl: personFieldShape.linkedinUrl.default(null),
  metAt: personFieldShape.metAt.default(null),
  notes: personFieldShape.notes.default(null),
  companyId: personFieldShape.companyId.default(null),
} as const

// `metAt` se lit comme du texte dans l'outil et se stocke comme une date.
export const metAtDate = (metAt: string | null): Date | null =>
  metAt === null ? null : new Date(`${metAt}T00:00:00Z`)

export function withMetAtDate<T extends { metAt?: string | null }>(
  fields: T,
): Omit<T, "metAt"> & { metAt?: Date | null } {
  const { metAt, ...rest } = fields
  return metAt === undefined ? rest : { ...rest, metAt: metAtDate(metAt) }
}

export function toPersonPatch<TFields extends { metAt?: string | null }>(
  fields: TFields,
  detailsSection: DetailsSection | undefined,
): Omit<TFields, "metAt"> & { metAt?: Date | null; detailsSection: DetailsSection | undefined } {
  return { ...withMetAtDate(fields), detailsSection }
}

export const personFilterShape = (plural: "leads" | "contacts") =>
  ({
    companyId: companyIdSchema.optional().describe(`Only the ${plural} of this company.`),
    jobRole: z.enum(JobRole).optional().describe("Only this job role."),
    zone: z.enum(Zone).optional().describe("Only this zone."),
  }) as const

export function personFilterWhere(
  filters: { companyId?: string; jobRole?: JobRole; zone?: Zone } | undefined,
): Prisma.PersonWhereInput {
  return { companyId: filters?.companyId, jobRole: filters?.jobRole, zone: filters?.zone }
}
