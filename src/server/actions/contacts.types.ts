import type { FormActionState } from "@/lib/form-state"
import type { ContactFormFields } from "@/lib/schemas/network-contact"

export type ContactFormMessage =
  | "contact_exists"
  | "contact_opted_out"
  | "contact_opted_out_locked"
  | "company_not_found"
  | "person_not_found"
  | "contact_not_found"
  | "unknown_error"
  | null

export type ContactFormState = FormActionState<ContactFormFields, ContactFormMessage>

export const initialContactFormState: ContactFormState = {
  ok: null,
  errors: {},
  message: null,
}
