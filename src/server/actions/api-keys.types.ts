import { INITIAL_FORM_STATE, type FormActionState } from "@/lib/form-state"
import type { ApiKeyInput } from "@/lib/schemas/api-key"

export type ApiKeyFormMessage = "unknown_error"

export type ApiKeyFormState = FormActionState<
  ApiKeyInput,
  ApiKeyFormMessage,
  keyof ApiKeyInput,
  { created: { name: string; key: string } }
>

export const initialApiKeyFormState: ApiKeyFormState = INITIAL_FORM_STATE

export type ApiKeyDeleteState =
  { ok: true; message: null } | { ok: false; message: "unknown_error" }
