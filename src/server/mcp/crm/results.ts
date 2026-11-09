import "server-only"
import type { CallToolResult } from "@modelcontextprotocol/server"

import type { DomainResult } from "@/server/crm/result"
import type { McpLogger } from "@/server/mcp/logger"

export function toolJson(value: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value) }] }
}

export function toolError(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true }
}

// Les textes d'une écriture : événements de log et message rendu à l'agent quand l'opération échoue.
export interface WriteTexts {
  events: { success: string; failure: string }
  failureMessage: string
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

// Écriture d'une entité de suivi : l'échec attendu du domaine devient un message qui nomme la correction, le succès invalide les listes de l'admin que l'entité alimente et rend la valeur écrite.
export function writeRecord<V extends { id: string }, E extends { code: string }>(
  run: () => Promise<DomainResult<V, E>>,
  ctx: { log: McpLogger },
  { events, failureMessage }: WriteTexts,
  logContext: object,
  errorMessage: (error: E) => string,
  invalidate: () => void,
): Promise<CallToolResult> {
  return guardTool(
    ctx.log,
    { event: events.failure, message: failureMessage, context: logContext },
    run,
    (result) => {
      if (!result.ok) return toolError(errorMessage(result.error))

      invalidate()
      ctx.log.info({ event: events.success, id: result.value.id })
      return toolJson(result.value)
    },
  )
}
