import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { PrismaClient, type ProjectType } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { tags } from './seed-data/tags.js'
import { companies } from './seed-data/companies.js'
import { projects } from './seed-data/projects.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const IconSchema = z
  .string()
  .regex(
    /^(simple-icons|lucide):[a-z0-9-]+$/,
    'icon must match "simple-icons:<slug>" or "lucide:<slug>" (lowercase, hyphens allowed)',
  )
  .nullable()

function readCaseStudy(slug: string, type: ProjectType): string | null {
  const folder = type === 'CLIENT' ? 'client' : 'personal'
  const path = join(__dirname, 'seed-data', 'case-studies', folder, `${slug}.md`)
  try {
    return readFileSync(path, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  try {
    console.log(
      `→ Seed démarré. ${tags.length} tags, ${companies.length} companies, ${projects.length} projets.`,
    )

    // Ordre tags → companies → projects requis : FK sur Tag.slug et Company.slug.
    for (const t of tags) {
      const iconParse = IconSchema.safeParse(t.icon)
      if (!iconParse.success) {
        throw new Error(
          `Tag "${t.slug}" has an invalid icon "${t.icon ?? 'null'}": ${iconParse.error.issues[0]?.message ?? 'format invalide'}`,
        )
      }

      await prisma.tag.upsert({
        where: { slug: t.slug },
        create: {
          slug: t.slug,
          name: t.name,
          kind: t.kind,
          icon: iconParse.data,
        },
        update: {
          name: t.name,
          kind: t.kind,
          icon: iconParse.data,
        },
      })
    }
    const nbExpertises = tags.filter((t) => t.kind === 'EXPERTISE').length
    console.log(`✔ ${tags.length} tags upsertés (dont ${nbExpertises} expertises)`)

    for (const c of companies) {
      await prisma.company.upsert({
        where: { slug: c.slug },
        create: {
          slug: c.slug,
          name: c.name,
          logoFilename: c.logoFilename,
          websiteUrl: c.websiteUrl,
          sectors: c.sectors,
          size: c.size,
          locations: c.locations,
        },
        update: {
          name: c.name,
          logoFilename: c.logoFilename,
          websiteUrl: c.websiteUrl,
          sectors: c.sectors,
          size: c.size,
          locations: c.locations,
        },
      })
    }
    console.log(`✔ ${companies.length} companies upsertées`)

    for (const p of projects) {
      const caseStudyMarkdown = readCaseStudy(p.slug, p.type)

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

      await prisma.project.upsert({
        where: { slug: p.slug },
        create: {
          slug: p.slug,
          title: p.title,
          description: p.description,
          type: p.type,
          status: p.status,
          formats: p.formats,
          startedAt: p.startedAt,
          endedAt: p.endedAt,
          githubUrl: p.githubUrl,
          demoUrl: p.demoUrl,
          coverFilename: p.coverFilename,
          caseStudyMarkdown,
          displayOrder: p.displayOrder,
          tags: { create: projectTagCreate },
          clientMeta: clientMetaData ? { create: clientMetaData } : undefined,
        },
        update: {
          title: p.title,
          description: p.description,
          type: p.type,
          status: p.status,
          formats: p.formats,
          startedAt: p.startedAt,
          endedAt: p.endedAt,
          githubUrl: p.githubUrl,
          demoUrl: p.demoUrl,
          coverFilename: p.coverFilename,
          caseStudyMarkdown,
          displayOrder: p.displayOrder,
          // deleteMany + create : seul moyen de re-synchroniser l'ordre des tags par-projet
          // (Prisma `connect` ne permet pas de modifier displayOrder de la table de jointure).
          tags: { deleteMany: {}, create: projectTagCreate },
          clientMeta: clientMetaData
            ? { upsert: { create: clientMetaData, update: clientMetaData } }
            : undefined,
        },
      })
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
