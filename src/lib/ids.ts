import { z } from "zod"

// Le message ne sert qu'aux champs de formulaire, dont l'erreur s'affiche telle quelle ;
// ailleurs le schéma nu suffit.
const nonEmptyId = (message?: string) => z.string().trim().min(1, message)

export const personIdField = (message?: string) => nonEmptyId(message).brand<"PersonId">()
export const companyIdField = (message?: string) => nonEmptyId(message).brand<"CompanyId">()
export const opportunityIdField = (message?: string) => nonEmptyId(message).brand<"OpportunityId">()
const prospectingActionIdField = (message?: string) =>
  nonEmptyId(message).brand<"ProspectingActionId">()

export const personIdSchema = personIdField()
export const companyIdSchema = companyIdField()
export const prospectingActionIdSchema = prospectingActionIdField()

export type PersonId = z.infer<typeof personIdSchema>
export type CompanyId = z.infer<typeof companyIdSchema>
export type ProspectingActionId = z.infer<typeof prospectingActionIdSchema>
