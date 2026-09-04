'use client'

/* eslint-disable react-hooks/static-components -- resolveTagIcon fait un lookup par clé dans les registries immuables Simple Icons / Lucide, pas une création de composant runtime */

import { Badge } from '@/components/ui/badge'
import { resolveTagIcon } from '@/lib/icons'
import type { LocalizedTagRecord } from '@/types/project'

type Props = {
  tag: Pick<LocalizedTagRecord, 'name' | 'icon'>
  className?: string
}

export function TagBadge({ tag, className }: Props) {
  return (
    <Badge variant="secondary" className={className}>
      <TagIcon icon={tag.icon} />
      <span>{tag.name}</span>
    </Badge>
  )
}

function TagIcon({ icon }: { icon: string | null }) {
  const Icon = resolveTagIcon(icon)
  if (!Icon) return null
  return <Icon className="shrink-0" />
}
