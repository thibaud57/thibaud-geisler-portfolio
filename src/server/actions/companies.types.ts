import type { FormActionState } from "@/lib/form-state"
import type { CompanyInput } from "@/lib/schemas/company"

export type CompanyFormMessage =
  "slug_taken" | "legal_entity_taken" | "company_in_use" | "unknown_error" | null

export type CompanyFormState = FormActionState<CompanyInput, CompanyFormMessage>

export const initialCompanyFormState: CompanyFormState = {
  ok: null,
  errors: {},
  message: null,
}
