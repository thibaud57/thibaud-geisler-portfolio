import type { ComponentType } from "react"

import { SidebarMenuButton } from "@/components/ui/sidebar"

// Même type large que AdminNavItem.icon (admin-nav-items.ts) : une icône de marque (Publications)
// n'est pas structurellement un LucideIcon.
type NavIcon = ComponentType<{ className?: string }>

export function AdminNavDisabledItem({ label, icon: Icon }: { label: string; icon?: NavIcon }) {
  return (
    <SidebarMenuButton aria-disabled tabIndex={-1} tooltip={label}>
      {Icon ? <Icon /> : null}
      <span>{label}</span>
    </SidebarMenuButton>
  )
}
