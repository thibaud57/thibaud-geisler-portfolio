import "server-only"
import { z } from "zod"

import { PERSON_NOT_FOUND_TOAST } from "@/lib/admin/toasts"
import type { FieldErrors, FormFailure, FormSuccess, FormValues } from "@/lib/form-state"
import { createActionLogger, isRowGone } from "@/lib/server-utils"
import type { DomainResult } from "@/server/crm/result"

export interface ActionEvents {
  success: string
  failure: string
}

export const MISSING_COMPANY = {
  text: "Cette entreprise n'existe plus, recharge la page",
  code: "company_not_found",
} as const

export const MISSING_PERSON = {
  text: PERSON_NOT_FOUND_TOAST,
  code: "person_not_found",
} as const

export const MISSING_REFERRER = {
  text: "Cet apporteur n'existe plus, recharge la page",
  code: "referrer_not_found",
} as const

export const MISSING_TAG = {
  text: "Un des tags n'existe plus, recharge la page",
  code: "tag_not_found",
} as const

export function missingRelationState<TField extends string, TCode extends string, TValues>(
  field: TField,
  relation: { text: string; code: TCode },
  values: TValues,
): { ok: false; errors: Partial<Record<TField, string[]>>; message: TCode; values: TValues } {
  return {
    ok: false,
    errors: { [field]: [relation.text] } as Partial<Record<TField, string[]>>,
    message: relation.code,
    values,
  }
}

// `values` absent (formulaire sans réaffichage de saisie) : la clé n'est pas posée plutôt que posée à undefined.
export function formStateHandlers<TInput, const TNotFound extends string = never>(
  values: FormValues<TInput> | undefined,
  notFound?: {
    message: TNotFound
    updatedId: string | undefined
    exists: (id: string) => Promise<boolean>
  },
) {
  const echoed = values === undefined ? {} : { values }
  const { updatedId } = notFound ?? {}

  return {
    onValidationError: (errors: FieldErrors<keyof TInput>): FormFailure<TInput, never> => ({
      ok: false,
      errors,
      message: null,
      ...echoed,
    }),
    onSuccess: (): FormSuccess<keyof TInput> => ({ ok: true, errors: {}, message: null }),
    onUnknownError: (): FormFailure<TInput, "unknown_error"> => ({
      ok: false,
      errors: {},
      message: "unknown_error",
      ...echoed,
    }),
    notFound:
      notFound === undefined || updatedId === undefined
        ? undefined
        : {
            exists: () => notFound.exists(updatedId),
            state: (): FormFailure<TInput, TNotFound> => ({
              ok: false,
              errors: {},
              message: notFound.message,
              ...echoed,
            }),
          },
  }
}

interface SaveEntityConfig<TInput extends object, TState, TPersistResult> {
  actionName: string
  events: ActionEvents
  schema: z.ZodType<TInput>
  input: unknown
  persist: (data: TInput) => Promise<TPersistResult>
  successLogFields: (data: TInput, persisted: TPersistResult) => Record<string, unknown>
  invalidateCaches: () => void
  onValidationError: (fieldErrors: Partial<Record<keyof TInput, string[]>>) => TState
  onSuccess: (result: TPersistResult, data: TInput) => TState
  // Mise à jour seulement. Un P2025 vient aussi d'une fiche voisine ou d'un rattachement disparu : seule l'absence réelle de la cible vaut « supprimée ».
  notFound?: { exists: () => Promise<boolean>; state: () => TState }
  mapError?: (err: unknown) => TState | null
  onUnknownError: (err: unknown) => TState
}

// `invalidate: true` quand la cible a disparu : la revalidation réaligne l'écran périmé sur la base.
export interface DomainFailure<TState> {
  state: TState
  invalidate: boolean
}

// Un id illisible ne désigne aucune cible : même réponse que l'échec de domaine équivalent, invalidation comprise.
export function failureState<TState>(
  { state, invalidate }: DomainFailure<TState>,
  invalidateCaches: () => void,
): TState {
  if (invalidate) invalidateCaches()
  return state
}

export function domainFailure<
  TInput,
  TMessage extends string,
  TField extends PropertyKey = keyof TInput,
