import * as Sentry from "@sentry/nextjs"
import type { Logger } from "pino"
import type { Instrumentation } from "next"

let unhandledErrorLogger: Logger | undefined

export async function register() {
  if (process.env["NEXT_RUNTIME"] === "nodejs") {
    // Sentry avant le logger : l'intégration Pino doit être active avant la première émission.
    await import("../sentry.server.config")
    const { logger } = await import("./lib/logger")

    // Untrack sur un child dédié : `captureRequestError` capture déjà l'erreur juste avant
    // `logUnhandledError` ci-dessous, donc le `logger.error()` qui suit doublonnerait l'issue
    // Sentry via l'auto-capture Pino de `pinoIntegration` si on ne l'untrackait pas. Untracker
    // le logger global aurait aussi masqué les vraies erreurs applicatives loggées ailleurs
    // (ex. Server Actions), d'où le child dédié plutôt que le singleton.
    unhandledErrorLogger = logger.child({})
    Sentry.pinoIntegration.untrackLogger(unhandledErrorLogger)

    // Invalide le cache build (rempli au build CI avec données seed ephemeral)
    // pour forcer le fill avec les vraies données prod au premier hit après deploy.
    if (process.env["NEXT_PHASE"] === "phase-production-server") {
      const { revalidateTag } = await import("next/cache")
      revalidateTag("projects", "max")
      revalidateTag("tags", "max")
      revalidateTag("legal-entity", "max")
      revalidateTag("legal-content", "max")
    }
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
