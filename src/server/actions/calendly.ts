'use server'

import 'server-only'

import { createActionLogger } from '@/lib/server-utils'

// Fire-and-forget post-booking : pas de Zod/rate-limit (Calendly throttle en amont, juste un log Pino côté nous).
export async function trackCalendlyEvent(input: { eventUri: string }): Promise<void> {
  const { log } = await createActionLogger('trackCalendlyEvent')
  log.info({ event: 'calendly:event_scheduled', event_uri: input.eventUri })
}
