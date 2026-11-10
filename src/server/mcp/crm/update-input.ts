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

const EMPTY_PATCH_MESSAGE = {
  withDetails: "Provide at least one of fields or detailsSection.",
  fieldsOnly: "Provide fields.",
} as const

type UpdateShape = keyof typeof EMPTY_PATCH_MESSAGE

// Règles communes des `crm_update` : un patch vide ou une double écriture des Détails est refusé, jamais ignoré.
function updateInputIssues(
  value: { fields?: object; detailsSection?: unknown },
  shape: UpdateShape,
): UpdateIssue[] {
  const { fields, detailsSection } = value
  return [
    ...(fields === undefined && detailsSection === undefined
      ? [{ message: EMPTY_PATCH_MESSAGE[shape] }]
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
      for (const issue of updateInputIssues(value, "withDetails")) {
        ctx.addIssue({ code: "custom", ...issue })
      }
    })
}

// Une entité sans Détails n'a pas de `detailsSection` : le schéma strict le refuse au lieu de l'ignorer.
export function updateSchemaWithoutDetailsOf<
  TEntity extends z.ZodLiteral<string>,
  TId extends z.ZodType,
  TFields extends z.ZodType<object>,
>(entity: TEntity, id: TId, fields: TFields) {
  return z.strictObject({ entity, id, fields: fields.optional() }).superRefine((value, ctx) => {
    for (const issue of updateInputIssues(value, "fieldsOnly")) {
      ctx.addIssue({ code: "custom", ...issue })
    }
  })
}
