import type { Locale } from 'next-intl'

type TagBilingual = {
  nameFr: string
  nameEn: string
}

type ProjectBilingual = {
  titleFr: string
  titleEn: string
  descriptionFr: string
  descriptionEn: string
  caseStudyMarkdownFr: string | null
  caseStudyMarkdownEn: string | null
}

export type LocalizedTag<T extends TagBilingual> = Omit<T, 'nameFr' | 'nameEn'> & {
  name: string
}

type ProjectTagBilingual<TTag extends TagBilingual> = {
  tag: TTag
}

export type LocalizedProject<
  TTag extends TagBilingual,
  T extends ProjectBilingual & { tags: ProjectTagBilingual<TTag>[] },
> = Omit<
  T,
  'titleFr' | 'titleEn' | 'descriptionFr' | 'descriptionEn' | 'caseStudyMarkdownFr' | 'caseStudyMarkdownEn' | 'tags'
> & {
  title: string
  description: string
  caseStudyMarkdown: string | null
  tags: Array<Omit<T['tags'][number], 'tag'> & { tag: LocalizedTag<TTag> }>
}

export function localizeTag<T extends TagBilingual>(tag: T, locale: Locale): LocalizedTag<T> {
  const { nameFr, nameEn, ...rest } = tag
  return {
    ...rest,
    name: locale === 'fr' ? nameFr : nameEn,
  } as LocalizedTag<T>
}

export function localizeProject<
  TTag extends TagBilingual,
  T extends ProjectBilingual & { tags: ProjectTagBilingual<TTag>[] },
>(project: T, locale: Locale): LocalizedProject<TTag, T> {
  const {
    titleFr,
    titleEn,
    descriptionFr,
    descriptionEn,
    caseStudyMarkdownFr,
    caseStudyMarkdownEn,
    tags,
    ...rest
  } = project
  return {
    ...rest,
    title: locale === 'fr' ? titleFr : titleEn,
    description: locale === 'fr' ? descriptionFr : descriptionEn,
    caseStudyMarkdown: locale === 'fr' ? caseStudyMarkdownFr : caseStudyMarkdownEn,
    tags: tags.map((pt) => ({ ...pt, tag: localizeTag(pt.tag, locale) })),
  } as LocalizedProject<TTag, T>
}
