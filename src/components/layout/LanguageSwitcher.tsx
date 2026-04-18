'use client'

import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function LanguageSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* TODO: implement locale switch with next-intl router */}
        <DropdownMenuItem>FR</DropdownMenuItem>
        <DropdownMenuItem>EN</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
