import type { ApiKeyExpiry } from "@/lib/schemas/api-key"
import type { AdminApiKey } from "@/server/queries/api-keys"

export const API_KEY_FIELD_LABELS = {
  name: "Nom",
  domains: "Domaines",
  expiry: "Expiration",
  createdAt: "Créée le",
  lastRequest: "Dernière utilisation",
  expiresAt: "Expire le",
} as const

export const API_KEY_EXPIRY_LABELS: Record<ApiKeyExpiry, string> = {
  "30": "30 jours",
  "90": "90 jours",
  "365": "1 an",
  none: "Sans expiration",
}

export const API_KEY_NEVER_USED_LABEL = "Jamais utilisée"

// Le plugin accepte une clé sans nom : son début de clé la nomme alors dans la liste et la confirmation.
export function apiKeyDisplayName({ name, start, id }: AdminApiKey): string {
  return name ?? start ?? id
}
