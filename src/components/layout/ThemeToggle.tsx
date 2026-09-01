'use client'

import { Moon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme'

export function ThemeToggle() {
  const { resolvedTheme } = useTheme()
  const t = useTranslations('ThemeToggle')

  // resolvedTheme est undefined au SSR et pendant l'hydratation : placeholder stable
  // jusqu'au premier snapshot client, sans state mounted ni effect.
  if (!resolvedTheme) {
    return (
      <Button variant="ghost" size="icon">
        <Moon className="size-5" />
      </Button>
    )
  }

  return (
    <AnimatedThemeToggler
      variant="hexagon"
      aria-label={t('ariaLabel')}
      className="inline-flex size-9 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-5"
    />
  )
}
