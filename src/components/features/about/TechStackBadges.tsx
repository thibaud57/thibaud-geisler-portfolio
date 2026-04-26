import { getTranslations } from 'next-intl/server'

import { BentoCard, BentoGrid } from '@/components/magicui/bento-grid'
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

const KIND_LAYOUT: Record<TagKind, string> = {
  EXPERTISE: 'md:col-span-2 lg:col-span-2',
  AI: 'md:col-span-2 lg:col-span-1',
  LANGUAGE: 'md:col-span-1 lg:col-span-1',
  FRAMEWORK: 'md:col-span-1 lg:col-span-2',
  DATABASE: 'md:col-span-1 lg:col-span-1',
  INFRA: 'md:col-span-2 lg:col-span-2',
}

const KIND_ACCENT: Partial<Record<TagKind, string>> = {
  EXPERTISE: 'border-primary/20',
  AI: 'border-primary/30 bg-accent/40',
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
    <BentoGrid className={cn('grid-cols-1 md:grid-cols-3 lg:grid-cols-3', className)}>
      {KIND_ORDER.map((kind) => {
        const group = byKind.get(kind)
        if (!group || group.length === 0) return null

        return (
          <BentoCard
            key={kind}
            className={cn(
              'relative p-6 sm:p-7',
              KIND_LAYOUT[kind],
              KIND_ACCENT[kind],
            )}
          >
            <h3 className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
              {t(kind)}
            </h3>
            <div className="mt-5 flex flex-1 flex-wrap gap-2">
              {group.map((tag) => {
                const Icon = resolveTagIcon(tag.icon)
                return (
                  <Badge
                    key={tag.slug}
                    variant="outline"
                    className="gap-1.5 bg-background/60"
                  >
                    {Icon ? <Icon size={14} className="shrink-0" /> : null}
                    <span>{tag.name}</span>
                  </Badge>
                )
              })}
            </div>
          </BentoCard>
        )
      })}
    </BentoGrid>
  )
}
