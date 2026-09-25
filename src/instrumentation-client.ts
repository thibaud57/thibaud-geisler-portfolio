import * as Sentry from "@sentry/nextjs"

import { scrubSentryEvent } from "@/lib/sentry-scrub"

Sentry.init({
  // Lu hors de `@/env`, qui chargerait Zod sur toutes les pages publiques : 60 Kio, et un `new Function`
  // refusé par la CSP (docs/baselines/cwv-2026-09-25.md). La valeur est inlinée au build.
  dsn: process.env["NEXT_PUBLIC_SENTRY_DSN"],
  tracesSampleRate: 0,
  beforeSend: scrubSentryEvent,
})

// Export attendu nommément par le SDK, qui réclame ce hook au démarrage tant qu'il est absent :
// sans lui, une erreur levée pendant une navigation client n'est rattachée à aucune transition.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
