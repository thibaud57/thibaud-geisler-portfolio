import "server-only"
import type { CallToolResult } from "@modelcontextprotocol/server"
import { revalidateTag } from "next/cache"

import { zonedIsoInstant } from "@/lib/date-time"
import type { McpDomain } from "@/lib/mcp-domains"
import type { DomainResult } from "@/server/result"
import type { McpLogger } from "@/server/mcp/logger"

// `this[key]` garde la `Date`, que `toJSON` a déjà changée en chaîne UTC.
function parisInstant(this: Record<string, unknown>, key: string, value: unknown): unknown {
  const raw = this[key]
  return raw instanceof Date ? zonedIsoInstant(raw) : value
}

export function toolJson(value: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, parisInstant) }] }
}

// Une écriture d'outil tourne dans un route handler : seul `revalidateTag(tag, "max")` y est permis (`updateTag` est réservé aux Server Actions).
export const revalidateTagMax = (tag: string): void => {
  revalidateTag(tag, "max")
}

export function toolError(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true }
}

export const notFoundMessage = (prefix: McpDomain, noun: string): string =>
  `No ${noun} has this id. Call ${prefix}_search to find the right id, then call the tool again.`

// Les textes d'une écriture : événements de log et message rendu à l'agent quand l'opération échoue.
export interface WriteTexts {
  events: { success: string; failure: string }
  failureMessage: string
}

// Un create n'a pas d'id à relire : `createCheck` dit comment vérifier que l'enregistrement existe déjà avant de réessayer.
export function writeTexts(
  {
    prefix,
    key,
    noun,
    pronoun = "its",
  }: { prefix: McpDomain; key: string; noun: string; pronoun?: "its" | "their" },
  createCheck: string,
): { create: WriteTexts; update: WriteTexts } {
  const unsaved = `The ${noun} could not be saved because of an internal error.`
  return {
    create: {
      events: { success: `${key}:created`, failure: `${key}:create_failed` },
      failureMessage: `${unsaved} ${createCheck}`,
    },
    update: {
      events: { success: `${key}:updated`, failure: `${key}:update_failed` },
      failureMessage: `${unsaved} Call ${prefix}_fetch to check ${pronoun} current state before retrying.`,
    },
  }
}

interface ToolFailure {
  event: string
  message: string
  context?: object
}

// Seule `run` est gardée : un échec de `handle` (invalidation du cache) ne doit pas se faire passer pour un échec de l'opération.
export async function guardTool<T>(
  log: McpLogger,
  failure: ToolFailure,
  run: () => Promise<T>,
  handle: (value: T) => CallToolResult,
): Promise<CallToolResult> {
  let value: T
  try {
    value = await run()
  } catch (err) {
    log.error({ err, event: failure.event, ...failure.context })
    return toolError(failure.message)
  }
  return handle(value)
}

interface WriteRecordOptions<V, E extends { code: string }> {
  run: () => Promise<DomainResult<V, E>>
  ctx: { log: McpLogger }
  texts: WriteTexts
  logContext: object
  errorMessage: (error: E) => string
  invalidate: () => void
  logged: (value: V) => object
  rendered: (value: V) => unknown
}

export const byId = {
  logged: ({ id }: { id: string }) => ({ id }),
  rendered: (value: unknown) => value,
}

// Écriture d'une entité de suivi : l'échec attendu devient un message qui nomme la correction (l'agent corrige l'appel sans deviner), le succès invalide les listes de l'admin que l'entité alimente.
export function writeRecord<V, E extends { code: string }>({
  run,
  ctx,
  texts: { events, failureMessage },
  logContext,
  errorMessage,
  invalidate,
  logged,
  rendered,
}: WriteRecordOptions<V, E>): Promise<CallToolResult> {
  return guardTool(
    ctx.log,
    { event: events.failure, message: failureMessage, context: logContext },
    run,
    (result) => {
      if (!result.ok) return toolError(errorMessage(result.error))

      invalidate()
      ctx.log.info({ event: events.success, ...logged(result.value) })
      return toolJson(rendered(result.value))
    },
  )
}
