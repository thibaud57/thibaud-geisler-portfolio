import type { LucideIcon } from 'lucide-react'
import { Bot, Code, GraduationCap } from 'lucide-react'

export const SERVICE_SLUGS = ['ia', 'fullstack', 'formation'] as const

export type ServiceSlug = (typeof SERVICE_SLUGS)[number]

export const SERVICE_ICONS: Record<ServiceSlug, LucideIcon> = {
  ia: Bot,
  fullstack: Code,
  formation: GraduationCap,
}
