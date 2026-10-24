import type { ReorderResult } from "@/lib/admin/reorder-state"
import { INITIAL_FORM_STATE, type FormActionState } from "@/lib/form-state"
import type { TagInput } from "@/lib/schemas/tag"

export type TagFormMessage = "slug_taken" | "tag_not_found" | "unknown_error"

export type TagFormState = FormActionState<TagInput, TagFormMessage>

export const initialTagFormState: TagFormState = INITIAL_FORM_STATE

export type TagReorderState = ReorderResult

export type TagDeleteState =
  { ok: true; message: null } | { ok: false; message: "tag_in_use" | "unknown_error" }
