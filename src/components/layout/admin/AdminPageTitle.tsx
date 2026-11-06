"use client"

import { usePathname } from "next/navigation"

import { ADMIN_ACCOUNT_ITEMS } from "@/config/admin-account-items"
import { ADMIN_NAV_GROUPS, isAdminNavItemActive } from "@/config/admin-nav-items"

const NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items)

export function AdminPageTitle() {
  const pathname = usePathname()
  const item = NAV_ITEMS.find(({ href }) => href && isAdminNavItemActive(pathname, href))
  const title =
    item?.label ??
    ADMIN_ACCOUNT_ITEMS.find(({ href }) => isAdminNavItemActive(pathname, href))?.label ??
    "Espace admin"

  return <span className="truncate text-sm font-medium">{title}</span>
}
