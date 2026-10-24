import { z } from "zod"

export const calendlyEventSchema = z.object({
  eventUri: z.url().max(512),
})
