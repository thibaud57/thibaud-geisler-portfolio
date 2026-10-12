import "server-only"
import { z } from "zod"

import { createActionLogger, isPrismaError } from "@/lib/server-utils"

export interface ActionEvents {
  success: string
  failure: string
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
  // Champ optionnel, pensé pour un contrôle "ressource encore utilisée" : exécuté sous
  // instrumentation, avant `destroy`, il peut court-circuiter avec un état dédié sans passer par le mapping d'erreur.
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
