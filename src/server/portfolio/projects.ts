import "server-only"

import { revalidatePath } from "next/cache"

import type { Prisma } from "@/generated/prisma/client"
import { ADMIN_PROJECTS_PATH, ADMIN_TAGS_PATH } from "@/lib/admin/routes"
import { projectIdSchema, type ProjectId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { computeIdsAtPosition, renumberEntities } from "@/lib/reorder"
import type { ProjectInput } from "@/lib/schemas/project"
import {
  isPrismaError,
  isRowGone,
  isSlugTaken,
  rowExists,
  violatedConstraint,
} from "@/lib/server-utils"
import { fail, ok, type DomainResult } from "@/server/result"

export type ProjectWriteData = Omit<ProjectInput, "displayOrder">

// Le slug reste modifiable : l'admin le change, seul le schéma de l'outil MCP le refuse.
export type ProjectPatch = Partial<ProjectWriteData>

export type ProjectWriteError =
  | { code: "slug_taken" }
  | { code: "company_not_found" }
  | { code: "tag_not_found" }
  | { code: "dates_out_of_order" }
  | { code: "not_found" }

export interface ProjectSummary {
  id: ProjectId
  slug: string
  titleFr: string
}

export type ProjectWriteResult = DomainResult<ProjectSummary, ProjectWriteError>

const SUMMARY_SELECT = { id: true, slug: true, titleFr: true } as const

// Les tags affichent leur nombre de projets, d'où l'invalidation de leur écran d'admin.
export function invalidateProjectCaches(invalidate: (tag: string) => void): void {
  invalidate("projects")
  revalidatePath(ADMIN_PROJECTS_PATH, "layout")
  revalidatePath(ADMIN_TAGS_PATH)
}

type ClientMetaFields = Pick<
  ProjectWriteData,
  "companyId" | "workMode" | "contractStatus" | "teamSize" | "deliverablesCount"
>

type ProjectFields = Omit<ProjectPatch, keyof ClientMetaFields | "tagIds">

// Deux tables : Prisma refuserait companyId ou workMode sur project.create/update.
function splitFields(input: ProjectWriteData): {
  project: Omit<ProjectWriteData, keyof ClientMetaFields | "tagIds">
  meta: ClientMetaFields
}
function splitFields(input: ProjectPatch): {
  project: ProjectFields
  meta: Partial<ClientMetaFields>
}
function splitFields({
  companyId,
  workMode,
  contractStatus,
  teamSize,
  deliverablesCount,
  tagIds,
  ...project
}: ProjectPatch) {
  return { project, meta: { companyId, workMode, contractStatus, teamSize, deliverablesCount } }
}

export async function findAllProjectIds(
  projectClient: Prisma.TransactionClient["project"] = prisma.project,
): Promise<string[]> {
  const projects = await projectClient.findMany({
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  })
  return projects.map((project) => project.id)
}

export function renumberProjects(
  projectClient: Prisma.TransactionClient["project"],
  orderedIds: readonly string[],
  edited?: { id: string; data: ProjectFields },
) {
  return renumberEntities(
    (id, data) => projectClient.update({ where: { id }, data }),
    orderedIds,
    edited,
  )
}

// Le max plutôt que le compte : une suite avec un trou donnerait un rang déjà pris.
async function nextDisplayOrder(tx: Prisma.TransactionClient): Promise<number> {
  const { _max } = await tx.project.aggregate({ _max: { displayOrder: true } })
  return (_max.displayOrder ?? 0) + 1
}

function replaceProjectTags(
  tx: Prisma.TransactionClient,
  projectId: string,
  tagIds: readonly string[],
) {
  return tx.projectTag.createMany({
    data: tagIds.map((tagId, index) => ({ projectId, tagId, displayOrder: index + 1 })),
  })
}

const datesOutOfOrder = (startedAt: Date | null, endedAt: Date | null) =>
  startedAt !== null && endedAt !== null && endedAt < startedAt

function toSummary(row: { id: string; slug: string; titleFr: string }): ProjectSummary {
  return { id: projectIdSchema.parse(row.id), slug: row.slug, titleFr: row.titleFr }
}

function toDomainError(err: unknown): ProjectWriteError | null {
  if (isSlugTaken(err)) return { code: "slug_taken" }
  const constraint = violatedConstraint(err)
  // Entreprise ou tag supprimé entre la lecture de l'appelant et l'écriture.
  if (isPrismaError(err, "P2003") && constraint?.includes("companyId"))
    return { code: "company_not_found" }
  if (isPrismaError(err, "P2003") && constraint?.includes("tagId")) return { code: "tag_not_found" }
  return null
}

// Sans position, deux créations concurrentes peuvent partager un rang : accepté en mono-utilisateur.
export async function createProject(
  data: ProjectWriteData,
  position?: number,
): Promise<ProjectWriteResult> {
  if (datesOutOfOrder(data.startedAt, data.endedAt)) return fail({ code: "dates_out_of_order" })

  const { project, meta } = splitFields(data)

  try {
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.project.create({
        data: { ...project, displayOrder: await nextDisplayOrder(tx) },
        select: SUMMARY_SELECT,
      })
      if (position !== undefined) {
        const existingIds = await findAllProjectIds(tx.project)
        await Promise.all(
          renumberProjects(tx.project, computeIdsAtPosition(existingIds, row.id, position)),
        )
      }

      await tx.clientMeta.create({ data: { projectId: row.id, ...meta } })
      if (data.tagIds.length > 0) await replaceProjectTags(tx, row.id, data.tagIds)

      return row
    })
    return ok(toSummary(created))
  } catch (err) {
    const error = toDomainError(err)
    if (error) return fail(error)
    throw err
  }
}

