'use client'

import { Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

export function MobileMenu() {
  const t = useTranslations('MobileMenu')

  return (
    <Sheet>
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
      <SheetContent side="right">
        {/* TODO: implement mobile nav links */}
      </SheetContent>
    </Sheet>
  )
}
