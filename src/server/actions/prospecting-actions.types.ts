import { INITIAL_FORM_STATE, type FormActionState, type SettledFormState } from "@/lib/form-state"
import type { ProspectingActionInput } from "@/lib/schemas/prospecting-action"

export type ProspectingActionFormMessage =
  "person_not_found" | "prospecting_action_not_found" | "unknown_error"

export type ProspectingActionFormState = FormActionState<
  ProspectingActionInput,
  ProspectingActionFormMessage
>

export type ProspectingActionDeleteState = SettledFormState<ProspectingActionFormState>

export const initialProspectingActionFormState: ProspectingActionFormState = INITIAL_FORM_STATE
