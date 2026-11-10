import { z } from "zod"

import { ReviewMotivation, ReviewStatus } from "@/generated/prisma/browser"
import { nullableEnumField } from "@/lib/schemas/none-value"
import { notesField, optionalTextField } from "@/lib/schemas/fields"
import { isFridayIso } from "@/lib/crm/weekly-reviews"
import { isoDayToDate } from "@/lib/date-time"

export const REVIEW_STATUSES = Object.values(ReviewStatus)
export const REVIEW_MOTIVATIONS = Object.values(ReviewMotivation)

const counter = z
  .string()
  .trim()
  .refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) <= 999), {
    error: "Un entier de 0 à 999",
  })
  .transform((value) => (value === "" ? 0 : Number(value)))

// `abort` : sans lui, `isFridayIso` lirait aussi un jour mal formé, que `isoDayToDate` refuse en levant.
export const closingFridayField = z.iso
  .date({ error: "Choisissez un vendredi", abort: true })
  .refine(isFridayIso, { error: "Choisissez un vendredi" })
  .transform(isoDayToDate)

export const weeklyReviewSchema = z.object({
  closingFriday: closingFridayField,
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
