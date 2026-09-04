import { getTranslations } from 'next-intl/server'

import { TagBadge } from '@/components/features/projects/TagBadge'
import { BentoCard, BentoGrid } from '@/components/magicui/bento-grid'
import { MotionItem } from '@/components/ui/motion-item'
import type { Tag, TagKind } from '@/generated/prisma/client'
import type { LocalizedTag } from '@/i18n/localize-content'
import { KIND_ORDER } from '@/lib/tags'
import { cn } from '@/lib/utils'

type Props = {
  tags: LocalizedTag<Tag>[]
  className?: string
}

const KIND_LAYOUT: Record<TagKind, string> = {
  EXPERTISE: 'md:col-span-1 lg:col-span-2',
  AI: 'md:col-span-1 lg:col-span-1',
  LANGUAGE: 'md:col-span-1 lg:col-span-1',
  FRAMEWORK: 'md:col-span-1 lg:col-span-2',
  DATABASE: 'md:col-span-1 lg:col-span-1',
  INFRA: 'md:col-span-1 lg:col-span-2',
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
    <BentoGrid className={cn('md:grid-cols-3', className)}>
      {KIND_ORDER.map((kind, index) => {
        const group = byKind.get(kind)
        if (!group || group.length === 0) return null

        return (
          <MotionItem
            key={kind}
            index={index % 3}
            className={cn('h-full', KIND_LAYOUT[kind])}
          >
            <BentoCard
              className={cn(
                'h-full p-6 transition duration-300 ease-out hover:border-primary/40 sm:p-7',
                KIND_ACCENT[kind],
              )}
            >
              <h3 className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
                {t(kind)}
              </h3>
              <div className="mt-5 flex flex-1 flex-wrap content-start gap-2">
                {group.map((tag) => (
                  <TagBadge key={tag.slug} tag={tag} />
                ))}
              </div>
            </BentoCard>
          </MotionItem>
        )
      })}
    </BentoGrid>
  )
}
