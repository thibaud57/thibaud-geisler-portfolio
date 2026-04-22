// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDatabase } from '@/lib/prisma-test-setup'
import { findManyPublished, findPublishedBySlug } from '@/server/queries/projects'

describe('findManyPublished', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne uniquement les projets status=PUBLISHED (exclut DRAFT et ARCHIVED)', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'pub', title: 'Pub', description: 'd', type: 'PERSONAL', status: 'PUBLISHED' },
        { slug: 'draft', title: 'Draft', description: 'd', type: 'PERSONAL', status: 'DRAFT' },
        { slug: 'arch', title: 'Arch', description: 'd', type: 'PERSONAL', status: 'ARCHIVED' },
      ],
    })

    const result = await findManyPublished()

    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('pub')
  })

  it.each([
    ['CLIENT', 'cli'],
    ['PERSONAL', 'perso'],
  ] as const)('filtre par type=%s quand précisé', async (type, expectedSlug) => {
    await prisma.project.createMany({
      data: [
        { slug: 'cli', title: 'Cli', description: 'd', type: 'CLIENT', status: 'PUBLISHED' },
        { slug: 'perso', title: 'Perso', description: 'd', type: 'PERSONAL', status: 'PUBLISHED' },
      ],
    })

    const result = await findManyPublished({ type })

    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe(expectedSlug)
  })

  it('retourne les projets triés par displayOrder asc (0 en premier)', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'a', title: 'A', description: 'd', type: 'PERSONAL', status: 'PUBLISHED', displayOrder: 10 },
        { slug: 'b', title: 'B', description: 'd', type: 'PERSONAL', status: 'PUBLISHED', displayOrder: 0 },
        { slug: 'c', title: 'C', description: 'd', type: 'PERSONAL', status: 'PUBLISHED', displayOrder: 5 },
      ],
    })

    const result = await findManyPublished()

    expect(result.map((p) => p.slug)).toEqual(['b', 'c', 'a'])
  })

  it('inclut les relations tags via ProjectTag (triés displayOrder asc, mélange kinds dont EXPERTISE) et clientMeta.company nested', async () => {
    await prisma.company.create({
      data: {
        slug: 'airbus',
        name: 'Airbus',
        sectors: ['LOGICIELS_ENTREPRISE'],
        size: 'GROUPE',
        locations: ['FRANCE'],
      },
    })

    await prisma.tag.createMany({
      data: [
        { slug: 'react', name: 'React', kind: 'FRAMEWORK', icon: 'simple-icons:react' },
        { slug: 'anti-bot-scraping', name: 'Scraping anti-bot', kind: 'EXPERTISE', icon: 'lucide:spider' },
        { slug: 'docker', name: 'Docker', kind: 'INFRA', icon: 'simple-icons:docker' },
      ],
    })

    await prisma.project.create({
      data: {
        slug: 'full',
        title: 'Full',
        description: 'd',
        type: 'CLIENT',
        status: 'PUBLISHED',
        formats: ['WEB_APP', 'API'],
        tags: {
          create: [
            { displayOrder: 0, tag: { connect: { slug: 'anti-bot-scraping' } } },
            { displayOrder: 1, tag: { connect: { slug: 'react' } } },
            { displayOrder: 2, tag: { connect: { slug: 'docker' } } },
          ],
        },
        clientMeta: {
          create: {
            teamSize: 15,
            contractStatus: 'FREELANCE',
            workMode: 'REMOTE',
            company: { connect: { slug: 'airbus' } },
          },
        },
      },
    })

    const result = await findManyPublished()

    expect(result).toHaveLength(1)
    expect(result[0]?.tags).toHaveLength(3)
    expect(result[0]?.tags.map((pt) => pt.tag.slug)).toEqual(['anti-bot-scraping', 'react', 'docker'])
    expect(result[0]?.tags.map((pt) => pt.displayOrder)).toEqual([0, 1, 2])
    expect(result[0]?.tags.map((pt) => pt.tag.kind)).toEqual(['EXPERTISE', 'FRAMEWORK', 'INFRA'])
    expect(result[0]?.formats).toEqual(['WEB_APP', 'API'])
    expect(result[0]?.clientMeta?.workMode).toBe('REMOTE')
    expect(result[0]?.clientMeta?.company?.name).toBe('Airbus')
    expect(result[0]?.clientMeta?.company?.size).toBe('GROUPE')
  })
})

describe('findPublishedBySlug', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne le projet PUBLISHED avec ses relations nested (tags via ProjectTag, company)', async () => {
    await prisma.company.create({
      data: { slug: 'airbus', name: 'Airbus', sectors: ['LOGICIELS_ENTREPRISE'], size: 'GROUPE' },
    })
    await prisma.tag.create({
      data: { slug: 'react', name: 'React', kind: 'FRAMEWORK' },
    })
    await prisma.project.create({
      data: {
        slug: 'mon-projet',
        title: 'Mon Projet',
        description: 'd',
        type: 'CLIENT',
        status: 'PUBLISHED',
        tags: {
          create: [{ displayOrder: 0, tag: { connect: { slug: 'react' } } }],
        },
        clientMeta: {
          create: {
            workMode: 'REMOTE',
            company: { connect: { slug: 'airbus' } },
          },
        },
      },
    })

    const result = await findPublishedBySlug('mon-projet')

    expect(result).not.toBeNull()
    expect(result?.slug).toBe('mon-projet')
    expect(result?.tags).toHaveLength(1)
    expect(result?.tags[0]?.tag.slug).toBe('react')
    expect(result?.tags[0]?.displayOrder).toBe(0)
    expect(result?.clientMeta?.workMode).toBe('REMOTE')
    expect(result?.clientMeta?.company?.name).toBe('Airbus')
  })

  it.each([
    ['slug-inexistant', 'slug absent de la BDD'],
    ['mon-brouillon', 'slug existant mais status=DRAFT'],
  ])('retourne null pour %s (%s)', async (slug) => {
    await prisma.project.create({
      data: {
        slug: 'mon-brouillon',
        title: 'Brouillon',
        description: 'd',
        type: 'PERSONAL',
        status: 'DRAFT',
      },
    })

    const result = await findPublishedBySlug(slug)

    expect(result).toBeNull()
  })
})