>(
  values: FormFailure<TInput, TMessage, TField>["values"],
  errors: FieldErrors<TField>,
  message: TMessage | null,
  invalidate = false,
): DomainFailure<FormFailure<TInput, TMessage, TField>> {
  return { state: { ok: false, errors, message, values }, invalidate }
}

interface SaveDomainEntityConfig<
  TInput extends object,
  TState,
  TValue,
  E extends { code: string },
> extends Omit<SaveEntityConfig<TInput, TState, TValue>, "persist" | "notFound"> {
  persist: (data: TInput) => Promise<DomainResult<TValue, E>>
  onDomainError: (error: E) => DomainFailure<TState>
}

type SaveOutcome<TValue, TState> =
  { ok: true; value: TValue } | { ok: false; state: TState; invalidate: boolean }

export function saveEntity<TInput extends object, TState, TValue, E extends { code: string }>(
  config: SaveDomainEntityConfig<TInput, TState, TValue, E>,
): Promise<TState>
export function saveEntity<TInput extends object, TState, TPersistResult>(
  config: SaveEntityConfig<TInput, TState, TPersistResult>,
): Promise<TState>
export function saveEntity<TInput extends object, TState, TValue, E extends { code: string }>(
  config:
    SaveEntityConfig<TInput, TState, TValue> | SaveDomainEntityConfig<TInput, TState, TValue, E>,
): Promise<TState> {
  return createActionLogger(config.actionName, async ({ log }) => {
    const result = config.schema.safeParse(config.input)
    if (!result.success) {
      return config.onValidationError(z.flattenError(result.error).fieldErrors)
    }

    const persist = async (data: TInput): Promise<SaveOutcome<TValue, TState>> => {
      if (!("onDomainError" in config)) return { ok: true, value: await config.persist(data) }
      const domain = await config.persist(data)
      return domain.ok ? domain : { ok: false, ...config.onDomainError(domain.error) }
    }
    const notFound = "notFound" in config ? config.notFound : undefined

    try {
      const outcome = await persist(result.data)
      if (!outcome.ok) return failureState(outcome, config.invalidateCaches)
      // Après l'écriture réussie seulement : une invalidation précédant un échec purgerait le cache sans raison.
      config.invalidateCaches()
      log.info({
        event: config.events.success,
        ...config.successLogFields(result.data, outcome.value),
      })
      return config.onSuccess(outcome.value, result.data)
    } catch (err) {
      if (notFound && (await isRowGone(err, notFound.exists))) {
        // La revalidation réaligne l'écran périmé (autre onglet, double clic) sur la base.
        config.invalidateCaches()
        return notFound.state()
      }
      const mapped = config.mapError?.(err)
      if (mapped) return mapped

      log.error({ err, event: config.events.failure })
      return config.onUnknownError(err)
    }
  })
}

interface DeleteEntityConfig<TState> {
  actionName: string
  events: ActionEvents
  successLogFields: Record<string, unknown>
  errorLogFields?: Record<string, unknown>
  // Exécuté sous instrumentation avant `destroy` : peut court-circuiter avec un état dédié sans passer par `mapError`.
  precondition?: () => Promise<TState | null>
  exists: () => Promise<boolean>
  destroy: () => Promise<unknown>
  invalidateCaches: () => void
  onSuccess: () => TState
  mapError?: (err: unknown) => TState | null
  onUnknownError: (err: unknown) => TState
}

export function deleteEntity<TState>(config: DeleteEntityConfig<TState>): Promise<TState> {
  return createActionLogger(config.actionName, async ({ log }) => {
    if (config.precondition) {
      const shortCircuit = await config.precondition()
      if (shortCircuit) return shortCircuit
    }

    try {
      await config.destroy()
      config.invalidateCaches()
      log.info({ event: config.events.success, ...config.successLogFields })
      return config.onSuccess()
    } catch (err) {
      // Déjà supprimée (autre onglet, double clic) : idempotent. Un P2025 d'une instruction secondaire annule la transaction, la ligne existe alors encore.
      if (await isRowGone(err, config.exists)) {
        config.invalidateCaches()
        return config.onSuccess()
      }
      const mapped = config.mapError?.(err)
      if (mapped) return mapped

      log.error({ err, event: config.events.failure, ...config.errorLogFields })
      return config.onUnknownError(err)
    }
  })
}
