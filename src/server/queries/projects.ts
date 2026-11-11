import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import type { Locale } from "next-intl"
import { prisma } from "@/lib/prisma"
import type { Prisma, ProjectType } from "@/generated/prisma/client"
import { localizeProject } from "@/i18n/localize-content"
import { getProjectDuration, type ProjectDuration } from "@/lib/projects"
import { companyRefSelect } from "@/server/queries/company-ref"
import type { PageQuery } from "@/server/queries/persons"
import { PROJECT_INCLUDE, type LocalizedProjectWithRelations } from "@/types/project"

export async function findManyPublished(params: {
  type?: ProjectType
  locale: Locale
}): Promise<LocalizedProjectWithRelations[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("projects")
  const projects = await prisma.project.findMany({
    where: {
      status: "PUBLISHED",
      ...(params.type && { type: params.type }),
    },
    include: PROJECT_INCLUDE,
    orderBy: { displayOrder: "asc" },
  })
  return projects.map((p) => localizeProject(p, params.locale))
}

export async function findPublishedBySlug(
  slug: string,
  locale: Locale,
): Promise<LocalizedProjectWithRelations | null> {
  "use cache"
  cacheLife("hours")
  cacheTag("projects")
  const project = await prisma.project.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: PROJECT_INCLUDE,
  })
  return project ? localizeProject(project, locale) : null
}

export async function findAllPublishedSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("projects")
  return prisma.project.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { displayOrder: "asc" },
  })
}

export type AdminProjectListItem = Awaited<ReturnType<typeof findAllProjectsForAdmin>>[number]
export type AdminProjectDetail = NonNullable<Awaited<ReturnType<typeof findProjectForAdmin>>>

// Sans 'use cache' ni filtre de statut, contrairement aux requêtes publiques : l'administration
// doit lire la base juste après une mutation, brouillons et archivés compris.
export async function findAllProjectsForAdmin() {
  return prisma.project.findMany({
    include: {
      clientMeta: {
        include: { company: { select: companyRefSelect } },
      },
      tags: { include: { tag: true }, orderBy: { displayOrder: "asc" } },
    },
    orderBy: { displayOrder: "asc" },
  })
}

export async function findProjectForAdmin(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      clientMeta: true,
      tags: { include: { tag: true }, orderBy: { displayOrder: "asc" } },
    },
  })
}

// Lectures de l'outil MCP : sans 'use cache', l'agent relit la base juste après ses écritures.
export function findProjectSearchRows() {
  return prisma.project.findMany({
    select: { id: true, slug: true, titleFr: true, titleEn: true },
  })
}

// L'entreprise cliente sort par sa seule référence (id, nom, logo), jamais une autre donnée du CRM.
export function findProjectForTool(id: string) {
  return prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      titleFr: true,
      titleEn: true,
      descriptionFr: true,
      descriptionEn: true,
      type: true,
      status: true,
      formats: true,
      startedAt: true,
      endedAt: true,
      githubUrl: true,
      demoUrl: true,
      coverFilename: true,
      caseStudyMarkdownFr: true,
      caseStudyMarkdownEn: true,
      displayOrder: true,
      createdAt: true,
      updatedAt: true,
      clientMeta: {
        select: {
          workMode: true,
          contractStatus: true,
          teamSize: true,
          deliverablesCount: true,
          company: { select: companyRefSelect },
        },
      },
      tags: {
        orderBy: { displayOrder: "asc" },
        select: { tag: { select: { id: true, slug: true, nameFr: true } } },
      },
    },
  })
}

const projectRowSelect = {
  id: true,
  slug: true,
  titleFr: true,
  titleEn: true,
  status: true,
  type: true,
  displayOrder: true,
  updatedAt: true,
  clientMeta: { select: { company: { select: { name: true } } } },
} as const

export async function findProjectsPage(
  page: PageQuery<Prisma.ProjectWhereInput, Prisma.ProjectOrderByWithRelationInput>,
) {
  const [rows, total] = await prisma.$transaction([
    prisma.project.findMany({ ...page, select: projectRowSelect }),
    prisma.project.count({ where: page.where }),
  ])
  return { rows, total }
}

// Sans 'use cache', contrairement à countTagsByKind : lue dans le Promise.all du composant async
// de la page, donc sous sa frontière <Suspense>, pas dans un en-tête au-dessus.
export async function countProjects(): Promise<number> {
  return prisma.project.count()
}

// Un projet en cours se compte jusqu'à aujourd'hui. L'horloge se lit dans un scope "use cache",
// pas dans la page prérendue (cacheComponents refuse new Date() au prerender) ; "days" borne le
// retard à un jour après le 1er du mois, quand la valeur bascule.
// eslint-disable-next-line @typescript-eslint/require-await -- "use cache" impose async même sans await interne (cf. doc Next.js)
export async function getLiveProjectDuration(
  startedAt: Date | null,
  endedAt: Date | null,
): Promise<ProjectDuration | null> {
  "use cache"
  cacheLife("days")
  return getProjectDuration(startedAt, endedAt ?? new Date())
}
