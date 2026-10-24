export type ReorderResult =
  | { ok: true; message: null }
  | { ok: false; message: "invalid_order" | "stale_order" | "unknown_error" }
