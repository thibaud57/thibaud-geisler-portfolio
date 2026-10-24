import { INITIAL_FORM_STATE, type FormActionState } from "@/lib/form-state"
import type { AssetUploadInput } from "@/lib/schemas/asset"

export type AssetFormMessage =
  "file_too_large" | "file_empty" | "file_type_mismatch" | "unknown_error"

export type AssetFormState = FormActionState<
  AssetUploadInput,
  AssetFormMessage,
  keyof AssetUploadInput | "file"
>

export const initialAssetFormState: AssetFormState = INITIAL_FORM_STATE

// `usedBy` n'existe que pour `asset_in_use`. `invalid_path` remplace une erreur de champ `filename` qu'aucun écran n'affichait.
export type AssetDeleteState =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: "asset_in_use"; readonly usedBy: readonly string[] }
  | {
      readonly ok: false
      readonly message: "asset_hardcoded" | "invalid_path" | "unknown_error"
    }
