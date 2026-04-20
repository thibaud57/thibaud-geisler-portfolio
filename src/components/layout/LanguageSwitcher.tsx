'use client'

import FR from 'country-flag-icons/react/3x2/FR'
import GB from 'country-flag-icons/react/3x2/GB'
import { Globe } from 'lucide-react'
import type { Locale } from 'next-intl'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { cn } from '@/lib/utils'

const localeLabels = {
  fr: 'Français',
  en: 'English',
} satisfies Record<Locale, string>

const localeFlags = {
  fr: FR,
  en: GB,
} satisfies Record<Locale, typeof FR>

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('LanguageSwitcher')

  function handleLocaleChange(nextLocale: Locale) {
    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('ariaLabel')}>
          <Globe className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => {
          const Flag = localeFlags[loc]
          return (
            <DropdownMenuItem
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={cn(locale === loc && 'font-semibold')}
            >
              <Flag aria-hidden/>
              {localeLabels[loc]}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
