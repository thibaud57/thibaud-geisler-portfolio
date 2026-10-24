import { z } from "zod"

import { ContractStatus, OpportunityStatus, WorkMode } from "@/generated/prisma/browser"
import { companyIdSchema, personIdSchema } from "@/lib/ids"
import {
  emptyToNull,
  NONE_VALUE,
  nullableEnumField,
  nullifyNoneValue,
} from "@/lib/schemas/none-value"
import { notesField, optionalInt, optionalTextField } from "@/lib/schemas/fields"
import { ZONES } from "@/lib/crm/zones"

export const OPPORTUNITY_STATUSES = Object.values(OpportunityStatus)

const POSTGRES_INT_MAX = 2147483647

const optionalId = <TSchema extends z.ZodType<string, string>>(idSchema: TSchema) =>
  z
    .string()
    .trim()
    .transform((value) => nullifyNoneValue(value, NONE_VALUE))
    .pipe(idSchema.nullable())

export const DAYS_PER_WEEK = ["1", "2", "3", "4", "5"] as const
export const ON_SITE_DAYS = ["0", "1", "2", "3", "4", "5"] as const

function optionalDays(values: readonly string[], message: string) {
  return nullableEnumField(values, message).transform((value) =>
    value === null ? null : Number(value),
  )
}

// Minuit UTC : un fuseau à l'ouest de Greenwich décalerait sinon la colonne date au mois précédent.
const startMonthField = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(value), {
    error: "Mois de démarrage invalide",
  })
  .transform((value) => (value === "" ? null : new Date(`${value}-01T00:00:00.000Z`)))

export const opportunitySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "L'intitulé est requis")
      .max(120, "L'intitulé ne peut pas dépasser 120 caractères"),
    role: z.string().trim().max(80, "Le rôle tient en 80 caractères").transform(emptyToNull),
    status: z.enum(OpportunityStatus, { error: "Statut inconnu" }),
    referrerId: optionalId(personIdSchema),
    intermediaryId: optionalId(companyIdSchema),
    clientId: optionalId(companyIdSchema),
    dailyRate: optionalInt(1, POSTGRES_INT_MAX, "Le TJM est un entier positif"),
    contract: nullableEnumField(Object.values(ContractStatus), "Contrat inconnu"),
    workMode: nullableEnumField(Object.values(WorkMode), "Mode de travail inconnu"),
    daysPerWeek: optionalDays(DAYS_PER_WEEK, "Entre 1 et 5 jours par semaine"),
    onSiteDays: optionalDays(ON_SITE_DAYS, "Entre 0 et 5 jours sur site"),
    zone: nullableEnumField(ZONES, "Localité inconnue"),
    startMonth: startMonthField,
    durationMonths: optionalInt(1, 60, "Une durée de 1 à 60 mois"),
    notes: notesField,
    details: optionalTextField,
  })
  .superRefine((data, ctx) => {
    if (data.clientId !== null && data.clientId === data.intermediaryId) {
      ctx.addIssue({
        code: "custom",
        path: ["clientId"],
        message: "Le client final ne peut pas être l'ESN",
      })
    }
    if (
      data.onSiteDays !== null &&
      data.daysPerWeek !== null &&
      data.onSiteDays > data.daysPerWeek
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["onSiteDays"],
        message: "Pas plus de jours sur site que de jours travaillés",
      })
    }
  })

export type OpportunityInput = z.infer<typeof opportunitySchema>
