"use client"

import { LogOut } from "lucide-react"
import { getImageProps } from "next/image"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAdminSignOut } from "@/hooks/use-admin-sign-out"

export interface AdminAccount {
  name: string
  email: string
  image: string | null
}

function initials({ name, email }: AdminAccount) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0))
    .join("")
  return (letters || email.charAt(0)).slice(0, 2).toUpperCase()
}

export function AdminUserMenu({ account }: { account: AdminAccount }) {
  const signOut = useAdminSignOut()
  // Passe la photo Google par l'optimiseur de next/image, que le <img> d'AvatarImage ne sait pas appeler
  const photo = account.image
    ? getImageProps({ src: account.image, alt: "", width: 24, height: 24 }).props
    : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* 36px et avatar de 24px : la taille de la bascule de thème voisine et de son icône */}
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Menu du compte">
          <Avatar size="sm">
            {photo && <AvatarImage {...photo} />}
            <AvatarFallback>{initials(account)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      {/* w-auto : le registry cale le menu sur la largeur du déclencheur, qui tronquerait l'email */}
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuLabel className="grid font-normal">
          <span className="font-medium">{account.name}</span>
          <span className="text-xs text-muted-foreground">{account.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
