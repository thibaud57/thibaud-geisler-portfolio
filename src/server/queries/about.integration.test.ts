import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}))

import { prisma, resetDatabase } from '@/lib/prisma-test-setup'
import {
  countClientsSupported,
  countMissionsDelivered,
  findAllTags,
  HIDDEN_ON_ABOUT_TAG_SLUGS,
} from '@/server/queries/about'

describe('countMissionsDelivered', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne 0 quand aucun projet ne match', async () => {
    const result = await countMissionsDelivered()

    expect(result).toBe(0)
  })

  it('somme deliverablesCount des projets PUBLISHED + CLIENT + endedAt:not null', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'a', titleFr: 'A', titleEn: 'A', descriptionFr: 'd', descriptionEn: 'd', type: 'CLIENT', status: 'PUBLISHED', endedAt: new Date(), deliverablesCount: 3 },
        { slug: 'b', titleFr: 'B', titleEn: 'B', descriptionFr: 'd', descriptionEn: 'd', type: 'CLIENT', status: 'PUBLISHED', endedAt: new Date(), deliverablesCount: 2 },
      ],
    })

    const result = await countMissionsDelivered()

    expect(result).toBe(5)
  })

  it('exclut les projets DRAFT et ARCHIVED', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'pub',   titleFr: 'P', titleEn: 'P', descriptionFr: 'd', descriptionEn: 'd', type: 'CLIENT', status: 'PUBLISHED', endedAt: new Date(), deliverablesCount: 5 },
        { slug: 'draft', titleFr: 'D', titleEn: 'D', descriptionFr: 'd', descriptionEn: 'd', type: 'CLIENT', status: 'DRAFT',     endedAt: new Date(), deliverablesCount: 100 },
        { slug: 'arch',  titleFr: 'A', titleEn: 'A', descriptionFr: 'd', descriptionEn: 'd', type: 'CLIENT', status: 'ARCHIVED',  endedAt: new Date(), deliverablesCount: 100 },
      ],
    })

    const result = await countMissionsDelivered()

    expect(result).toBe(5)
  })

  it('exclut les projets PERSONAL', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'cli',   titleFr: 'C', titleEn: 'C', descriptionFr: 'd', descriptionEn: 'd', type: 'CLIENT',   status: 'PUBLISHED', endedAt: new Date(), deliverablesCount: 3 },
        { slug: 'perso', titleFr: 'P', titleEn: 'P', descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'PUBLISHED', endedAt: new Date(), deliverablesCount: 100 },
      ],
    })

    const result = await countMissionsDelivered()

    expect(result).toBe(3)
  })

  it('exclut les projets en cours (endedAt: null)', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'done', titleFr: 'D', titleEn: 'D', descriptionFr: 'd', descriptionEn: 'd', type: 'CLIENT', status: 'PUBLISHED', endedAt: new Date(), deliverablesCount: 4 },
        { slug: 'wip',  titleFr: 'W', titleEn: 'W', descriptionFr: 'd', descriptionEn: 'd', type: 'CLIENT', status: 'PUBLISHED', endedAt: null,        deliverablesCount: 100 },
      ],
    })

    const result = await countMissionsDelivered()

    expect(result).toBe(4)
  })
})

