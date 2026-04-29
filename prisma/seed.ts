import nextEnv from '@next/env'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { PrismaClient, type ProjectType } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { routing } from '@/i18n/routing'
import { tags } from './seed-data/tags.js'
import { companies } from './seed-data/companies.js'
import { projects } from './seed-data/projects.js'
import {
  AddressSchema,
  legalEntities,
  publisher,
  dataProcessings,
} from './seed-data/legal.js'

nextEnv.loadEnvConfig(process.cwd())

const __dirname = dirname(fileURLToPath(import.meta.url))

const IconSchema = z
  .string()
  .regex(
    /^(simple-icons|lucide):[a-z0-9-]+$/,
    'icon must match "simple-icons:<slug>" or "lucide:<slug>" (lowercase, hyphens allowed)',
  )
  .nullable()

type Locale = (typeof routing.locales)[number]

function readCaseStudy(
  slug: string,
  type: ProjectType,
  locale: Locale,
): string | null {
  const folder = type === 'CLIENT' ? 'client' : 'personal'
  const path = join(
    __dirname,
    'seed-data',
    'case-studies',
    folder,
    `${slug}.${locale}.md`,
  )
  try {
    return readFileSync(path, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

async function seedLegal(prisma: PrismaClient) {
  console.log(
    `→ Seed legal: ${legalEntities.length} LegalEntity, 1 Publisher, ${dataProcessings.length} DataProcessing.`,
  )

  for (const entity of legalEntities) {
    const addressParse = AddressSchema.safeParse(entity.address)
    if (!addressParse.success) {
      throw new Error(
        `LegalEntity "${entity.slug}" address invalide: ${addressParse.error.issues[0]?.message ?? 'format invalide'}`,
      )
    }

    const entityCommon = {
      name: entity.name,
      legalStatusKey: entity.legalStatusKey,
      siret: entity.siret,
      vatNumber: entity.vatNumber,
      rcsCity: entity.rcsCity,
      rcsNumber: entity.rcsNumber,
      phone: entity.phone,
      capitalAmount: entity.capitalAmount,
      capitalCurrency: entity.capitalCurrency,
    }

    await prisma.legalEntity.upsert({
      where: { slug: entity.slug },
      create: {
        slug: entity.slug,
        ...entityCommon,
        address: { create: addressParse.data },
      },
      update: {
        ...entityCommon,
        address: { update: addressParse.data },
      },
    })
  }
  console.log(`✔ ${legalEntities.length} LegalEntity (+ Address) upsertés`)

  const publisherEntity = await prisma.legalEntity.findUniqueOrThrow({
    where: { slug: publisher.legalEntitySlug },
  })
  const publisherCommon = {
    siren: publisher.siren,
    apeCode: publisher.apeCode,
    registrationType: publisher.registrationType,
    vatRegime: publisher.vatRegime,
    publicEmail: publisher.publicEmail,
  }
  await prisma.publisher.upsert({
    where: { legalEntityId: publisherEntity.id },
    create: { legalEntityId: publisherEntity.id, ...publisherCommon },
    update: publisherCommon,
  })
  console.log(`✔ 1 Publisher upserté`)

  for (const processing of dataProcessings) {
    const ownerEntity = await prisma.legalEntity.findUniqueOrThrow({
      where: { slug: processing.legalEntitySlug },
    })
    const processingCommon = {
      legalEntityId: ownerEntity.id,
      kind: processing.kind,
      purposeFr: processing.purposeFr,
      purposeEn: processing.purposeEn,
      retentionPolicyKey: processing.retentionPolicyKey,
      legalBasis: processing.legalBasis,
      outsideEuFramework: processing.outsideEuFramework,
      displayOrder: processing.displayOrder,
    }
    await prisma.dataProcessing.upsert({
      where: { slug: processing.slug },
      create: { slug: processing.slug, ...processingCommon },
      update: processingCommon,
    })
  }
  console.log(`✔ ${dataProcessings.length} DataProcessing upsertés`)
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  try {
    console.log(
      `→ Seed démarré. ${tags.length} tags, ${companies.length} companies, ${projects.length} projets.`,
    )

    await Promise.all(
      tags.map((t) => {
        const iconParse = IconSchema.safeParse(t.icon)
        if (!iconParse.success) {
          throw new Error(
            `Tag "${t.slug}" has an invalid icon "${t.icon ?? 'null'}": ${iconParse.error.issues[0]?.message ?? 'format invalide'}`,
          )
        }

        const tagCommon = {
          nameFr: t.nameFr,
          nameEn: t.nameEn,
          kind: t.kind,
          icon: iconParse.data,
          displayOrder: t.displayOrder,
        }

        return prisma.tag.upsert({
          where: { slug: t.slug },
          create: { slug: t.slug, ...tagCommon },
          update: tagCommon,
        })
      }),
    )
    const nbExpertises = tags.filter((t) => t.kind === 'EXPERTISE').length
    console.log(`✔ ${tags.length} tags upsertés (dont ${nbExpertises} expertises)`)

    await Promise.all(
      companies.map((c) => {
        const companyCommon = {
          name: c.name,
          logoFilename: c.logoFilename,
          websiteUrl: c.websiteUrl,
          sectors: c.sectors,
          size: c.size,
          locations: c.locations,
        }

        return prisma.company.upsert({
          where: { slug: c.slug },
          create: { slug: c.slug, ...companyCommon },
          update: companyCommon,
        })
      }),
    )
    console.log(`✔ ${companies.length} companies upsertées`)

    const missingEnStubs: string[] = []

    await Promise.all(
      projects.map((p) => {
        const caseStudyMarkdownFr = readCaseStudy(p.slug, p.type, 'fr')
        const caseStudyMarkdownEn = readCaseStudy(p.slug, p.type, 'en')

        if (caseStudyMarkdownFr !== null && caseStudyMarkdownEn === null) {
          missingEnStubs.push(p.slug)
        }

        const clientMetaData = p.clientMeta
          ? {
              teamSize: p.clientMeta.teamSize,
              contractStatus: p.clientMeta.contractStatus,
              workMode: p.clientMeta.workMode,
              company: { connect: { slug: p.clientMeta.companySlug } },
            }
          : undefined

        const projectTagCreate = p.tagSlugs.map((slug, index) => ({
          displayOrder: index,
          tag: { connect: { slug } },
        }))

        const projectCommon = {
          titleFr: p.titleFr,
          titleEn: p.titleEn,
          descriptionFr: p.descriptionFr,
          descriptionEn: p.descriptionEn,
          type: p.type,
          status: p.status,
          formats: p.formats,
          startedAt: p.startedAt,
          endedAt: p.endedAt,
          githubUrl: p.githubUrl,
          demoUrl: p.demoUrl,
          coverFilename: p.coverFilename,
          caseStudyMarkdownFr,
          caseStudyMarkdownEn,
          displayOrder: p.displayOrder,
          deliverablesCount: p.deliverablesCount,
        }

        return prisma.project.upsert({
          where: { slug: p.slug },
          create: {
            slug: p.slug,
            ...projectCommon,
            tags: { create: projectTagCreate },
            clientMeta: clientMetaData ? { create: clientMetaData } : undefined,
          },
          update: {
            ...projectCommon,
            // deleteMany + create : seul moyen de re-synchroniser ProjectTag.displayOrder
            // (Prisma `connect` ne permet pas de modifier displayOrder sur la jointure).
            tags: { deleteMany: {}, create: projectTagCreate },
            clientMeta: clientMetaData
              ? { upsert: { create: clientMetaData, update: clientMetaData } }
              : undefined,
          },
        })
      }),
    )

    await seedLegal(prisma)

    if (missingEnStubs.length > 0) {
      console.warn(
        `⚠ ${missingEnStubs.length} projet(s) sans case study EN (FR seule présente) : ${missingEnStubs.join(', ')}. caseStudyMarkdownEn = null.`,
      )
    }

    const nbClients = projects.filter((p) => p.type === 'CLIENT').length
    const nbPerso = projects.length - nbClients
    console.log(
      `✔ ${projects.length} projets upsertés (${nbClients} CLIENT + ${nbPerso} PERSONAL)`,
    )
    console.log(`→ Seed terminé avec succès.`)
  } catch (err) {
    console.error(`✖ Seed échoué:`, err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
