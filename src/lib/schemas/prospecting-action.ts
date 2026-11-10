import { z } from "zod"

import { ActionChannel, ActionStatus } from "@/generated/prisma/browser"
import { zonedDayStart } from "@/lib/date-time"
import { personIdField } from "@/lib/ids"
import { optionalTextField } from "@/lib/schemas/fields"

export const ACTION_CHANNELS = Object.values(ActionChannel)
export const ACTION_STATUSES = Object.values(ActionStatus)

// Instant avec décalage : sans lui, le serveur lirait la date en UTC, décalée d'une ou deux heures côté client.
export const instantOf = (error: string) => z.iso.datetime({ offset: true, error })

export const instant = instantOf("Date et heure requises")

export const ACTION_TITLE_MAX_LENGTH = 120

// Une action se date au jour, sans heure : le jour saisi est rangé à minuit, heure de Paris.
const actionDay = z.iso.date({ error: "Date requise" })

export const actionDayStart = (day: string): Date => zonedDayStart(new Date(day))

export const prospectingActionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "L'action est requise")
    .max(
      ACTION_TITLE_MAX_LENGTH,
      `L'action ne peut pas dépasser ${ACTION_TITLE_MAX_LENGTH} caractères`,
    ),
  personId: personIdField("Choisissez une personne"),
  channel: z.enum(ActionChannel, { error: "Type inconnu" }),
  status: z.enum(ActionStatus, { error: "Statut inconnu" }),
  occurredAt: actionDay.transform(actionDayStart),
  respondedAt: z.union([actionDay.transform(actionDayStart), z.literal("").transform(() => null)], {
    error: "Date de réponse invalide",
  }),
  message: optionalTextField,
  reply: optionalTextField,
})

export type ProspectingActionInput = z.infer<typeof prospectingActionSchema>
