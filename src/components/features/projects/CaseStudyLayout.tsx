import type { LocalizedProjectWithRelations } from '@/types/project'
import { CaseStudyHeader } from './CaseStudyHeader'
import { TagStackGrouped } from './TagStackGrouped'
import { CaseStudyMarkdown } from './CaseStudyMarkdown'
import { CaseStudyFooter } from './CaseStudyFooter'

type Props = {
  project: LocalizedProjectWithRelations
}

export function CaseStudyLayout({ project }: Props) {
  return (
    <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
      <CaseStudyHeader project={project} />
      {project.caseStudyMarkdown ? (
        <CaseStudyMarkdown markdown={project.caseStudyMarkdown} />
      ) : null}
      <TagStackGrouped tags={project.tags} />
      <CaseStudyFooter project={project} />
    </article>
  )
}
