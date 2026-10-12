import type { FormActionState } from "@/lib/form-state"
import type { WeeklyReviewInput } from "@/lib/schemas/weekly-review"

export type WeeklyReviewFormMessage =
  "review_week_exists" | "weekly_review_not_found" | "unknown_error" | null

export type WeeklyReviewFormState = FormActionState<WeeklyReviewInput, WeeklyReviewFormMessage>

export const initialWeeklyReviewFormState: WeeklyReviewFormState = {
  ok: null,
  errors: {},
  message: null,
}
