import { INITIAL_FORM_STATE, type FormActionState, type SettledFormState } from "@/lib/form-state"
import type { OpportunityInput } from "@/lib/schemas/opportunity"

export type OpportunityFormMessage =
  | "intermediary_not_esn"
  | "company_not_found"
  | "referrer_not_found"
  | "opportunity_not_found"
  | "unknown_error"

export type OpportunityFormState = FormActionState<OpportunityInput, OpportunityFormMessage>

export type OpportunityDeleteState = SettledFormState<OpportunityFormState>

export const initialOpportunityFormState: OpportunityFormState = INITIAL_FORM_STATE
