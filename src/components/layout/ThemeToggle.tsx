'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

// TODO: remplacer par <AnimatedThemeToggler /> de @magicui lors de l'implémentation navbar
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const t = useTranslations('ThemeToggle')

  // eslint-disable-next-line react-hooks/set-state-in-effect -- pattern mounted next-themes, anti hydration mismatch
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="size-9" />
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t('ariaLabel')}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </Button>
  )
}
