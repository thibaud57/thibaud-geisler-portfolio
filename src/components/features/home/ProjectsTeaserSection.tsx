import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { TEASER_LIMIT } from '@/components/features/home/constants'
import { ProjectCard } from '@/components/features/projects/ProjectCard'
import { ProjectsTeaserSkeleton } from '@/components/features/home/ProjectsTeaserSkeleton'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { findManyPublished } from '@/server/queries/projects'

type Props = {
  locale: Locale
}

export async function ProjectsTeaserSection({ locale }: Props) {
  const t = await getTranslations('HomePage.projectsTeaser')

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('title')}
        </h2>
        <p className="max-w-2xl text-base text-muted-foreground">
          {t('subtitle')}
        </p>
      </header>

      <Suspense fallback={<ProjectsTeaserSkeleton />}>
        <ProjectsTeaserGrid locale={locale} />
      </Suspense>

      <div className="flex justify-center">
        <Button asChild variant="ghost" size="lg">
          <Link href="/projets">{t('seeAll')}</Link>
        </Button>
      </div>
    </section>
  )
}

async function ProjectsTeaserGrid({ locale }: Props) {
  const projects = await findManyPublished({ locale })
  const featured = projects.slice(0, TEASER_LIMIT)

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {featured.map((project) => (
        <ProjectCard key={project.slug} project={project} />
      ))}
    </div>
  )
}
