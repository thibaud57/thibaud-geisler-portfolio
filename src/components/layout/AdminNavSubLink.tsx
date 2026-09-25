"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { SidebarMenuSubButton } from "@/components/ui/sidebar"
import { useCloseMobileSidebar } from "@/hooks/use-close-mobile-sidebar"

export function AdminNavSubLink({ href, label }: { href: Route; label: string }) {
  const pathname = usePathname()
  const closeMobileSidebar = useCloseMobileSidebar()

  return (
    <SidebarMenuSubButton asChild isActive={pathname === href}>
      <Link href={href} onClick={closeMobileSidebar}>
        {label}
      </Link>
    </SidebarMenuSubButton>
  )
}
