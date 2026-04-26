'use client'

import { Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

import { BrandLogo } from './BrandLogo'
import { NavLinks } from './NavLinks'

type Props = {
  footerSlot: ReactNode
}

export function MobileMenu({ footerSlot }: Props) {
  const t = useTranslations('MobileMenu')
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('ariaLabel')}
          className="md:hidden"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col gap-6 p-6"
      >
        <SheetHeader className="flex-row items-center justify-between p-0">
          <SheetTitle className="sr-only">{t('ariaLabel')}</SheetTitle>
          <BrandLogo />
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="size-5" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <div className="border-t border-border" />
        <NavLinks orientation="vertical" onLinkClick={() => setOpen(false)} />
        <div className="mt-auto flex flex-wrap items-center justify-center gap-3 border-t border-border pt-6">
          {footerSlot}
        </div>
      </SheetContent>
    </Sheet>
  )
}
