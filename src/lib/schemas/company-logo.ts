import { z } from "zod"

import { websiteUrlSchema } from "@/lib/schemas/company"
import { SLUG_PATTERN } from "@/lib/schemas/slug"

// Le formulaire met le slug en minuscules à l'enregistrement : le logo doit tomber dans ce dossier-là.
export const companyLogoRequestSchema = z.object({
  websiteUrl: websiteUrlSchema.transform((value) => new URL(value)),
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN),
})
