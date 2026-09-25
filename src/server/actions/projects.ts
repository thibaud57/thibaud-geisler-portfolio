"use server"

import "server-only"
import { revalidatePath, updateTag as updateCacheTag } from "next/cache"

import type { Prisma } from "@/generated/prisma/client"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { computeIdsAtPosition, renumberEntities, sameIdSet } from "@/lib/reorder"
import { projectReorderSchema, projectSchema, type ProjectInput } from "@/lib/schemas/project"
import {
  createActionLogger,
  isPrismaError,
  stringField,
  stringValues,
  violatedConstraint,
} from "@/lib/server-utils"

import { deleteEntity, saveEntity } from "./shared"
import { type ProjectFormState, type ProjectReorderState } from "./projects.types"

// Seule lecture du FormData : le même objet est validé puis réaffiché en cas d'échec, les deux ne
// peuvent pas diverger.
function collectValues(formData: FormData): ProjectFormState["values"] {
  return {
    slug: stringField(formData, "slug"),
    titleFr: stringField(formData, "titleFr"),
    titleEn: stringField(formData, "titleEn"),
    descriptionFr: stringField(formData, "descriptionFr"),
    descriptionEn: stringField(formData, "descriptionEn"),
    type: stringField(formData, "type"),
    status: stringField(formData, "status"),
    formats: stringValues(formData, "formats"),
    startedAt: stringField(formData, "startedAt"),
    endedAt: stringField(formData, "endedAt"),
    githubUrl: stringField(formData, "githubUrl"),
    demoUrl: stringField(formData, "demoUrl"),
    coverFilename: stringField(formData, "coverFilename"),
    caseStudyMarkdownFr: stringField(formData, "caseStudyMarkdownFr"),
    caseStudyMarkdownEn: stringField(formData, "caseStudyMarkdownEn"),
    displayOrder: stringField(formData, "displayOrder"),
    tagIds: stringValues(formData, "tagIds"),
    companyId: stringField(formData, "companyId"),
    workMode: stringField(formData, "workMode"),
    contractStatus: stringField(formData, "contractStatus"),
    teamSize: stringField(formData, "teamSize"),
    deliverablesCount: stringField(formData, "deliverablesCount", "1"),
  }
}

function invalidateProjectCaches(): void {
  updateCacheTag("projects")
  revalidatePath("/admin/projets")
}

// Champs du projet lui-même, séparés de ceux qui alimentent ClientMeta : Prisma refuserait
// companyId ou workMode sur project.create/update.
function projectData(input: ProjectInput) {
  const { tagIds, companyId, workMode, contractStatus, teamSize, deliverablesCount, ...project } =
    input
  return project
}

function clientMetaData(input: ProjectInput) {
  const { companyId, workMode, contractStatus, teamSize, deliverablesCount } = input
  return { companyId, workMode, contractStatus, teamSize, deliverablesCount }
}

// Attribution par contrainte et jamais par seul code d'erreur : ProjectTag porte sa propre unicité
// (@@id([projectId, tagId])), un P2002 dessus ne doit pas s'afficher comme un slug déjà pris.
function mapConstraintViolation(
  err: unknown,
  values: ProjectFormState["values"],
): ProjectFormState | null {
  const constraint = violatedConstraint(err)

  if (isPrismaError(err, "P2002") && constraint.includes("slug")) {
    return {
      ok: false,
      errors: { slug: ["Ce slug est déjà utilisé par un autre projet"] },
      message: "slug_taken",
      values,
    }
  }

  // Entreprise ou tag supprimé entre l'affichage du formulaire et son envoi.
  if (isPrismaError(err, "P2003") && constraint.includes("companyId")) {
    return {
      ok: false,
      errors: { companyId: ["Cette entreprise n'existe plus, recharge la page"] },
      message: "company_not_found",
      values,
    }
  }

  if (isPrismaError(err, "P2003") && constraint.includes("tagId")) {
    return {
      ok: false,
      errors: { tagIds: ["Un des tags n'existe plus, recharge la page"] },
      message: "tag_not_found",
      values,
    }
  }

  return null
}

async function findAllProjectIds(
  projectClient: Prisma.TransactionClient["project"],
): Promise<string[]> {
  const projects = await projectClient.findMany({
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  })
  return projects.map((project) => project.id)
}

