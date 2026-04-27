import type { ContactInput } from '@/lib/schemas/contact'

export type ContactFormMessage = 'rate_limit' | 'smtp_error' | null

export type ContactFormState = {
  ok: boolean | null
  errors: Partial<Record<keyof ContactInput, string[]>>
  message: ContactFormMessage
  values?: Partial<Record<keyof ContactInput, string>>
}

export const initialContactFormState: ContactFormState = {
  ok: null,
  errors: {},
  message: null,
}

export const RATE_LIMIT_MAX = 5
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
