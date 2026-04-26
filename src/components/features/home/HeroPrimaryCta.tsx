'use client'

import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { useRouter } from '@/i18n/navigation'

type Props = {
  label: string
}

export function HeroPrimaryCta({ label }: Props) {
  const router = useRouter()

  return (
    <ShimmerButton onClick={() => router.push('/contact')} background="var(--primary)">
      <span className="text-base font-medium text-primary-foreground">{label}</span>
    </ShimmerButton>
  )
}
