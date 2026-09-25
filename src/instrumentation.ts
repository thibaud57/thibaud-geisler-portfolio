import * as Sentry from "@sentry/nextjs"
import type { Logger } from "pino"
import type { Instrumentation } from "next"

let unhandledErrorLogger: Logger | undefined

export async function register() {
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    // Sentry avant le logger : l'intégration Pino doit être active avant la première émission.
    await import("../sentry.server.config")
    const { logger } = await import("./lib/logger")

    // Untrack sur un child dédié, pas le singleton : untracker le logger global masquerait aussi
    // les vraies erreurs applicatives loggées ailleurs (ex. Server Actions). Sans untrack ici, le
    // `logger.error()` qui suit doublonnerait l'issue Sentry déjà capturée par `captureRequestError`,
    // via l'auto-capture Pino de `pinoIntegration`.
    unhandledErrorLogger = logger.child({})
    Sentry.pinoIntegration.untrackLogger(unhandledErrorLogger)
  }

  if (process.env["NEXT_RUNTIME"] === "edge") await import("../sentry.edge.config")
}

// Sans ce hook, une erreur non gérée d'un rendu serveur sort en texte brut et échappe au
// filtre `"level":"error"` sur lequel repose l'investigation d'incident (PRODUCTION.md).
function logUnhandledError(err: unknown, path: string) {
  if (process.env["NEXT_RUNTIME"] !== "nodejs" || !unhandledErrorLogger) return

  unhandledErrorLogger.error({ err, event: "request:unhandled_error", path })
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  Sentry.captureRequestError(error, request, context)
  logUnhandledError(error, request.path)
}
