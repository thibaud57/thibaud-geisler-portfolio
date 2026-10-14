import { z } from "zod"

import { LeadChannel, LeadInterest, LeadOrigin, LeadStatus } from "@/generated/prisma/browser"
import { optionalInt } from "@/lib/schemas/fields"
import { nullableEnumField } from "@/lib/schemas/none-value"
import { personFields } from "@/lib/schemas/person"

export const LEAD_ORIGINS = Object.values(LeadOrigin)
export const LEAD_STATUSES = Object.values(LeadStatus)
export const LEAD_INTERESTS = Object.values(LeadInterest)
export const LEAD_CHANNELS = Object.values(LeadChannel)

export const leadSchema = z.object({
  ...personFields,
  origin: z.enum(LeadOrigin, { error: "Choisissez une origine" }),
  status: z.enum(LeadStatus, { error: "Statut inconnu" }),
  interest: nullableEnumField(LEAD_INTERESTS, "Intérêt inconnu"),
  channel: nullableEnumField(LEAD_CHANNELS, "Canal inconnu"),
  score: optionalInt(0, 10, "Le score est un entier de 0 à 10"),
})

export type LeadInput = z.infer<typeof leadSchema>
