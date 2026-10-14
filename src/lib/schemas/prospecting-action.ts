import { z } from "zod"

import { ActionChannel, ActionStatus } from "@/generated/prisma/browser"
import { zonedDayStart } from "@/lib/date-time"
import { optionalTextField } from "@/lib/schemas/fields"

export const ACTION_CHANNELS = Object.values(ActionChannel)
export const ACTION_STATUSES = Object.values(ActionStatus)

// Instant avec décalage : sans lui, le serveur lirait la date en UTC, décalée d'une ou deux heures côté client.
export const instant = z.iso.datetime({ offset: true, error: "Date et heure requises" })

// Une action se date au jour, sans heure : le jour saisi est rangé à minuit, heure de Paris.
const actionDay = z.iso
  .date({ error: "Date requise" })
  .transform((value) => zonedDayStart(new Date(value)))

export const prospectingActionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "L'action est requise")
    .max(120, "L'action ne peut pas dépasser 120 caractères"),
  personId: z.string().trim().min(1, "Choisissez une personne"),
  channel: z.enum(ActionChannel, { error: "Type inconnu" }),
  status: z.enum(ActionStatus, { error: "Statut inconnu" }),
  occurredAt: actionDay,
  respondedAt: z.union([actionDay, z.literal("").transform(() => null)], {
    error: "Date de réponse invalide",
  }),
  message: optionalTextField,
  reply: optionalTextField,
})

export type ProspectingActionInput = z.infer<typeof prospectingActionSchema>
