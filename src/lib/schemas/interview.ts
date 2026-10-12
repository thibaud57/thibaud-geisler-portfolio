import { z } from "zod"

import {
  ContactType,
  InterviewDecision,
  InterviewFormat,
  InterviewOutcome,
  InterviewSide,
  InterviewStatus,
  InterviewType,
} from "@/generated/prisma/browser"
import { nullableEnumField } from "@/lib/schemas/none-value"
import { optionalInt } from "@/lib/schemas/opportunity"
import { notesField, optionalTextField, personFields } from "@/lib/schemas/person"
import { instant } from "@/lib/schemas/prospecting-action"

export const INTERVIEW_SIDES = Object.values(InterviewSide)
export const INTERVIEW_TYPES = Object.values(InterviewType)
export const INTERVIEW_FORMATS = Object.values(InterviewFormat)
export const INTERVIEW_STATUSES = Object.values(InterviewStatus)
export const INTERVIEW_OUTCOMES = Object.values(InterviewOutcome)
export const INTERVIEW_DECISIONS = Object.values(InterviewDecision)

// Un correspondant inconnu du CRM : les mêmes champs qu'une personne, plus le type de contact choisi par l'utilisateur.
// Une clé absente vaut une chaîne vide : le correspondant voyage en JSON, pas en FormData, et n'envoie que les champs saisis.
const newCorrespondentSchema = z.object({
  name: personFields.name.prefault(""),
  jobRole: personFields.jobRole.prefault(""),
  zone: personFields.zone.prefault(""),
  email: personFields.email.prefault(""),
  phone: personFields.phone.prefault(""),
  linkedinUrl: personFields.linkedinUrl.prefault(""),
  metAt: personFields.metAt.prefault(""),
  notes: personFields.notes.prefault(""),
  details: personFields.details.prefault(""),
  companyId: personFields.companyId.prefault(""),
  contactType: z.enum(ContactType, { error: "Choisissez un type de contact" }),
})

export const interviewSchema = z
  .object({
    opportunityId: z.string().trim().min(1, "Choisissez une opportunité"),
    side: z.enum(InterviewSide, { error: "Choisissez qui mène l'entretien" }),
    // Un correspondant envoyé deux fois n'en fait qu'un.
    correspondentIds: z.array(z.string().trim().min(1)).transform((ids) => [...new Set(ids)]),
    // Encodés en JSON par le formulaire : un tableau d'objets ne se porte pas nativement en FormData.
    newCorrespondents: z
      .string()
      .transform((value, ctx) => {
        try {
          return value === "" ? [] : (JSON.parse(value) as unknown[])
        } catch {
          ctx.addIssue({ code: "custom", message: "Nouveaux correspondants invalides" })
          return z.NEVER
        }
      })
      .pipe(z.array(newCorrespondentSchema)),
    type: z.enum(InterviewType, { error: "Type inconnu" }),
    format: nullableEnumField(INTERVIEW_FORMATS, "Format inconnu"),
    status: z.enum(InterviewStatus, { error: "Statut inconnu" }),
    outcome: nullableEnumField(INTERVIEW_OUTCOMES, "Issue inconnue"),
    scheduledAt: instant.transform((value) => new Date(value)),
    score: optionalInt(0, 10, "Le score est un entier de 0 à 10"),
    decision: nullableEnumField(INTERVIEW_DECISIONS, "Décision inconnue"),
    notes: notesField,
    details: optionalTextField,
  })
  // L'issue ne se saisit que sur un entretien Fait, facultative même alors ; un changement de statut la vide.
  .transform((data) => ({ ...data, outcome: data.status === "FAIT" ? data.outcome : null }))

export type InterviewInput = z.infer<typeof interviewSchema>
