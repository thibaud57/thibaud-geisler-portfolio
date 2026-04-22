import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ProjectWithRelations } from '@/types/project'
import { ProjectsList } from './ProjectsList'

vi.mock('next-intl', async (orig) => {
  const actual = await orig<typeof import('next-intl')>()
  return {
    ...actual,
    useTranslations: () => (key: string) => key,
  }
})

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}))

vi.mock('@/components/magicui/bento-grid', () => ({
  BentoGrid: ({ children }: { children: React.ReactNode }) => <div data-testid="bento-grid">{children}</div>,
  BentoCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

type Company = NonNullable<NonNullable<ProjectWithRelations['clientMeta']>['company']>

function createCompany(overrides?: Partial<Company>): Company {
  const now = new Date()
  return {
    id: 'company-id',
    slug: 'personnel',
    name: 'Personnel',
    logoFilename: null,
    websiteUrl: null,
    sectors: [],
    size: null,
    locations: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function createProject(overrides?: Partial<ProjectWithRelations>): ProjectWithRelations {
  const now = new Date()
  const company = overrides?.clientMeta?.company ?? createCompany()
  return {
    id: 'project-id',
    slug: 'project-slug',
    title: 'Project',
    description: 'Desc',
    type: 'PERSONAL',
    status: 'PUBLISHED',
    formats: [],
    startedAt: null,
    endedAt: null,
    githubUrl: null,
    demoUrl: null,
    coverFilename: null,
    caseStudyMarkdown: null,
    displayOrder: 0,
    createdAt: now,
    updatedAt: now,
    tags: [],
    clientMeta: {
      id: 'clientmeta-id',
      projectId: 'project-id',
      companyId: company.id,
      teamSize: null,
      contractStatus: null,
      workMode: 'REMOTE',
      createdAt: now,
      updatedAt: now,
      company,
    },
    ...overrides,
  }
}

describe('ProjectsList filter', () => {
  it('affiche tous les projets par défaut, filtre correctement CLIENT/PERSONAL', async () => {
    const fixtures: ProjectWithRelations[] = [
      createProject({
        id: '1',
        slug: 'p1',
        title: 'Client Project 1',
        type: 'CLIENT',
        clientMeta: {
          id: 'cm-1',
          projectId: '1',
          companyId: 'c-foyer',
          teamSize: 6,
          contractStatus: 'CDI',
          workMode: 'HYBRIDE',
          createdAt: new Date(),
          updatedAt: new Date(),
          company: createCompany({ id: 'c-foyer', slug: 'foyer', name: 'Foyer Group' }),
        },
      }),
      createProject({ id: '2', slug: 'p2', title: 'Personal Project 1', type: 'PERSONAL' }),
      createProject({
        id: '3',
        slug: 'p3',
        title: 'Client Project 2',
        type: 'CLIENT',
        clientMeta: {
          id: 'cm-3',
          projectId: '3',
          companyId: 'c-acme',
          teamSize: null,
          contractStatus: null,
          workMode: 'REMOTE',
          createdAt: new Date(),
          updatedAt: new Date(),
          company: createCompany({ id: 'c-acme', slug: 'acme', name: 'Acme' }),
        },
      }),
    ]
    const user = userEvent.setup()
    render(<ProjectsList projects={fixtures} />)

    expect(screen.getAllByRole('article')).toHaveLength(3)

    await user.click(screen.getByRole('tab', { name: /client/i }))
    expect(screen.getAllByRole('article')).toHaveLength(2)

    await user.click(screen.getByRole('tab', { name: /personal/i }))
    expect(screen.getAllByRole('article')).toHaveLength(1)

    await user.click(screen.getByRole('tab', { name: /all/i }))
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })
})
