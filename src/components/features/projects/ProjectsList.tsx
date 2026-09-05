'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { LocalizedProjectWithRelations } from '@/types/project'
import { BentoGrid } from '@/components/magicui/bento-grid'
import { MotionItem } from '@/components/ui/motion-item'
import { ProjectCard } from './ProjectCard'
import { ProjectFilters, type ProjectsFilter } from './ProjectFilters'

const ABOVE_THE_FOLD_COUNT = 3

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
          {visible.map((project, index) => (
            <MotionItem
              key={project.slug}
              index={index % 3}
              animate={index >= ABOVE_THE_FOLD_COUNT}
              className="h-full"
            >
              <ProjectCard
                project={project}
                preloadCover={index === 0}
                headingLevel="h2"
              />
            </MotionItem>
          ))}
        </BentoGrid>
      )}
    </div>
  )
}
