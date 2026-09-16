import { Building2, FolderKanban, ImageIcon, Tags } from "lucide-react"

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/projets", label: "Projets", icon: FolderKanban },
  { href: "/admin/tags", label: "Tags", icon: Tags },
  { href: "/admin/entreprises", label: "Entreprises", icon: Building2 },
  { href: "/admin/assets", label: "Assets", icon: ImageIcon },
] as const

export const ADMIN_NAV_SECTION = "Portfolio"

export function isAdminNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
