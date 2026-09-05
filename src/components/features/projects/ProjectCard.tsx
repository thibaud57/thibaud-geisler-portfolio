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
  preloadCover?: boolean
  // Sur /projets la carte suit directement le h1 (h2) ; sur l'accueil elle vit sous le h2
  // de la section teaser (h3). text-2xl et tracking-normal neutralisent la scale globale h2/h3.
  headingLevel?: 'h2' | 'h3'
}

const MAX_VISIBLE_TAGS = 3

export function ProjectCard({
  project,
  preloadCover = false,
  headingLevel: Heading = 'h3',
}: Props) {
  const t = useTranslations('Projects')
  const visibleProjectTags = project.tags.slice(0, MAX_VISIBLE_TAGS)
  const extraCount = Math.max(0, project.tags.length - MAX_VISIBLE_TAGS)
  const { inProgress } = getProjectTimeline(project.startedAt, project.endedAt)
  const company = project.clientMeta?.company

  return (
    <article className="h-full">
      <Link
        href={`/projets/${project.slug}`}
        className="block h-full rounded-lg transition duration-300 ease-out hover:scale-[1.01] hover:shadow-xl"
        aria-label={t('cardAriaLabel', { title: project.title })}
      >
        <BentoCard>
          <CoverArea
            coverFilename={project.coverFilename}
            title={project.title}
            preload={preloadCover}
            showInProgress={inProgress}
            inProgressLabel={t('inProgress')}
          />

          <div className="flex flex-1 flex-col gap-3 p-6">
            <Heading className="font-display text-2xl font-bold tracking-normal">
              {project.title}
            </Heading>

            <div className="flex flex-wrap items-center gap-2">
              {company ? (
                <ContextBadge logoFilename={company.logoFilename} name={company.name} />
              ) : null}
              <FormatBadges formats={project.formats} />
            </div>

            <p className="text-base leading-relaxed text-muted-foreground line-clamp-3">
              {project.description}
            </p>

            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              {visibleProjectTags.map((projectTag) => (
                <TagBadge key={projectTag.tag.slug} tag={projectTag.tag} />
              ))}
              {extraCount > 0 ? (
                <Badge variant="outline" meta>
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
  preload: boolean
  showInProgress: boolean
  inProgressLabel: string
}

function CoverArea({
  coverFilename,
  title,
  preload,
  showInProgress,
  inProgressLabel,
}: CoverAreaProps) {
  const { showImage, onError } = useImageFallback(coverFilename)

  return (
    <div className="relative h-56 w-full overflow-hidden rounded-t-lg bg-linear-to-br from-primary/20 to-accent/20">
      {showImage && coverFilename ? (
        <>
          <Image
            src={buildAssetUrl(coverFilename)}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            preload={preload}
            className="object-cover"
            onError={onError}
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
        </>
      ) : null}
      {showInProgress ? (
        <Badge
          variant="default"
          meta
          className="absolute right-3 top-3 overflow-visible"
        >
          {inProgressLabel}
          <BorderBeam
            size={30}
            duration={7}
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
    <Badge variant="outline" meta>
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
