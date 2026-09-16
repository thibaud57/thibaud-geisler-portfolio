"use client"

import { Moon } from "lucide-react"

import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/lib/theme"

// Le libellé arrive en prop : l'admin, hors du segment [locale], n'a pas de provider next-intl
export function ThemeToggle({ label }: { label: string }) {
  const { resolvedTheme } = useTheme()

  // resolvedTheme est undefined au SSR et pendant l'hydratation : placeholder stable
  // jusqu'au premier snapshot client, sans state mounted ni effect.
  if (!resolvedTheme) {
    return (
      <Button variant="ghost" size="icon-lg" aria-label={label}>
        <Moon className="size-5" />
      </Button>
    )
  }

  return (
    <AnimatedThemeToggler
      variant="hexagon"
      duration={200}
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-5"
    />
  )
}
