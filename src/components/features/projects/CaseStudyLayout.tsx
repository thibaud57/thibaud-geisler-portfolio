import Image from 'next/image'

import { MarkdownContent } from '@/components/markdown/MarkdownContent'
import type { LocalizedProjectWithRelations } from '@/types/project'

import { CaseStudyFooter } from './CaseStudyFooter'
import { CaseStudyHeader } from './CaseStudyHeader'
import { TagStackGrouped } from './TagStackGrouped'

type Props = {
  project: LocalizedProjectWithRelations
}

export function CaseStudyLayout({ project }: Props) {
  return (
    <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
      <CaseStudyHeader project={project} />
      {project.caseStudyMarkdown ? (
        <section className="mt-0 mb-12">
          <MarkdownContent
            markdown={project.caseStudyMarkdown}
            components={{
              img: ({ src, alt }) => {
                if (typeof src !== 'string') return null
                return (
                  <figure className="my-8">
                    <Image
                      src={src}
                      alt={alt ?? ''}
                      width={1600}
                      height={900}
                      sizes="(max-width: 768px) 100vw, 1200px"
                      className="h-auto w-full rounded-lg border border-border"
                    />
                    {alt ? (
                      <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                        {alt}
                      </figcaption>
                    ) : null}
                  </figure>
                )
              },
            }}
          />
        </section>
      ) : null}
      <TagStackGrouped tags={project.tags} />
      <CaseStudyFooter project={project} />
    </article>
  )
}
