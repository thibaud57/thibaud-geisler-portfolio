export interface FormActionState<TInput, TMessage> {
  ok: boolean | null
  errors: Partial<Record<keyof TInput, string[]>>
  message: TMessage
  values?: Partial<Record<keyof TInput, string | string[]>>
}

export const INITIAL_FORM_STATE = { ok: null, errors: {}, message: null } as const
