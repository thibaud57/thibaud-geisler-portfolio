import { INITIAL_FORM_STATE, type FormActionState } from "@/lib/form-state"
import type { ProjectInput } from "@/lib/schemas/project"

export type ProjectFormMessage =
  | "slug_taken"
  | "project_not_found"
  | "company_not_found"
  | "tag_not_found"
  | "unknown_error"
  | null

export type ProjectFormState = FormActionState<ProjectInput, ProjectFormMessage> & {
  savedId?: string
}

export const initialProjectFormState: ProjectFormState = INITIAL_FORM_STATE

export type ProjectReorderState =
  | { ok: true; message: null }
  | { ok: false; message: "invalid_order" | "stale_order" | "unknown_error" }
