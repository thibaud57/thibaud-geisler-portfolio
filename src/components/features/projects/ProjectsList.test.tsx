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

const baseProject: ProjectWithRelations = {
  id: 'id',
  slug: 'slug',
  title: 'Project',
  description: 'Desc',
  type: 'CLIENT',
  status: 'PUBLISHED',
  formats: [],
  startedAt: null,
  endedAt: null,
  githubUrl: null,
  demoUrl: null,
  coverFilename: null,
  caseStudyMarkdown: null,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
  clientMeta: null,
}

const fixtures: ProjectWithRelations[] = [
  { ...baseProject, id: '1', slug: 'p1', title: 'Client Project 1', type: 'CLIENT' },
  { ...baseProject, id: '2', slug: 'p2', title: 'Personal Project 1', type: 'PERSONAL' },
  { ...baseProject, id: '3', slug: 'p3', title: 'Client Project 2', type: 'CLIENT' },
]

describe('ProjectsList filter', () => {
  it('affiche tous les projets par défaut, filtre correctement CLIENT/PERSONAL', async () => {
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
