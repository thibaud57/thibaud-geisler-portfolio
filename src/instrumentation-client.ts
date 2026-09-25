import * as Sentry from "@sentry/nextjs"

import { env } from "@/env"
import { scrubSentryEvent } from "@/lib/sentry-scrub"

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  beforeSend: scrubSentryEvent,
})

// Export attendu nommément par le SDK, qui réclame ce hook au démarrage tant qu'il est absent :
// sans lui, une erreur levée pendant une navigation client n'est rattachée à aucune transition.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
