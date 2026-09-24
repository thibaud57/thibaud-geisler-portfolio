import "server-only"
import { z } from "zod"

import { createActionLogger } from "@/lib/server-utils"

interface ActionEvents {
  success: string
  failure: string
}

interface SaveEntityConfig<TInput extends { slug: string }, TState, TPersistResult> {
  actionName: string
  events: ActionEvents
  schema: z.ZodType<TInput>
  input: unknown
  persist: (data: TInput) => Promise<TPersistResult>
  invalidateCaches: () => void
  onValidationError: (fieldErrors: Partial<Record<keyof TInput, string[]>>) => TState
  onSuccess: (result: TPersistResult, data: TInput) => TState
  mapError: (err: unknown) => TState | null
  onUnknownError: (err: unknown) => TState
}

export function saveEntity<TInput extends { slug: string }, TState, TPersistResult>(
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
      log.info({ event: config.events.success, slug: result.data.slug })
      return config.onSuccess(persisted, result.data)
    } catch (err) {
      const mapped = config.mapError(err)
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
  // Champ optionnel, pensé pour un contrôle "ressource encore utilisée" : exécuté sous
  // instrumentation, avant `destroy`, il peut court-circuiter avec un état dédié sans passer par le mapping d'erreur.
  precondition?: () => Promise<TState | null>
  destroy: () => Promise<unknown>
  invalidateCaches: () => void
  onSuccess: () => TState
  mapError: (err: unknown) => TState | null
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
      const mapped = config.mapError(err)
      if (mapped) return mapped

      log.error({ err, event: config.events.failure, ...config.errorLogFields })
      return config.onUnknownError(err)
    }
  })
}
