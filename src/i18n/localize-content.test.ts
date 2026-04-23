import { describe, expect, it } from 'vitest'
import { localizeProject, localizeTag } from './localize-content'

const baseTag = {
  id: 'tag-1',
  slug: 'docker',
  nameFr: 'Docker',
  nameEn: 'Docker',
  kind: 'INFRA' as const,
  icon: 'simple-icons:docker',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const baseProject = {
  id: 'proj-1',
  slug: 'digiclaims',
  titleFr: 'Digiclaims - Gestion Sinistres',
  titleEn: 'Digiclaims - Claims Management',
  descriptionFr: 'Description FR',
  descriptionEn: 'Description EN',
  caseStudyMarkdownFr: '# Contexte FR',
  caseStudyMarkdownEn: '# Context EN',
  type: 'CLIENT' as const,
  status: 'PUBLISHED' as const,
  formats: [],
  startedAt: null,
  endedAt: null,
  githubUrl: null,
  demoUrl: null,
  coverFilename: null,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
  clientMeta: null,
}

describe('localizeTag', () => {
  it('retourne name = nameFr et omet nameFr/nameEn quand locale = fr', () => {
    const result = localizeTag(baseTag, 'fr')
    expect(result.name).toBe('Docker')
    expect(result).not.toHaveProperty('nameFr')
    expect(result).not.toHaveProperty('nameEn')
    expect(result.slug).toBe('docker')
    expect(result.icon).toBe('simple-icons:docker')
  })

  it('retourne name = nameEn quand locale = en', () => {
    const tag = { ...baseTag, nameFr: 'Automatisation', nameEn: 'Automation' }
    expect(localizeTag(tag, 'en').name).toBe('Automation')
    expect(localizeTag(tag, 'fr').name).toBe('Automatisation')
  })
})

describe('localizeProject', () => {
  it('résout title/description/caseStudyMarkdown depuis les champs FR quand locale = fr', () => {
    const result = localizeProject(baseProject, 'fr')
    expect(result.title).toBe('Digiclaims - Gestion Sinistres')
    expect(result.description).toBe('Description FR')
    expect(result.caseStudyMarkdown).toBe('# Contexte FR')
    expect(result).not.toHaveProperty('titleFr')
    expect(result).not.toHaveProperty('titleEn')
    expect(result).not.toHaveProperty('descriptionFr')
    expect(result).not.toHaveProperty('caseStudyMarkdownFr')
  })

  it('résout title/description/caseStudyMarkdown depuis les champs EN quand locale = en', () => {
    const result = localizeProject(baseProject, 'en')
    expect(result.title).toBe('Digiclaims - Claims Management')
    expect(result.description).toBe('Description EN')
    expect(result.caseStudyMarkdown).toBe('# Context EN')
  })

  it('applique localizeTag récursivement sur les tags nested et préserve displayOrder', () => {
    const project = {
      ...baseProject,
      tags: [
        {
          projectId: 'proj-1',
          tagId: 'tag-1',
          displayOrder: 0,
          tag: { ...baseTag, nameFr: 'Automatisation', nameEn: 'Automation' },
        },
        {
          projectId: 'proj-1',
          tagId: 'tag-2',
          displayOrder: 1,
          tag: { ...baseTag, id: 'tag-2', slug: 'scraping', nameFr: 'Scraping', nameEn: 'Scraping' },
        },
      ],
    }
    const result = localizeProject(project, 'en')
    expect(result.tags).toHaveLength(2)
    expect(result.tags[0]?.displayOrder).toBe(0)
    expect(result.tags[0]?.tag.name).toBe('Automation')
    expect(result.tags[0]?.tag).not.toHaveProperty('nameFr')
    expect(result.tags[1]?.tag.name).toBe('Scraping')
  })
})
