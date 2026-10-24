import type { ReorderResult } from "@/lib/admin/reorder-state"
import { INITIAL_FORM_STATE, type FormActionState, type SettledFormState } from "@/lib/form-state"
import type { ProjectInput } from "@/lib/schemas/project"

export type ProjectFormMessage =
  "slug_taken" | "project_not_found" | "company_not_found" | "tag_not_found" | "unknown_error"

export type ProjectFormState = FormActionState<
  ProjectInput,
  ProjectFormMessage,
  keyof ProjectInput,
  { readonly savedId: string }
>
export type ProjectDeleteState = SettledFormState<FormActionState<ProjectInput, ProjectFormMessage>>

export const initialProjectFormState: ProjectFormState = INITIAL_FORM_STATE

export type ProjectReorderState = ReorderResult
