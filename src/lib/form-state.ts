export type FieldErrors<TField extends PropertyKey, TCode extends string = string> = Partial<
  Record<TField, TCode[]>
>

// Un état sans échec garde la clé `errors` lisible (`state.errors.name`) mais ne peut en porter aucune.
type NoFieldErrors<TField extends PropertyKey> = Partial<Record<TField, undefined>>

export type FormValues<TInput> = Partial<Record<keyof TInput, string | string[]>>

export interface FormIdle<TField extends PropertyKey> {
  readonly ok: null
  readonly errors: NoFieldErrors<TField>
  readonly message: null
  readonly values?: undefined
}

export type FormSuccess<TField extends PropertyKey, TExtra = unknown> = {
  readonly ok: true
  readonly errors: NoFieldErrors<TField>
  readonly message: null
  readonly values?: undefined
} & TExtra

export interface FormFailure<
  TInput,
  TMessage extends string,
  TField extends PropertyKey = keyof TInput,
  TCode extends string = string,
> {
  readonly ok: false
  readonly errors: FieldErrors<TField, TCode>
  // null : erreurs de champ seules (validation).
  readonly message: TMessage | null
  readonly values?: FormValues<TInput>
}

export type FormActionState<
  TInput,
  TMessage extends string,
  TField extends PropertyKey = keyof TInput,
  TExtra = unknown,
  TCode extends string = string,
> = FormIdle<TField> | FormSuccess<TField, TExtra> | FormFailure<TInput, TMessage, TField, TCode>

export type FormOutcome<TMessage extends string> =
  | { readonly ok: null | true; readonly message: null }
  | { readonly ok: false; readonly message: TMessage | null }

export type SettledFormState<TState extends { readonly ok: unknown }> = Exclude<
  TState,
  { readonly ok: null }
>

export const INITIAL_FORM_STATE = { ok: null, errors: {}, message: null } as const
