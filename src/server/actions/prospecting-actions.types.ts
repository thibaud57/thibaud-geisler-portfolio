import type { FormActionState } from "@/lib/form-state"
import type { ProspectingActionInput } from "@/lib/schemas/prospecting-action"

export type ProspectingActionFormMessage = "person_not_found" | "unknown_error" | null

export type ProspectingActionFormState = FormActionState<
  ProspectingActionInput,
  ProspectingActionFormMessage
>

export const initialProspectingActionFormState: ProspectingActionFormState = {
  ok: null,
  errors: {},
  message: null,
}
