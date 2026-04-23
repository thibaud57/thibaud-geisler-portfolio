'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { buildAssetUrl } from '@/lib/assets'
import { getProjectTimeline } from '@/lib/projects'
import type { LocalizedProjectWithRelations } from '@/types/project'
import { Badge } from '@/components/ui/badge'
import { BentoCard } from '@/components/magicui/bento-grid'
import { BorderBeam } from '@/components/magicui/border-beam'
import { FormatBadges } from './FormatBadges'
import { TagBadge } from './TagBadge'
import { useImageFallback } from './useImageFallback'

type Props = {
  project: LocalizedProjectWithRelations
}

const MAX_VISIBLE_TAGS = 3

export function ProjectCard({ project }: Props) {
  const t = useTranslations('Projects')
  const visibleProjectTags = project.tags.slice(0, MAX_VISIBLE_TAGS)
  const extraCount = Math.max(0, project.tags.length - MAX_VISIBLE_TAGS)
  const { inProgress } = getProjectTimeline(project.startedAt, project.endedAt)
  const company = project.clientMeta?.company

  return (
    <article className="h-full">
      <Link
        href={`/projets/${project.slug}`}
        className="block h-full transition-transform duration-300 ease-out hover:scale-[1.01]"
        aria-label={t('cardAriaLabel', { title: project.title })}
      >
        <BentoCard>
          <CoverArea
            coverFilename={project.coverFilename}
            title={project.title}
            showInProgress={inProgress}
            inProgressLabel={t('inProgress')}
          />

          <div className="flex flex-1 flex-col gap-3 p-6">
            <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {project.title}
            </h3>

            <div className="flex flex-wrap items-center gap-1.5">
              {company ? (
                <ContextBadge logoFilename={company.logoFilename} name={company.name} />
              ) : null}
              <FormatBadges formats={project.formats} size="sm" className="gap-1.5" />
            </div>

            <p className="text-base leading-relaxed text-muted-foreground line-clamp-3">
              {project.description}
            </p>

            <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
              {visibleProjectTags.map((projectTag) => (
                <TagBadge key={projectTag.tag.slug} tag={projectTag.tag} />
              ))}
              {extraCount > 0 ? (
                <Badge variant="outline" className="rounded-sm text-xs">
                  +{extraCount}
                </Badge>
              ) : null}
            </div>
          </div>
        </BentoCard>
      </Link>
    </article>
  )
}

type CoverAreaProps = {
  coverFilename: string | null
  title: string
  showInProgress: boolean
  inProgressLabel: string
}

function CoverArea({
  coverFilename,
  title,
  showInProgress,
  inProgressLabel,
}: CoverAreaProps) {
  const { showImage, onError } = useImageFallback(coverFilename)

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-t-lg bg-gradient-to-br from-primary/20 to-accent/20">
      {showImage && coverFilename ? (
        <>
          <Image
            src={buildAssetUrl(coverFilename)}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            onError={onError}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </>
      ) : null}
      {showInProgress ? (
        <Badge
          variant="default"
          className="absolute right-3 top-3 overflow-visible text-[10px] font-medium uppercase tracking-wider"
        >
          {inProgressLabel}
          <BorderBeam
            size={30}
            duration={4}
            borderWidth={2}
            colorFrom="var(--shine)"
            colorTo="transparent"
          />
        </Badge>
      ) : null}
    </div>
  )
}

type ContextBadgeProps = {
  logoFilename: string | null
  name: string
}

function ContextBadge({ logoFilename, name }: ContextBadgeProps) {
  const { showImage, onError } = useImageFallback(logoFilename)

  return (
    <Badge
      variant="outline"
      className="gap-1.5 text-[10px] font-medium uppercase tracking-wider"
    >
      {showImage && logoFilename ? (
        <Image
          src={buildAssetUrl(logoFilename)}
          alt={name}
          width={14}
          height={14}
          className="rounded object-contain"
          onError={onError}
        />
      ) : null}
      {name}
    </Badge>
  )
}