function renumberProjects(
  projectClient: Prisma.TransactionClient["project"],
  orderedIds: readonly string[],
  edited?: { id: string; data: ReturnType<typeof projectData> },
) {
  return renumberEntities(
    (id, data) => projectClient.update({ where: { id }, data }),
    orderedIds,
    edited,
  )
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

// L'ordre courant se lit dans la transaction, ce qui ferme la fenêtre entre sa lecture et son
// écriture. READ COMMITTED ne sérialise pas pour autant deux transactions concurrentes, et rien en
// base n'interdit deux projets au même rang : la mutation suivante renumérote l'ensemble.
async function createProjectWithRelations(input: ProjectInput) {
  return prisma.$transaction(async (tx) => {
    const existingIds = await findAllProjectIds(tx.project)
    const created = await tx.project.create({ data: projectData(input) })

    await Promise.all(
      renumberProjects(
        tx.project,
        computeIdsAtPosition(existingIds, created.id, input.displayOrder),
      ),
    )

    await tx.clientMeta.create({ data: { projectId: created.id, ...clientMetaData(input) } })

    if (input.tagIds.length > 0) {
      await replaceProjectTags(tx, created.id, input.tagIds)
    }

    return created.id
  })
}

async function updateProjectWithRelations(id: string, input: ProjectInput) {
  return prisma.$transaction(async (tx) => {
    const existingIds = await findAllProjectIds(tx.project)

    await Promise.all(
      renumberProjects(tx.project, computeIdsAtPosition(existingIds, id, input.displayOrder), {
        id,
        data: projectData(input),
      }),
    )

    const meta = clientMetaData(input)
    await tx.clientMeta.upsert({
      where: { projectId: id },
      create: { projectId: id, ...meta },
      update: meta,
    })

    await tx.projectTag.deleteMany({ where: { projectId: id } })
    if (input.tagIds.length > 0) {
      await replaceProjectTags(tx, id, input.tagIds)
    }

    return id
  })
}

interface SaveProjectEvents {
  success: string
  failure: string
}

function saveProject(
  actionName: string,
  events: SaveProjectEvents,
  formData: FormData,
  persist: (input: ProjectInput) => Promise<string>,
): Promise<ProjectFormState> {
  const values = collectValues(formData)

  return saveEntity<ProjectInput, ProjectFormState, string>({
    actionName,
    events,
    schema: projectSchema,
    input: values,
    persist,
    invalidateCaches: invalidateProjectCaches,
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: (savedId) => ({ ok: true, errors: {}, message: null, savedId }),
    mapError: (err) => mapConstraintViolation(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
  })
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  // Dans chaque action exportée et jamais dans saveProject : placé hors de l'instrumentation,
  // unauthorized() serait avalé et masqué en unknown_error.
  await getCurrentUser()

  return saveProject(
    "createProject",
    { success: "project:created", failure: "project:create_failed" },
    formData,
    createProjectWithRelations,
  )
}

export async function updateProject(
  id: string,
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await getCurrentUser()

  return saveProject(
    "updateProject",
    { success: "project:updated", failure: "project:update_failed" },
    formData,
    (input) => updateProjectWithRelations(id, input),
  )
}

export async function deleteProject(id: string): Promise<ProjectFormState> {
  await getCurrentUser()

  return deleteEntity<ProjectFormState>({
    actionName: "deleteProject",
    events: { success: "project:deleted", failure: "project:delete_failed" },
    successLogFields: { id },
    destroy: () =>
      prisma.$transaction(async (tx) => {
        await tx.project.delete({ where: { id } })
        const remaining = await tx.project.findMany({
          orderBy: { displayOrder: "asc" },
          select: { id: true },
        })
        await Promise.all(
          renumberProjects(
            tx.project,
            remaining.map((project) => project.id),
          ),
        )
      }),
    invalidateCaches: invalidateProjectCaches,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: () => null,
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}

export async function reorderProjects(orderedIds: string[]): Promise<ProjectReorderState> {
  await getCurrentUser()

  return createActionLogger("reorderProjects", async ({ log }) => {
    const result = projectReorderSchema.safeParse({ orderedIds })
    if (!result.success) {
      return { ok: false, message: "invalid_order" }
    }

    try {
      const existing = await prisma.project.findMany({ select: { id: true } })

      // Une création ou une suppression survenue entre l'affichage de la liste et le dépôt du
      // glisser-déposer rend l'ordre reçu périmé : réécrire un sous-ensemble laisserait des
      // displayOrder en doublon ou troués.
      const existingIds = existing.map((project) => project.id)
      if (!sameIdSet(existingIds, result.data.orderedIds)) {
        return { ok: false, message: "stale_order" }
      }

      await prisma.$transaction(renumberProjects(prisma.project, result.data.orderedIds))

      invalidateProjectCaches()
      log.info({ event: "project:reordered", count: result.data.orderedIds.length })
      return { ok: true, message: null }
    } catch (err) {
      log.error({ err, event: "project:reorder_failed" })
      return { ok: false, message: "unknown_error" }
    }
  })
}
