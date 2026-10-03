import * as Sentry from "@sentry/nextjs"

import { env } from "@/env"
import { SENTRY_DATA_COLLECTION, scrubSentryEvent, scrubSentryLog } from "@/lib/sentry-scrub"

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1, // plan gratuit : 5M spans/mois, trafic du site très en dessous
  dataCollection: SENTRY_DATA_COLLECTION,
  beforeSend: scrubSentryEvent,
  beforeSendLog: scrubSentryLog,
})
