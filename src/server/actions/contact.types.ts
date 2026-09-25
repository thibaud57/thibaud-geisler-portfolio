import type { FormActionState } from "@/lib/form-state"
import type { ContactInput } from "@/lib/schemas/contact"

export type ContactFormMessage = "rate_limit" | "smtp_error" | null

export type ContactFormState = FormActionState<ContactInput, ContactFormMessage>

export const initialContactFormState: ContactFormState = {
  ok: null,
  errors: {},
  message: null,
}

export const RATE_LIMIT_MAX = 5
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
