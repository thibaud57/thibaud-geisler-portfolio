import { z } from "zod"

// Le message ne sert qu'aux champs de formulaire, dont l'erreur s'affiche telle quelle ;
// ailleurs le schéma nu suffit.
const nonEmptyId = (message?: string) => z.string().trim().min(1, message)

export const personIdField = (message?: string) => nonEmptyId(message).brand<"PersonId">()
export const companyIdField = (message?: string) => nonEmptyId(message).brand<"CompanyId">()
export const opportunityIdField = (message?: string) => nonEmptyId(message).brand<"OpportunityId">()
const prospectingActionIdField = (message?: string) =>
  nonEmptyId(message).brand<"ProspectingActionId">()
const interviewIdField = (message?: string) => nonEmptyId(message).brand<"InterviewId">()
const signalIdField = (message?: string) => nonEmptyId(message).brand<"SignalId">()
const weeklyReviewIdField = (message?: string) => nonEmptyId(message).brand<"WeeklyReviewId">()

export const personIdSchema = personIdField()
export const companyIdSchema = companyIdField()
export const opportunityIdSchema = opportunityIdField()
export const prospectingActionIdSchema = prospectingActionIdField()
export const interviewIdSchema = interviewIdField()
export const signalIdSchema = signalIdField()
export const weeklyReviewIdSchema = weeklyReviewIdField()

export type PersonId = z.infer<typeof personIdSchema>
export type CompanyId = z.infer<typeof companyIdSchema>
export type OpportunityId = z.infer<typeof opportunityIdSchema>
export type ProspectingActionId = z.infer<typeof prospectingActionIdSchema>
export type InterviewId = z.infer<typeof interviewIdSchema>
export type SignalId = z.infer<typeof signalIdSchema>
export type WeeklyReviewId = z.infer<typeof weeklyReviewIdSchema>
