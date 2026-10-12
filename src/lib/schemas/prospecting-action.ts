import { z } from "zod"

import { ActionChannel, ActionStatus } from "@/generated/prisma/browser"
import { optionalTextField } from "@/lib/schemas/person"

export const ACTION_CHANNELS = Object.values(ActionChannel)
export const ACTION_STATUSES = Object.values(ActionStatus)

// Instant avec décalage : sans lui, le serveur lirait la date en UTC, décalée d'une ou deux heures côté client.
export const instant = z.iso.datetime({ offset: true, error: "Date et heure requises" })

export const prospectingActionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "L'action est requise")
    .max(120, "L'action ne peut pas dépasser 120 caractères"),
  personId: z.string().trim().min(1, "Choisissez une personne"),
  channel: z.enum(ActionChannel, { error: "Type inconnu" }),
  status: z.enum(ActionStatus, { error: "Statut inconnu" }),
  occurredAt: instant.transform((value) => new Date(value)),
  respondedAt: z
    .union([instant, z.literal("")], { error: "Date de réponse invalide" })
    .transform((value) => (value === "" ? null : new Date(value))),
  message: optionalTextField,
})

export type ProspectingActionInput = z.infer<typeof prospectingActionSchema>
