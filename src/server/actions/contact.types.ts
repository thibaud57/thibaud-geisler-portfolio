import { INITIAL_FORM_STATE, type FormActionState } from "@/lib/form-state"
import type { ContactFieldErrorCode, ContactInput } from "@/lib/schemas/contact"

export type ContactFormMessage = "rate_limit" | "smtp_error"

export type ContactFormState = FormActionState<
  ContactInput,
  ContactFormMessage,
  keyof ContactInput,
  unknown,
  ContactFieldErrorCode
>

export const initialContactFormState: ContactFormState = INITIAL_FORM_STATE

export const RATE_LIMIT_MAX = 5
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
