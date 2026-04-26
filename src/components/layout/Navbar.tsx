import { Suspense } from 'react'
import { getLocale, getTranslations } from 'next-intl/server'

import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'
import { SocialLinks } from '@/components/features/contact/SocialLinks'
import { Link } from '@/i18n/navigation'

import { BrandLogo } from './BrandLogo'
import { LanguageSwitcher } from './LanguageSwitcher'
import { MobileMenu } from './MobileMenu'
import { NavLinks } from './NavLinks'
import { ThemeToggle } from './ThemeToggle'

export async function Navbar() {
  const t = await getTranslations('Nav')
  const locale = await getLocale()

  const mobileFooter = (
    <>
      <SocialLinks />
      <DownloadCvButton locale={locale} variant="outline" size="sm" />
    </>
  )

  return (
    <header className="sticky top-0 z-50 backdrop-blur border-b border-border bg-background/80">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-6">
        <Suspense fallback={<div className="h-10 w-[180px]" />}>
          <Link href="/" aria-label={t('home')} className="shrink-0">
            <BrandLogo priority />
          </Link>
        </Suspense>

        <Suspense fallback={<div className="hidden md:flex h-6 w-64" />}>
          <NavLinks orientation="horizontal" className="hidden md:flex" />
        </Suspense>

        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <Suspense fallback={<div className="size-9" />}>
            <LanguageSwitcher />
          </Suspense>
          <ThemeToggle />
          <Suspense fallback={<div className="size-9 md:hidden" />}>
            <MobileMenu footerSlot={mobileFooter} />
          </Suspense>
        </div>
      </nav>
    </header>
  )
}
