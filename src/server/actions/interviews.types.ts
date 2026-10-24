import { INITIAL_FORM_STATE, type FormActionState, type SettledFormState } from "@/lib/form-state"
import type { InterviewInput } from "@/lib/schemas/interview"

export type InterviewFormMessage =
  | "interview_not_found"
  | "opportunity_not_found"
  | "opportunity_without_intermediary"
  | "correspondent_not_found"
  | "correspondent_exists"
  | "unknown_error"

export type InterviewFormState = FormActionState<InterviewInput, InterviewFormMessage>

export type InterviewDeleteState = SettledFormState<InterviewFormState>

export const initialInterviewFormState: InterviewFormState = INITIAL_FORM_STATE
