// Une personne opposée ne se modifie plus et ne se supprime qu'après son échéance : sa fiche ne garde que ce qui la reconnaît.
export class PersonLockedError extends Error {}

export type PersonActionState<TMessage extends string> =
  | { readonly ok: true; readonly message: null }
  | { readonly ok: false; readonly message: TMessage | "unknown_error" }

export type OptOutPersonState = PersonActionState<"person_not_found" | "opt_out_refused">
export type ErasePersonExchangesState = PersonActionState<"person_not_found" | "not_opted_out">
