import * as Sentry from "@sentry/nextjs"

import { env } from "@/env"
import { scrubSentryEvent } from "@/lib/sentry-scrub"

Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  beforeSend: scrubSentryEvent,
})
