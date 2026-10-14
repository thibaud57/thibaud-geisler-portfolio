import "server-only"
import { z } from "zod"

import type { FormActionState } from "@/lib/form-state"
import { createActionLogger, isPrismaError } from "@/lib/server-utils"

export interface ActionEvents {
  success: string
  failure: string
}

export async function rowExists<TWhere>(
  delegate: { count: (args: { where: TWhere }) => Promise<number> },
  where: TWhere,
): Promise<boolean> {
  return (await delegate.count({ where })) > 0
}

export const MISSING_COMPANY = {
  text: "Cette entreprise n'existe plus, recharge la page",
  code: "company_not_found",
} as const

export const MISSING_PERSON = {
  text: "Cette personne n'existe plus, recharge la page",
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

type FormValues<TInput> = FormActionState<TInput, null>["values"]

// `values` absent (formulaire sans réaffichage de saisie) : la clé n'est pas posée plutôt que posée à undefined.
export function formStateHandlers<TInput, const TNotFound extends string = never>(
  values: FormValues<TInput>,
  notFound?: {
    message: TNotFound
    updatedId: string | undefined
    exists: (id: string) => Promise<boolean>
  },
) {
  const echoed = values === undefined ? {} : { values }
  const { updatedId } = notFound ?? {}

  return {
    onValidationError: (
      errors: FormActionState<TInput, null>["errors"],
    ): FormActionState<TInput, null> => ({ ok: false, errors, message: null, ...echoed }),
    onSuccess: (): FormActionState<TInput, null> => ({ ok: true, errors: {}, message: null }),
    onUnknownError: (): FormActionState<TInput, "unknown_error"> => ({
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
            state: (): FormActionState<TInput, TNotFound> => ({
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

export function saveEntity<TInput extends object, TState, TPersistResult>(
  config: SaveEntityConfig<TInput, TState, TPersistResult>,
): Promise<TState> {
  return createActionLogger(config.actionName, async ({ log }) => {
    const result = config.schema.safeParse(config.input)
    if (!result.success) {
      return config.onValidationError(z.flattenError(result.error).fieldErrors)
    }

    try {
      const persisted = await config.persist(result.data)
      // Après l'écriture réussie seulement : une invalidation précédant un échec purgerait le cache sans raison.
      config.invalidateCaches()
      log.info({ event: config.events.success, ...config.successLogFields(result.data, persisted) })
      return config.onSuccess(persisted, result.data)
    } catch (err) {
      if (config.notFound && isPrismaError(err, "P2025") && !(await config.notFound.exists())) {
        // La revalidation réaligne l'écran périmé (autre onglet, double clic) sur la base.
        config.invalidateCaches()
        return config.notFound.state()
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
      if (isPrismaError(err, "P2025") && !(await config.exists())) {
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
