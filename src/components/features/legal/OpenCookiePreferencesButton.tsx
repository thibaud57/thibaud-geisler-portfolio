'use client'

import type { VariantProps } from 'class-variance-authority'
import { useTranslations } from 'next-intl'
import { useConsentManager } from '@c15t/nextjs'

import { Button, buttonVariants } from '@/components/ui/button'

function useOpenCookiePreferences() {
  const { setActiveUI } = useConsentManager()
  const t = useTranslations('Cookies')
  return {
    open: () => setActiveUI('dialog'),
    defaultLabel: t('openManagerLabel'),
  }
}

type Props = {
  className?: string
  variant?: VariantProps<typeof buttonVariants>['variant']
  label?: string
}

export function OpenCookiePreferencesButton({
  className,
  variant = 'outline',
  label,
}: Props) {
  const { open, defaultLabel } = useOpenCookiePreferences()

  return (
    <Button variant={variant} onClick={open} className={className}>
      {label ?? defaultLabel}
    </Button>
  )
}

type LinkProps = {
  className?: string
  label?: string
}

export function OpenCookiePreferencesLink({ className, label }: LinkProps) {
  const { open, defaultLabel } = useOpenCookiePreferences()

  return (
    <button type="button" onClick={open} className={className}>
      {label ?? defaultLabel}
    </button>
  )
}
