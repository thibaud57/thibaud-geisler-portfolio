import type { FormActionState } from "@/lib/form-state"
import type { InterviewInput } from "@/lib/schemas/interview"

export type InterviewFormMessage =
  | "opportunity_not_found"
  | "opportunity_without_intermediary"
  | "correspondent_not_found"
  | "correspondent_exists"
  | "unknown_error"
  | null

export type InterviewFormState = FormActionState<InterviewInput, InterviewFormMessage>

export const initialInterviewFormState: InterviewFormState = {
  ok: null,
  errors: {},
  message: null,
}
