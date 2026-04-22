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
        { slug: 'pub',   titleFr: 'Pub',   titleEn: 'Pub',   descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'PUBLISHED' },
        { slug: 'draft', titleFr: 'Draft', titleEn: 'Draft', descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'DRAFT' },
        { slug: 'arch',  titleFr: 'Arch',  titleEn: 'Arch',  descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'ARCHIVED' },
      ],
    })

    const result = await findManyPublished({ locale: 'fr' })

    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('pub')
  })

  it.each([
    ['CLIENT', 'cli'],
    ['PERSONAL', 'perso'],
  ] as const)('filtre par type=%s quand précisé', async (type, expectedSlug) => {
    await prisma.project.createMany({
      data: [
        { slug: 'cli',   titleFr: 'Cli',   titleEn: 'Cli',   descriptionFr: 'd', descriptionEn: 'd', type: 'CLIENT',   status: 'PUBLISHED' },
        { slug: 'perso', titleFr: 'Perso', titleEn: 'Perso', descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'PUBLISHED' },
      ],
    })

    const result = await findManyPublished({ type, locale: 'fr' })

    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe(expectedSlug)
  })

  it('retourne les projets triés par displayOrder asc (0 en premier)', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'a', titleFr: 'A', titleEn: 'A', descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'PUBLISHED', displayOrder: 10 },
        { slug: 'b', titleFr: 'B', titleEn: 'B', descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'PUBLISHED', displayOrder: 0 },
        { slug: 'c', titleFr: 'C', titleEn: 'C', descriptionFr: 'd', descriptionEn: 'd', type: 'PERSONAL', status: 'PUBLISHED', displayOrder: 5 },
      ],
    })

    const result = await findManyPublished({ locale: 'fr' })

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
        { slug: 'react',             nameFr: 'React',             nameEn: 'React',             kind: 'FRAMEWORK',  icon: 'simple-icons:react' },
        { slug: 'anti-bot-scraping', nameFr: 'Scraping anti-bot', nameEn: 'Anti-bot scraping', kind: 'EXPERTISE',  icon: 'lucide:spider' },
        { slug: 'docker',            nameFr: 'Docker',            nameEn: 'Docker',            kind: 'INFRA',      icon: 'simple-icons:docker' },
      ],
    })

    await prisma.project.create({
      data: {
        slug: 'full',
        titleFr: 'Full',
        titleEn: 'Full',
        descriptionFr: 'd',
        descriptionEn: 'd',
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

    const result = await findManyPublished({ locale: 'fr' })

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

  it('résout title/description en FR quand locale = fr', async () => {
    await prisma.project.create({
      data: {
        slug: 'bi',
        titleFr: 'Digiclaims - Gestion Sinistres',
        titleEn: 'Digiclaims - Claims Management',
        descriptionFr: 'Desc FR',
        descriptionEn: 'Desc EN',
        type: 'CLIENT',
        status: 'PUBLISHED',
      },
    })

    const result = await findManyPublished({ locale: 'fr' })

    expect(result[0]?.title).toBe('Digiclaims - Gestion Sinistres')
    expect(result[0]?.description).toBe('Desc FR')
    expect(result[0]).not.toHaveProperty('titleFr')
    expect(result[0]).not.toHaveProperty('titleEn')
  })

  it('résout title/description en EN quand locale = en', async () => {
    await prisma.project.create({
      data: {
        slug: 'bi',
        titleFr: 'Digiclaims - Gestion Sinistres',
        titleEn: 'Digiclaims - Claims Management',
        descriptionFr: 'Desc FR',
        descriptionEn: 'Desc EN',
        type: 'CLIENT',
        status: 'PUBLISHED',
      },
    })

    const result = await findManyPublished({ locale: 'en' })

    expect(result[0]?.title).toBe('Digiclaims - Claims Management')
    expect(result[0]?.description).toBe('Desc EN')
  })

  it('applique la locale sur les tags nested (name résolu selon locale)', async () => {
    await prisma.tag.create({
      data: { slug: 'automatisation', nameFr: 'Automatisation', nameEn: 'Automation', kind: 'EXPERTISE' },
    })
    await prisma.project.create({
      data: {
        slug: 'bi',
        titleFr: 'T',
        titleEn: 'T',
        descriptionFr: 'd',
        descriptionEn: 'd',
        type: 'PERSONAL',
        status: 'PUBLISHED',
        tags: { create: [{ displayOrder: 0, tag: { connect: { slug: 'automatisation' } } }] },
      },
    })

    const resultFr = await findManyPublished({ locale: 'fr' })
    const resultEn = await findManyPublished({ locale: 'en' })

    expect(resultFr[0]?.tags[0]?.tag.name).toBe('Automatisation')
    expect(resultEn[0]?.tags[0]?.tag.name).toBe('Automation')
    expect(resultFr[0]?.tags[0]?.tag).not.toHaveProperty('nameFr')
  })
})

describe('findPublishedBySlug', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne le projet PUBLISHED avec ses relations nested localisées', async () => {
    await prisma.company.create({
      data: { slug: 'airbus', name: 'Airbus', sectors: ['LOGICIELS_ENTREPRISE'], size: 'GROUPE' },
    })
    await prisma.tag.create({
      data: { slug: 'react', nameFr: 'React', nameEn: 'React', kind: 'FRAMEWORK' },
    })
    await prisma.project.create({
      data: {
        slug: 'mon-projet',
        titleFr: 'Mon Projet',
        titleEn: 'My Project',
        descriptionFr: 'd',
        descriptionEn: 'd',
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

    const result = await findPublishedBySlug('mon-projet', 'en')

    expect(result).not.toBeNull()
    expect(result?.slug).toBe('mon-projet')
    expect(result?.title).toBe('My Project')
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
        titleFr: 'Brouillon',
        titleEn: 'Draft',
        descriptionFr: 'd',
        descriptionEn: 'd',
        type: 'PERSONAL',
        status: 'DRAFT',
      },
    })

    const result = await findPublishedBySlug(slug, 'fr')

    expect(result).toBeNull()
  })
})
