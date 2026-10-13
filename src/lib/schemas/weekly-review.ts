import { z } from "zod"

import { ReviewMotivation, ReviewStatus } from "@/generated/prisma/browser"
import { nullableEnumField } from "@/lib/schemas/none-value"
import { notesField, optionalTextField } from "@/lib/schemas/person"
import { isFridayIso, isoDayToDate } from "@/lib/crm/weekly-reviews"

export const REVIEW_STATUSES = Object.values(ReviewStatus)
export const REVIEW_MOTIVATIONS = Object.values(ReviewMotivation)

const counter = z
  .string()
  .trim()
  .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) <= 999), {
    error: "Un entier de 0 à 999",
  })
  .transform((value) => (value === "" ? 0 : Number(value)))

export const weeklyReviewSchema = z.object({
  closingFriday: z.iso
    .date({ error: "Choisissez un vendredi" })
    .refine(isFridayIso, { error: "Choisissez un vendredi" })
    .transform(isoDayToDate),
  connectionsSent: counter,
  connectionsAccepted: counter,
  messagesSent: counter,
  conversationsEngaged: counter,
  meetingsBooked: counter,
  interviewsHeld: counter,
  activeLeads: counter,
  status: nullableEnumField(REVIEW_STATUSES, "Statut inconnu"),
  motivation: nullableEnumField(REVIEW_MOTIVATIONS, "Motivation inconnue"),
  wins: optionalTextField,
  blockers: optionalTextField,
  nextWeekPlan: optionalTextField,
  notes: notesField,
})

export type WeeklyReviewInput = z.infer<typeof weeklyReviewSchema>
