export type DeleteOutcome =
  | { readonly status: "deleted" }
  | { readonly status: "denied"; readonly reason: string }
  | { readonly status: "failed" }

export type DeleteResult<M extends string> =
  { readonly ok: true } | { readonly ok: false; readonly message: M | null }

// `denials` : refus métier par code ; tout autre échec est technique (toast générique côté dialogue).
export function deleteOutcomeOf<M extends string>(
  result: DeleteResult<M>,
  denials: Partial<Record<M, string>> = {},
): DeleteOutcome {
  if (result.ok) return { status: "deleted" }
  const reason = result.message === null ? undefined : denials[result.message]
  return reason === undefined ? { status: "failed" } : { status: "denied", reason }
}
