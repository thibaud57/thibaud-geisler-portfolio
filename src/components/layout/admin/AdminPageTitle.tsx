"use client"

import { usePathname } from "next/navigation"

import { ADMIN_NAV_GROUPS, isAdminNavItemActive } from "@/config/admin-nav-items"

const NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items)

export function AdminPageTitle() {
  const pathname = usePathname()
  const item = NAV_ITEMS.find(({ href }) => href && isAdminNavItemActive(pathname, href))

  return <span className="truncate text-sm font-medium">{item?.label ?? "Espace admin"}</span>
}
