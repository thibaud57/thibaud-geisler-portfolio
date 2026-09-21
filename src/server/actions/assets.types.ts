import type { AssetUploadInput } from "@/lib/schemas/asset"

export type AssetFormMessage =
  | "file_too_large"
  | "file_empty"
  | "file_type_mismatch"
  | "asset_in_use"
  | "asset_hardcoded"
  | "unknown_error"
  | null

export interface AssetFormState {
  ok: boolean | null
  errors: Partial<Record<keyof AssetUploadInput | "file", string[]>>
  message: AssetFormMessage
  usedBy?: string[]
}

export const initialAssetFormState: AssetFormState = {
  ok: null,
  errors: {},
  message: null,
}
