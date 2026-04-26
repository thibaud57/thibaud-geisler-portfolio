'use client'

/* eslint-disable react-hooks/static-components -- resolveTagIcon fait un lookup par clé dans les registries immuables Simple Icons / Lucide, pas une création de composant runtime */

import { Badge } from '@/components/ui/badge'
import { resolveTagIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { LocalizedTagRecord } from '@/types/project'

type Props = {
  tag: Pick<LocalizedTagRecord, 'name' | 'icon'>
  className?: string
}

export function TagBadge({ tag, className }: Props) {
  return (
    <Badge variant="secondary" className={cn('gap-1.5', className)}>
      <TagIcon icon={tag.icon} />
      <span>{tag.name}</span>
    </Badge>
  )
}

function TagIcon({ icon }: { icon: string | null }) {
  const Icon = resolveTagIcon(icon)
  if (!Icon) return null
  return <Icon size={14} className="shrink-0" />
}
