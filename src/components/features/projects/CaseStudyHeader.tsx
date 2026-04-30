import Image from 'next/image'
import { User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { buildAssetUrl } from '@/lib/assets'
import { formatDurationRange, getProjectTimeline } from '@/lib/projects'
import type { LocalizedProjectWithRelations } from '@/types/project'
import { FormatBadges } from './FormatBadges'

type Props = {
  project: LocalizedProjectWithRelations
}

export function CaseStudyHeader({ project }: Props) {
  const t = useTranslations('Projects.caseStudy')

  const timeline = getProjectTimeline(project.startedAt, project.endedAt)
  const { startYear, endYear, inProgress } = timeline
  const endLabel = endYear?.toString() ?? (inProgress ? t('inProgress') : '')
  const { company, teamSize, contractStatus: contract, workMode } = project.clientMeta ?? {}

  const durationValue = formatDurationRange(timeline, t('inProgress'))

  return (
    <header>
      {startYear !== null ? (
        <div className="mb-6 flex items-center gap-3" aria-label={t('meta.duration')}>
          <TimelineMarker label={String(startYear)} />
          <span
            className="h-px flex-1 max-w-24 bg-linear-to-r from-primary/60 to-primary/10"
            aria-hidden="true"
          />
          <TimelineMarker label={endLabel} variant={inProgress ? 'active' : 'default'} />
        </div>
      ) : null}

      <h1>{project.title}</h1>

      <FormatBadges formats={project.formats} className="mt-5" />

      <p className="mt-8 border-l-2 border-primary/60 pl-5 text-xl font-light leading-relaxed text-foreground/90 sm:text-2xl">
        {project.description}
      </p>

      {project.coverFilename ? (
        <figure className="relative mt-10 aspect-[16/7] w-full overflow-hidden rounded-2xl border border-border">
          <Image
            src={buildAssetUrl(project.coverFilename)}
            alt={project.title}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            preload
            className="object-cover"
          />
        </figure>
      ) : (
        <div
          aria-hidden="true"
          className="mt-10 aspect-[16/7] w-full rounded-2xl border border-border bg-linear-to-br from-primary/15 via-accent/10 to-background"
        />
      )}

      {company ? (
        <div className="mt-10 flex w-fit flex-col gap-4 rounded-xl border border-border bg-muted/30 p-5 sm:flex-row sm:items-center">
          {company.logoFilename ? (
            <Image
              src={buildAssetUrl(company.logoFilename)}
              alt={company.name}
              width={56}
              height={56}
              className="rounded-md object-contain"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-md border border-border bg-muted">
              <User className="size-7 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            {company.websiteUrl ? (
              <a
                href={company.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl font-semibold hover:text-primary"
              >
                {company.name}
              </a>
            ) : (
              <span className="text-xl font-semibold">{company.name}</span>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {company.sectors.length > 0 ? (
                <span>{company.sectors.map((s) => t(`sector.${s}`)).join(' / ')}</span>
              ) : null}
              {company.size ? <span>{t(`companySize.${company.size}`)}</span> : null}
            </div>
          </div>
        </div>
      ) : null}

      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-border py-8 text-sm md:grid-cols-4">
        {teamSize ? (
          <MetaItem label={t('meta.teamSize')} value={t('meta.teamSizeValue', { count: teamSize })} />
        ) : null}
        {contract ? <MetaItem label={t('meta.contract')} value={t(`contractStatus.${contract}`)} /> : null}
        {workMode ? <MetaItem label={t('meta.workMode')} value={t(`workMode.${workMode}`)} /> : null}
        {durationValue ? <MetaItem label={t('meta.duration')} value={durationValue} /> : null}
      </dl>
    </header>
  )
}

function TimelineMarker({
  label,
  variant = 'default',
}: {
  label: string
  variant?: 'default' | 'active'
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          'size-2.5 rounded-full bg-primary',
          variant === 'active' && 'animate-pulse ring-4 ring-primary/20',
        )}
      />
      <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}
