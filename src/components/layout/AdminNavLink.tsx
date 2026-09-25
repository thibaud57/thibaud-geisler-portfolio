"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { AdminNavSubLink } from "@/components/layout/AdminNavSubLink"
import {
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { isAdminNavItemActive, type AdminNavSubItem } from "@/config/admin-nav-items"
import { useCloseMobileSidebar } from "@/hooks/use-close-mobile-sidebar"

export function AdminNavLink({
  href,
  label,
  children,
  subItems,
}: {
  href: Route
  label: string
  children: ReactNode
  subItems?: readonly AdminNavSubItem[]
}) {
  const pathname = usePathname()
  const closeMobileSidebar = useCloseMobileSidebar()
  const isActive = isAdminNavItemActive(pathname, href)

  return (
    <>
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <Link href={href} aria-current={isActive ? "page" : undefined} onClick={closeMobileSidebar}>
          {children}
        </Link>
      </SidebarMenuButton>
      {subItems && isActive ? (
        <SidebarMenuSub>
          {subItems.map((sub) =>
            sub.href ? (
              <SidebarMenuSubItem key={sub.label}>
                <AdminNavSubLink href={sub.href} label={sub.label} />
              </SidebarMenuSubItem>
            ) : (
              // Aligné sur SidebarMenuSubButton (h-7, <a>) comme ses soeurs actives (Toutes,
              // Travaillées) : SidebarMenuButton rendrait une ligne trop haute.
              <SidebarMenuSubItem key={sub.label}>
                <SidebarMenuSubButton aria-disabled tabIndex={-1}>
                  <span>{sub.label}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ),
          )}
        </SidebarMenuSub>
      ) : null}
    </>
  )
}
