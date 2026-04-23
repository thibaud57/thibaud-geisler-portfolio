// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}))

import { prisma, resetDatabase } from '@/lib/prisma-test-setup'
import { generateStaticParams } from './page'

describe('generateStaticParams — case study', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne uniquement les slugs status=PUBLISHED × 2 locales (exclut DRAFT et ARCHIVED)', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'pub',   titleFr: 'Published', titleEn: 'Published', descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'PUBLISHED' },
        { slug: 'draft', titleFr: 'Draft',     titleEn: 'Draft',     descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'DRAFT' },
        { slug: 'arch',  titleFr: 'Archived',  titleEn: 'Archived',  descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'ARCHIVED' },
      ],
    })

    const params = await generateStaticParams()

    expect(params).toHaveLength(2)
    expect(params).toEqual(
      expect.arrayContaining([
        { locale: 'fr', slug: 'pub' },
        { locale: 'en', slug: 'pub' },
      ]),
    )

    const slugs = params.map((p) => p.slug)
    expect(slugs).not.toContain('draft')
    expect(slugs).not.toContain('arch')
  })
})
