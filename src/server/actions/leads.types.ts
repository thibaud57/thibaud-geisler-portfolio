import type { FormActionState } from "@/lib/form-state"
import type { LeadInput } from "@/lib/schemas/lead"

export type LeadFormMessage =
  | "lead_exists"
  | "lead_opted_out"
  | "lead_opted_out_locked"
  | "company_not_found"
  | "unknown_error"
  | null

export type LeadFormState = FormActionState<LeadInput, LeadFormMessage>

export const initialLeadFormState: LeadFormState = {
  ok: null,
  errors: {},
  message: null,
}
