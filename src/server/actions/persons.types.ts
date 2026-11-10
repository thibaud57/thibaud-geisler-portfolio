export type PersonActionState<TMessage extends string> =
  | { readonly ok: true; readonly message: null }
  | { readonly ok: false; readonly message: TMessage | "unknown_error" }

export type OptOutPersonState = PersonActionState<"person_not_found" | "opt_out_refused">
export type ErasePersonExchangesState = PersonActionState<"person_not_found" | "not_opted_out">
