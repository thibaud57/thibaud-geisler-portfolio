'use client'

import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

import { NAV_ITEMS } from '@/config/nav-items'

type Props = {
  orientation: 'horizontal' | 'vertical'
  onLinkClick?: () => void
  className?: string
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLinks({ orientation, onLinkClick, className }: Props) {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const isVertical = orientation === 'vertical'

  return (
    <ul
      className={cn(
        isVertical
          ? 'flex flex-col text-base font-medium'
          : 'flex items-center gap-6 text-sm font-medium',
        className,
      )}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <li key={item.slug}>
            <Link
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                'transition',
                isVertical && 'block py-3',
                active
                  ? 'font-semibold text-primary'
                  : 'text-foreground hover:text-primary',
              )}
            >
              {t(item.slug)}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
