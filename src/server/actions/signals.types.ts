import { INITIAL_FORM_STATE, type FormActionState } from "@/lib/form-state"
import type { SignalInput } from "@/lib/schemas/signal"

export type SignalFormMessage =
  "lead_not_eligible" | "signal_not_found" | "company_not_found" | "unknown_error" | null

export type SignalFormState = FormActionState<SignalInput, SignalFormMessage>

export const initialSignalFormState: SignalFormState = INITIAL_FORM_STATE
