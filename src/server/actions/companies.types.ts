import { INITIAL_FORM_STATE, type FormActionState } from "@/lib/form-state"
import type { CompanyInput } from "@/lib/schemas/company"

export type CompanyFormMessage =
  "slug_taken" | "siret_taken" | "company_in_use" | "company_not_found" | "unknown_error" | null

export type CompanyFormState = FormActionState<CompanyInput, CompanyFormMessage>

export const initialCompanyFormState: CompanyFormState = INITIAL_FORM_STATE
