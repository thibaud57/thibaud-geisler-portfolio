import type { FormActionState } from "@/lib/form-state"
import type { TagInput } from "@/lib/schemas/tag"

export type TagFormMessage = "slug_taken" | "unknown_error" | null

export type TagFormState = FormActionState<TagInput, TagFormMessage>

export const initialTagFormState: TagFormState = {
  ok: null,
  errors: {},
  message: null,
}

export type TagReorderState =
  | { ok: true; message: null }
  | { ok: false; message: "invalid_order" | "stale_order" | "unknown_error" }

export type TagDeleteState =
  { ok: true; message: null } | { ok: false; message: "tag_in_use" | "unknown_error" }