async function writeUpdate(
  id: ProjectId,
  patch: ProjectPatch,
  position: number | undefined,
): Promise<ProjectWriteResult> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.project.findUnique({
      where: { id },
      select: { ...SUMMARY_SELECT, startedAt: true, endedAt: true },
    })
    if (!current) return fail({ code: "not_found" })

    // Dates telles que la base les portera : le patch par-dessus le stocké.
    const startedAt = patch.startedAt === undefined ? current.startedAt : patch.startedAt
    const endedAt = patch.endedAt === undefined ? current.endedAt : patch.endedAt
    if (datesOutOfOrder(startedAt, endedAt)) return fail({ code: "dates_out_of_order" })

    const { project, meta } = splitFields(patch)
    if (position === undefined) {
      // Sans position, pas de renumérotation : elle bumperait `updatedAt` des voisins.
      // updatedAt explicite : Prisma saute un update vide, et un patch de tags ou de ClientMeta seul garderait l'ancienne date de la page publique.
      await tx.project.update({ where: { id }, data: { ...project, updatedAt: new Date() } })
    } else {
      const existingIds = await findAllProjectIds(tx.project)
      await Promise.all(
        renumberProjects(tx.project, computeIdsAtPosition(existingIds, id, position), {
          id,
          data: project,
        }),
      )
    }

    // Tout projet a son ClientMeta (invariant du domaine) : mise à jour sans upsert.
    if (Object.values<unknown>(meta).some((value) => value !== undefined)) {
      await tx.clientMeta.update({ where: { projectId: id }, data: meta })
    }

    if (patch.tagIds !== undefined) {
      await tx.projectTag.deleteMany({ where: { projectId: id } })
      if (patch.tagIds.length > 0) await replaceProjectTags(tx, id, patch.tagIds)
    }

    return ok({
      id,
      slug: patch.slug ?? current.slug,
      titleFr: patch.titleFr ?? current.titleFr,
    })
  })
}

export async function updateProject(
  id: ProjectId,
  patch: ProjectPatch,
  position?: number,
): Promise<ProjectWriteResult> {
  try {
    return await writeUpdate(id, patch, position)
  } catch (err) {
    const error = toDomainError(err)
    if (error) return fail(error)
    if (await isRowGone(err, () => rowExists(prisma.project, { id }))) {
      return fail({ code: "not_found" })
    }
    throw err
  }
}
