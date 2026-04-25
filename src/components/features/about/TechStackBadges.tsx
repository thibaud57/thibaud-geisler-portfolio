import { getTranslations } from 'next-intl/server'

import { Badge } from '@/components/ui/badge'
import type { Tag, TagKind } from '@/generated/prisma/client'
import type { LocalizedTag } from '@/i18n/localize-content'
import { resolveTagIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'

import { KIND_ORDER } from './tag-kind-order'

type Props = {
  tags: LocalizedTag<Tag>[]
  className?: string
}

export async function TechStackBadges({ tags, className }: Props) {
  const t = await getTranslations('AboutPage.stack.kindLabels')

  const byKind = new Map<TagKind, LocalizedTag<Tag>[]>()
  for (const tag of tags) {
    const bucket = byKind.get(tag.kind) ?? []
    bucket.push(tag)
    byKind.set(tag.kind, bucket)
  }

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {KIND_ORDER.map((kind) => {
        const group = byKind.get(kind)
        if (!group || group.length === 0) return null
        return (
          <div key={kind} className="flex flex-col gap-3">
            <h3 className="text-2xl font-semibold">{t(kind)}</h3>
            <div className="flex flex-wrap gap-2">
              {group.map((tag) => {
                const Icon = resolveTagIcon(tag.icon)
                return (
                  <Badge key={tag.slug} variant="outline" className="gap-1.5 rounded-sm">
                    {Icon ? <Icon size={14} className="shrink-0" /> : null}
                    <span>{tag.name}</span>
                  </Badge>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
