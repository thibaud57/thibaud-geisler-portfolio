"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { SidebarMenuButton } from "@/components/ui/sidebar"
import { isAdminNavItemActive } from "@/config/admin-nav-items"
import { useCloseMobileSidebar } from "@/hooks/use-close-mobile-sidebar"

export function AdminNavLink({
  href,
  label,
  children,
}: {
  href: Route
  label: string
  children: ReactNode
}) {
  const pathname = usePathname()
  const closeMobileSidebar = useCloseMobileSidebar()
  const isActive = isAdminNavItemActive(pathname, href)

  return (
    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
      <Link href={href} aria-current={isActive ? "page" : undefined} onClick={closeMobileSidebar}>
        {children}
      </Link>
    </SidebarMenuButton>
  )
}
