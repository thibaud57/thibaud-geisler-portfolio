import { useTranslations } from 'next-intl'
import type { TagKind } from '@/generated/prisma/client'
import type { LocalizedProjectTag } from '@/types/project'
import { TagBadge } from './TagBadge'

type Props = {
  tags: LocalizedProjectTag[]
}

const KIND_ORDER: TagKind[] = [
  'EXPERTISE',
  'LANGUAGE',
  'FRAMEWORK',
  'DATABASE',
  'AI',
  'INFRA',
]

export function TagStackGrouped({ tags }: Props) {
  const tCaseStudy = useTranslations('Projects.caseStudy')
  const tKind = useTranslations('Projects.caseStudy.kind')

  if (tags.length === 0) return null

  const grouped = tags.reduce<Partial<Record<TagKind, LocalizedProjectTag[]>>>(
    (acc, projectTag) => {
      const kind = projectTag.tag.kind
      const list = acc[kind] ?? []
      list.push(projectTag)
      acc[kind] = list
      return acc
    },
    {},
  )

  const orderedGroups = KIND_ORDER.flatMap((kind) => {
    const groupTags = grouped[kind]
    return groupTags && groupTags.length > 0 ? [[kind, groupTags] as const] : []
  })

  return (
    <section className="my-16" aria-labelledby="case-study-stack-title">
      <h2
        id="case-study-stack-title"
        className="mb-8 text-3xl font-semibold tracking-tight sm:text-4xl"
      >
        {tCaseStudy('stackTitle')}
      </h2>

      <div className="flex flex-col gap-8">
        {orderedGroups.map(([kind, groupTags]) => (
          <div key={kind} className="grid gap-3 sm:grid-cols-[9rem_1fr] sm:gap-6">
            <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground sm:pt-1.5">
              {tKind(kind)}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {groupTags.map((projectTag) => (
                <TagBadge key={projectTag.tag.slug} tag={projectTag.tag} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
