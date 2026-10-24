import { INITIAL_FORM_STATE, type FormActionState, type SettledFormState } from "@/lib/form-state"
import type { SignalInput } from "@/lib/schemas/signal"

export type SignalFormMessage =
  "lead_not_eligible" | "signal_not_found" | "company_not_found" | "unknown_error"

export type SignalFormState = FormActionState<SignalInput, SignalFormMessage>

export type SignalDeleteState = SettledFormState<SignalFormState>

export const initialSignalFormState: SignalFormState = INITIAL_FORM_STATE
