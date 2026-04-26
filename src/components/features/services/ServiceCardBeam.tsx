'use client'

import { BorderBeam } from '@/components/magicui/border-beam'

export function ServiceCardBeam() {
  return (
    <BorderBeam
      size={80}
      duration={7}
      borderWidth={2}
      colorFrom="var(--primary)"
      colorTo="transparent"
    />
  )
}
