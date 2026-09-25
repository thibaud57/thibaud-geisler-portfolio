"use client"

import { LogOut } from "lucide-react"

import { SidebarMenuButton } from "@/components/ui/sidebar"
import { useAdminSignOut } from "@/hooks/use-admin-sign-out"

export function AdminSignOutButton() {
  const signOut = useAdminSignOut()

  return (
    <SidebarMenuButton onClick={signOut} tooltip="Déconnexion">
      <LogOut />
      <span>Déconnexion</span>
    </SidebarMenuButton>
  )
}
