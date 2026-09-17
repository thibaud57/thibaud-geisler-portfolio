import type { TagInput } from "@/lib/schemas/tag"

export type TagFormMessage = "slug_taken" | "tag_in_use" | "unknown_error" | null

export interface TagFormState {
  ok: boolean | null
  errors: Partial<Record<keyof TagInput, string[]>>
  message: TagFormMessage
  values?: Partial<Record<keyof TagInput, string>>
}

export const initialTagFormState: TagFormState = {
  ok: null,
  errors: {},
  message: null,
}
