import type { CompanyInput } from "@/lib/schemas/company"

export type CompanyFormMessage =
  "slug_taken" | "legal_entity_taken" | "company_in_use" | "unknown_error" | null

export interface CompanyFormState {
  ok: boolean | null
  errors: Partial<Record<keyof CompanyInput, string[]>>
  message: CompanyFormMessage
  values?: Partial<Record<string, string | string[]>>
}

export const initialCompanyFormState: CompanyFormState = {
  ok: null,
  errors: {},
  message: null,
}
