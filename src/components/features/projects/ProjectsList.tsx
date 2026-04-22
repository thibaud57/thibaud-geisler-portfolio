'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { LocalizedProjectWithRelations } from '@/types/project'
import { BentoGrid } from '@/components/magicui/bento-grid'
import { ProjectCard } from './ProjectCard'
import { ProjectFilters, type ProjectsFilter } from './ProjectFilters'

type Props = {
  projects: LocalizedProjectWithRelations[]
}

export function ProjectsList({ projects }: Props) {
  const t = useTranslations('Projects')
  const [filter, setFilter] = useState<ProjectsFilter>('ALL')

  const visible = filter === 'ALL' ? projects : projects.filter((p) => p.type === filter)

  return (
    <div className="flex flex-col gap-8">
      <ProjectFilters value={filter} onChange={setFilter} />

      {visible.length === 0 ? (
        <p className="text-center text-muted-foreground">{t('emptyState')}</p>
      ) : (
        <BentoGrid>
          {visible.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </BentoGrid>
      )}
    </div>
  )
}