describe('countClientsSupported', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne 0 quand aucune Company ne match', async () => {
    const result = await countClientsSupported()

    expect(result).toBe(0)
  })

  it('compte les Company distinctes liées à un projet PUBLISHED + CLIENT', async () => {
    await prisma.company.createMany({
      data: [
        { slug: 'foyer',     name: 'Foyer',     sectors: ['ASSURANCE'], size: 'ETI', locations: ['LUXEMBOURG'] },
        { slug: 'paysystem', name: 'PaySystem', sectors: ['SAAS'],      size: 'TPE', locations: ['LUXEMBOURG'] },
      ],
    })
    await prisma.project.create({
      data: {
        slug: 'p1', titleFr: 'P1', titleEn: 'P1', descriptionFr: 'd', descriptionEn: 'd',
        type: 'CLIENT', status: 'PUBLISHED',
        clientMeta: { create: { workMode: 'REMOTE', company: { connect: { slug: 'foyer' } } } },
      },
    })
    await prisma.project.create({
      data: {
        slug: 'p2', titleFr: 'P2', titleEn: 'P2', descriptionFr: 'd', descriptionEn: 'd',
        type: 'CLIENT', status: 'PUBLISHED',
        clientMeta: { create: { workMode: 'REMOTE', company: { connect: { slug: 'paysystem' } } } },
      },
    })

    const result = await countClientsSupported()

    expect(result).toBe(2)
  })

  it('compte une seule fois une Company avec plusieurs projets clients', async () => {
    await prisma.company.create({
      data: { slug: 'foyer', name: 'Foyer', sectors: ['ASSURANCE'], size: 'ETI', locations: ['LUXEMBOURG'] },
    })
    await prisma.project.create({
      data: {
        slug: 'p1', titleFr: 'P1', titleEn: 'P1', descriptionFr: 'd', descriptionEn: 'd',
        type: 'CLIENT', status: 'PUBLISHED',
        clientMeta: { create: { workMode: 'REMOTE', company: { connect: { slug: 'foyer' } } } },
      },
    })
    await prisma.project.create({
      data: {
        slug: 'p2', titleFr: 'P2', titleEn: 'P2', descriptionFr: 'd', descriptionEn: 'd',
        type: 'CLIENT', status: 'PUBLISHED',
        clientMeta: { create: { workMode: 'REMOTE', company: { connect: { slug: 'foyer' } } } },
      },
    })

    const result = await countClientsSupported()

    expect(result).toBe(1)
  })

  it("exclut les Company qui n'ont que des projets PERSONAL", async () => {
    await prisma.company.create({
      data: { slug: 'personnel', name: 'Personnel', sectors: [], size: null, locations: [] },
    })
    await prisma.project.create({
      data: {
        slug: 'perso', titleFr: 'Perso', titleEn: 'Perso', descriptionFr: 'd', descriptionEn: 'd',
        type: 'PERSONAL', status: 'PUBLISHED',
        clientMeta: { create: { workMode: 'REMOTE', company: { connect: { slug: 'personnel' } } } },
      },
    })

    const result = await countClientsSupported()

    expect(result).toBe(0)
  })

  it('exclut les Company sans clientMetas', async () => {
    await prisma.company.create({
      data: { slug: 'orphan', name: 'Orphan', sectors: [], size: null, locations: [] },
    })

    const result = await countClientsSupported()

    expect(result).toBe(0)
  })
})

describe('findAllTags', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne les tags triés par displayOrder asc puis slug asc', async () => {
    await prisma.tag.createMany({
      data: [
        { slug: 'a', nameFr: 'A', nameEn: 'A', kind: 'FRAMEWORK', displayOrder: 5 },
        { slug: 'b', nameFr: 'B', nameEn: 'B', kind: 'FRAMEWORK', displayOrder: 0 },
        { slug: 'c', nameFr: 'C', nameEn: 'C', kind: 'FRAMEWORK', displayOrder: 0 },
      ],
    })

    const result = await findAllTags('fr')

    expect(result.map((t) => t.slug)).toEqual(['b', 'c', 'a'])
  })

  it.each(HIDDEN_ON_ABOUT_TAG_SLUGS.map((slug) => [slug] as const))(
    'exclut le tag masqué %s même publié',
    async (hiddenSlug) => {
      await prisma.tag.createMany({
        data: [
          { slug: hiddenSlug, nameFr: 'H', nameEn: 'H', kind: 'INFRA' },
          { slug: 'visible',  nameFr: 'V', nameEn: 'V', kind: 'INFRA' },
        ],
      })

      const result = await findAllTags('fr')

      expect(result.map((t) => t.slug)).toEqual(['visible'])
    },
  )

  it("retourne les tags même s'ils ne sont liés à aucun projet (orphelin)", async () => {
    await prisma.tag.create({
      data: { slug: 'rag', nameFr: 'RAG', nameEn: 'RAG', kind: 'AI' },
    })

    const result = await findAllTags('fr')

    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('rag')
  })

  it('localise nameFr/nameEn vers name selon la locale', async () => {
    await prisma.tag.create({
      data: { slug: 'k', nameFr: 'NomFR', nameEn: 'NameEN', kind: 'INFRA' },
    })

    const fr = await findAllTags('fr')
    const en = await findAllTags('en')

    expect(fr[0]?.name).toBe('NomFR')
    expect(en[0]?.name).toBe('NameEN')
    expect(fr[0]).not.toHaveProperty('nameFr')
    expect(fr[0]).not.toHaveProperty('nameEn')
  })
})
