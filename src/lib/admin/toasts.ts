import type { ErasePersonExchangesState, OptOutPersonState } from "@/server/actions/persons.types"

export const GENERIC_ERROR_TOAST = "Une erreur est survenue, réessayez"

export const PERSON_NOT_FOUND_TOAST = "Cette personne n'existe plus, recharge la page"

type FailureCode<TState extends { ok: boolean; message: string | null }> = Extract<
  TState,
  { ok: false }
>["message"]

export const OPT_OUT_ERROR_TOASTS = {
  person_not_found: PERSON_NOT_FOUND_TOAST,
  opt_out_refused: "L'opposition se pose depuis la fiche d'un lead : cette personne n'en a pas",
  unknown_error: GENERIC_ERROR_TOAST,
} as const satisfies Record<FailureCode<OptOutPersonState>, string>

export const ERASE_EXCHANGES_ERROR_TOASTS = {
  person_not_found: PERSON_NOT_FOUND_TOAST,
  not_opted_out: "Cette personne n'a pas fait opposition : ses échanges ne s'effacent pas",
  unknown_error: GENERIC_ERROR_TOAST,
} as const satisfies Record<FailureCode<ErasePersonExchangesState>, string>
