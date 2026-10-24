import { z } from "zod"

export const ContactFieldErrorCode = z.enum([
  "name_required",
  "name_too_long",
  "company_too_long",
  "email_invalid",
  "email_too_long",
  "subject_required",
  "subject_too_long",
  "message_too_short",
  "message_too_long",
])

export type ContactFieldErrorCode = z.infer<typeof ContactFieldErrorCode>

const code = ContactFieldErrorCode.enum

// Le message d'un `z.string(code)` couvre aussi le type invalide (champ absent ou fichier) : sans lui,
// Zod renverrait son message anglais par défaut, hors du jeu de codes traduits.
export const contactSchema = z.object({
  name: z.string(code.name_required).trim().min(1, code.name_required).max(120, code.name_too_long),
  company: z.string(code.company_too_long).trim().max(200, code.company_too_long).optional(),
  email: z
    .string(code.email_invalid)
    .trim()
    .pipe(z.email(code.email_invalid).max(200, code.email_too_long)),
  subject: z
    .string(code.subject_required)
    .trim()
    .min(1, code.subject_required)
    .max(200, code.subject_too_long),
  message: z
    .string(code.message_too_short)
    .trim()
    .min(20, code.message_too_short)
    .max(5000, code.message_too_long),
})

export type ContactInput = z.infer<typeof contactSchema>

export const ContactFieldErrors = z.partialRecord(
  z.enum(contactSchema.keyof().options),
  z.array(ContactFieldErrorCode),
)
