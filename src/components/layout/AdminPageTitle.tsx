"use client"

import { usePathname } from "next/navigation"

import { ADMIN_NAV_ITEMS, isAdminNavItemActive } from "@/config/admin-nav-items"

export function AdminPageTitle() {
  const pathname = usePathname()
  const item = ADMIN_NAV_ITEMS.find(({ href }) => isAdminNavItemActive(pathname, href))

  return <span className="truncate text-sm font-medium">{item?.label ?? "Espace admin"}</span>
}
