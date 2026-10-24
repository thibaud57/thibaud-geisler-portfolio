import { INITIAL_FORM_STATE, type FormActionState, type SettledFormState } from "@/lib/form-state"
import type { WeeklyReviewInput } from "@/lib/schemas/weekly-review"

export type WeeklyReviewFormMessage =
  "review_week_exists" | "weekly_review_not_found" | "unknown_error"

export type WeeklyReviewFormState = FormActionState<WeeklyReviewInput, WeeklyReviewFormMessage>

export type WeeklyReviewDeleteState = SettledFormState<WeeklyReviewFormState>

export const initialWeeklyReviewFormState: WeeklyReviewFormState = INITIAL_FORM_STATE
