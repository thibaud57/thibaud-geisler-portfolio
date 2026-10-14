import { INITIAL_FORM_STATE, type FormActionState } from "@/lib/form-state"
import type { OpportunityInput } from "@/lib/schemas/opportunity"

export type OpportunityFormMessage =
  | "intermediary_not_esn"
  | "company_not_found"
  | "referrer_not_found"
  | "opportunity_not_found"
  | "unknown_error"
  | null

export type OpportunityFormState = FormActionState<OpportunityInput, OpportunityFormMessage>

export const initialOpportunityFormState: OpportunityFormState = INITIAL_FORM_STATE
