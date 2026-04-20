import { Suspense } from 'react'

import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur border-b border-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* TODO: logo + nav links (Accueil, Services, Projets, À propos, Contact) — Feature 1 Pages publiques portfolio */}
        <div className="flex items-center gap-2 ml-auto">
          <Suspense fallback={<div className="size-9" />}>
            <LanguageSwitcher />
          </Suspense>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
