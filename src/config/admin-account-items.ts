import type { LucideIcon } from "lucide-react"
import { KeyRound } from "lucide-react"
import type { Route } from "next"

import { ADMIN_API_KEYS_PATH } from "@/lib/admin/routes"

interface AdminAccountItem {
  href: Route
  label: string
  icon: LucideIcon
}

export const ADMIN_ACCOUNT_ITEMS: readonly AdminAccountItem[] = [
  { href: ADMIN_API_KEYS_PATH, label: "Clés d'API", icon: KeyRound },
]
