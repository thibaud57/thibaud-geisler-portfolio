'use client'

import { Moon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const t = useTranslations('ThemeToggle')

  // eslint-disable-next-line react-hooks/set-state-in-effect -- pattern mounted next-themes, anti hydration mismatch
  useEffect(() => setMounted(true), [])

  if (!mounted) {
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
