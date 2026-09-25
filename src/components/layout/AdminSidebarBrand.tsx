"use client"

import Link from "next/link"

import { BrandLogo } from "@/components/layout/BrandLogo"
import { BrandMark } from "@/components/layout/BrandMark"
import { useCloseMobileSidebar } from "@/hooks/use-close-mobile-sidebar"
import { ADMIN_ROOT } from "@/lib/admin-routes"

export function AdminSidebarBrand() {
  const closeMobileSidebar = useCloseMobileSidebar()

  return (
    <Link
      href={ADMIN_ROOT}
      aria-label="Accueil de l'espace admin"
      onClick={closeMobileSidebar}
      className="flex items-center group-data-[collapsible=icon]:justify-center"
    >
      <span className="group-data-[collapsible=icon]:hidden">
        <BrandLogo className="w-30 md:w-37.5" />
      </span>
      <span className="hidden group-data-[collapsible=icon]:flex">
        <BrandMark />
      </span>
    </Link>
  )
}
