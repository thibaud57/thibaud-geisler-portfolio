'use client'

import type { VariantProps } from 'class-variance-authority'
import { useTranslations } from 'next-intl'
import { useConsentManager } from '@c15t/nextjs'

import { Button, buttonVariants } from '@/components/ui/button'

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
  const { setActiveUI } = useConsentManager()
  const t = useTranslations('Cookies')

  return (
    <Button
      variant={variant}
      onClick={() => setActiveUI('dialog')}
      className={className}
    >
      {label ?? t('openManagerLabel')}
    </Button>
  )
}
