import * as Sentry from "@sentry/nextjs"

import { env } from "@/env"
import { scrubSentryEvent, scrubSentryLog } from "@/lib/sentry-scrub"

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1, // plan gratuit : 5M spans/mois, trafic du site très en dessous
  integrations: [
    Sentry.pinoIntegration({
      log: { levels: ["warn", "error", "fatal"] },
      error: { levels: ["error", "fatal"] },
    }),
  ],
  beforeSend: scrubSentryEvent,
  beforeSendLog: scrubSentryLog,
})
