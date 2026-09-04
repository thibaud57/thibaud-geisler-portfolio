'use server'

import 'server-only'

import { calendlyEventSchema, type CalendlyEventInput } from '@/lib/schemas/calendly'
import { createActionLogger } from '@/lib/server-utils'

// Fire-and-forget post-booking : pas de rate-limit (Calendly throttle en amont), entrée invalide ignorée en silence.
export async function trackCalendlyEvent(input: CalendlyEventInput): Promise<void> {
  const parsed = calendlyEventSchema.safeParse(input)
  if (!parsed.success) return

  const { log } = await createActionLogger('trackCalendlyEvent')
  log.info({ event: 'calendly:event_scheduled', event_uri: parsed.data.eventUri })
}
