import { z } from "zod"

import { DAY_MS } from "@/lib/date-time"
import { MCP_DOMAINS } from "@/lib/mcp-domains"

export const API_KEY_EXPIRIES = ["30", "90", "365", "none"] as const

export type ApiKeyExpiry = (typeof API_KEY_EXPIRIES)[number]

const DOMAINS_REQUIRED = "Choisissez au moins un domaine"

// 32 : `maximumNameLength` par défaut du plugin @better-auth/api-key
export const apiKeySchema = z.object({
  name: z.string().trim().min(1, "Donnez un nom à la clé").max(32, "32 caractères au plus"),
  domains: z
    .array(z.enum(MCP_DOMAINS, { error: DOMAINS_REQUIRED }), { error: DOMAINS_REQUIRED })
    .min(1, DOMAINS_REQUIRED)
    .transform((domains) => [...new Set(domains)]),
  expiry: z.enum(API_KEY_EXPIRIES, { error: "Choisissez une expiration" }),
})

export type ApiKeyInput = z.infer<typeof apiKeySchema>

export function expiryInSeconds(expiry: ApiKeyExpiry): number | undefined {
  return expiry === "none" ? undefined : (Number(expiry) * DAY_MS) / 1000
}
