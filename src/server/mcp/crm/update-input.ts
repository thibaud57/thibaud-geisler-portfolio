import { z } from "zod"

export const detailsSectionSchema = z
  .strictObject({
    heading: z
      .string()
      .trim()
      .min(1)
      .describe(
        'Title of the existing section to fill, without the "#" (e.g. "Chiffres clés"). Case, accents and the leading emoji are ignored.',
      ),
    content: z
      .string()
      // replaceDetailsSection insère le contenu tel quel : un titre dedans scinderait la section
      .refine((content) => !/^# /m.test(content), {
        error:
          'content must be the section body only, without its heading: remove the line starting with "# ". The heading is given by detailsSection.heading.',
      })
      .describe(
        "New body of the section in markdown, without its heading line. Replaces the previous body.",
      ),
  })
  .describe(
    "Replace the body of one section of the Details, the other sections stay untouched. Do not combine with fields.details.",
  )

interface UpdateIssue {
  message: string
  path?: string[]
}

// Règles communes des `crm_update` : un patch vide ou une double écriture des Détails est refusé, jamais ignoré.
export function updateInputIssues(value: {
  fields?: object
  detailsSection?: unknown
}): UpdateIssue[] {
  const { fields, detailsSection } = value
  return [
    ...(fields === undefined && detailsSection === undefined
      ? [{ message: "Provide at least one of fields or detailsSection." }]
      : []),
    ...(fields !== undefined && Object.keys(fields).length === 0
      ? [
          {
            path: ["fields"],
            message: "fields is empty: name at least one field to change, or omit fields.",
          },
        ]
      : []),
    ...(fields !== undefined && "details" in fields && detailsSection
      ? [
          {
            path: ["fields", "details"],
            message:
              "fields.details and detailsSection both write the Details: send the whole text in fields.details, or one section in detailsSection, not both.",
          },
        ]
      : []),
  ]
}

// Le schéma d'entrée d'un `crm_update` : seuls l'entité, l'id et les champs propres à l'entité varient.
export function updateSchemaOf<
  TEntity extends z.ZodLiteral<string>,
  TId extends z.ZodType,
  TFields extends z.ZodType<object>,
>(entity: TEntity, id: TId, fields: TFields) {
  return z
    .strictObject({
      entity,
      id,
      fields: fields.optional(),
      detailsSection: detailsSectionSchema.optional(),
    })
    .superRefine((value, ctx) => {
      for (const issue of updateInputIssues(value)) ctx.addIssue({ code: "custom", ...issue })
    })
}
