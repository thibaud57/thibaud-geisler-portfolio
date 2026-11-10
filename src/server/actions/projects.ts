"use server"

import "server-only"
import { updateTag as updateCacheTag } from "next/cache"

import { assertNever } from "@/lib/assert-never"
import { getCurrentUser } from "@/lib/get-current-user"
import { projectIdSchema } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { sameIdSet } from "@/lib/reorder"
import { projectReorderSchema, projectSchema, type ProjectInput } from "@/lib/schemas/project"
import { createActionLogger, rowExists, stringField, stringValues } from "@/lib/server-utils"
import {
  createProject as createProjectRecord,
  findAllProjectIds,
  invalidateProjectCaches,
  renumberProjects,
  updateProject as updateProjectRecord,
  type ProjectSummary,
  type ProjectWriteError,
  type ProjectWriteResult,
} from "@/server/portfolio/projects"

import {
  type ActionEvents,
  deleteEntity,
  domainFailure,
  type DomainFailure,
  failureState,
  formStateHandlers,
  MISSING_COMPANY,
  MISSING_TAG,
  saveEntity,
} from "./_support/shared"
import {
  type ProjectDeleteState,
  type ProjectFormMessage,
  type ProjectFormState,
  type ProjectReorderState,
} from "./projects.types"

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

function updateProjectCaches(): void {
  invalidateProjectCaches(updateCacheTag)
}

const failure = domainFailure<ProjectInput, ProjectFormMessage>

function mapDomainError(
  error: ProjectWriteError,
  values: ProjectFormState["values"],
): DomainFailure<ProjectFormState> {
  switch (error.code) {
    case "slug_taken":
      return failure(
        values,
        { slug: ["Ce slug est déjà utilisé par un autre projet"] },
        "slug_taken",
      )
    case "company_not_found":
      return failure(values, { companyId: [MISSING_COMPANY.text] }, MISSING_COMPANY.code)
    case "tag_not_found":
      return failure(values, { tagIds: [MISSING_TAG.text] }, MISSING_TAG.code)
    case "dates_out_of_order":
      return failure(
        values,
        { endedAt: ["La date de fin ne peut pas précéder la date de début"] },
        null,
      )
    case "not_found":
      return failure(values, {}, "project_not_found", true)
    default:
      return assertNever(error)
  }
}

const projectExists = (id: string) => rowExists(prisma.project, { id })

function saveProject(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (input: ProjectInput) => Promise<ProjectWriteResult>,
): Promise<ProjectFormState> {
  const values = collectValues(formData)

  return saveEntity<ProjectInput, ProjectFormState, ProjectSummary, ProjectWriteError>({
    actionName,
    events,
    schema: projectSchema,
    input: values,
    persist,
    successLogFields: (data) => ({ slug: data.slug }),
    invalidateCaches: updateProjectCaches,
    onDomainError: (error) => mapDomainError(error, values),
    ...formStateHandlers(values),
    onSuccess: (project) => ({ ok: true, errors: {}, message: null, savedId: project.id }),
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
    ({ displayOrder, ...fields }) => createProjectRecord(fields, displayOrder),
  )
}

export async function updateProject(
  id: string,
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await getCurrentUser()

  // Un id invalide ne désigne aucun projet : même réponse qu'un projet supprimé.
  const parsedId = projectIdSchema.safeParse(id)
  if (!parsedId.success) {
    return failureState(
      mapDomainError({ code: "not_found" }, collectValues(formData)),
      updateProjectCaches,
    )
  }

  return saveProject(
    "updateProject",
    { success: "project:updated", failure: "project:update_failed" },
    formData,
    ({ displayOrder, ...fields }) => updateProjectRecord(parsedId.data, fields, displayOrder),
  )
}

export async function deleteProject(id: string): Promise<ProjectDeleteState> {
  await getCurrentUser()

  return deleteEntity<ProjectDeleteState>({
    actionName: "deleteProject",
    events: { success: "project:deleted", failure: "project:delete_failed" },
    successLogFields: { id },
    exists: () => projectExists(id),
    destroy: () =>
      prisma.$transaction(async (tx) => {
        await tx.project.delete({ where: { id } })
        await Promise.all(renumberProjects(tx.project, await findAllProjectIds(tx)))
      }),
    invalidateCaches: updateProjectCaches,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}

export async function reorderProjects(orderedIds: readonly string[]): Promise<ProjectReorderState> {
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

      updateProjectCaches()
      log.info({ event: "project:reordered", count: result.data.orderedIds.length })
      return { ok: true, message: null }
    } catch (err) {
      log.error({ err, event: "project:reorder_failed" })
      return { ok: false, message: "unknown_error" }
    }
  })
}
