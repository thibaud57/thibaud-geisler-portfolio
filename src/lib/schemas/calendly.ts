import { z } from 'zod'

export const calendlyEventSchema = z.object({
  eventUri: z.url().max(512),
})

export type CalendlyEventInput = z.infer<typeof calendlyEventSchema>
