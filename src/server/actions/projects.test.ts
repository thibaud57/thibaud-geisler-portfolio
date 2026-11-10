import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const project = {
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  }
  const prisma = { project, $transaction: vi.fn() }
  // Sert les deux formes de $transaction (tableau de promesses ou callback interactif) sans
  // configuration par test.
  prisma.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: typeof prisma) => Promise<unknown>)(prisma)
      : Promise.all(arg as Promise<unknown>[]),
  )
  return { prisma }
})
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/server/portfolio/projects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/portfolio/projects")>()),
  createProject: vi.fn(),
  updateProject: vi.fn(),
}))

import { revalidatePath, updateTag as updateCacheTag } from "next/cache"
import { getCurrentUser } from "@/lib/get-current-user"
import { projectIdSchema } from "@/lib/ids"
import { objectMatch } from "@/lib/matchers-test-setup"
import { prisma } from "@/lib/prisma"
import {
  createProject as createProjectRecord,
  updateProject as updateProjectRecord,
} from "@/server/portfolio/projects"
import { fail, ok } from "@/server/result"
import { createProject, deleteProject, reorderProjects, updateProject } from "./projects"
import { initialProjectFormState } from "./projects.types"

function buildFormData(
  overrides: Record<string, string> = {},
  options: { formats?: string[]; tagIds?: string[] } = {},
): FormData {
  const data = new FormData()
  const base = {
    slug: "mon-projet",
    titleFr: "Mon projet",
    titleEn: "My project",
    descriptionFr: "Description française",
    descriptionEn: "English description",
    type: "PERSONAL",
    status: "DRAFT",
    startedAt: "",
    endedAt: "",
    githubUrl: "",
    demoUrl: "",
    coverFilename: "",
    caseStudyMarkdownFr: "",
    caseStudyMarkdownEn: "",
    displayOrder: "1",
    companyId: "c1",
    workMode: "REMOTE",
    contractStatus: "",
    teamSize: "",
    deliverablesCount: "1",
  }
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    data.set(key, value)
  }
  for (const format of options.formats ?? ["WEB_APP"]) data.append("formats", format)
  for (const tagId of options.tagIds ?? []) data.append("tagIds", tagId)
  return data
}

const PROJECT_ID = projectIdSchema.parse("p1")
const SUMMARY = { id: PROJECT_ID, slug: "mon-projet", titleFr: "Mon projet" }

beforeEach(() => {
  vi.mocked(prisma.project.findMany).mockResolvedValue([])
  vi.mocked(prisma.project.update).mockResolvedValue({} as never)
  vi.mocked(createProjectRecord).mockResolvedValue(ok(SUMMARY))
  vi.mocked(updateProjectRecord).mockResolvedValue(ok(SUMMARY))
})

describe("createProject", () => {
  it("rejects an empty slug without touching the domain", async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ slug: "" }))

    expect(state.errors.slug).toBeDefined()
    expect(createProjectRecord).not.toHaveBeenCalled()
  })

  it("keeps every submitted format", async () => {
    await createProject(initialProjectFormState, buildFormData({}, { formats: ["API", "IA"] }))

    expect(createProjectRecord).toHaveBeenCalledWith(objectMatch({ formats: ["API", "IA"] }), 1)
  })

  it.each(["CLIENT", "PERSONAL"])("rejects a %s project without a company", async (type) => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ type, companyId: "" }),
    )

    expect(state.errors.companyId).toBeDefined()
    expect(createProjectRecord).not.toHaveBeenCalled()
  })

  it.each(["CLIENT", "PERSONAL"])("rejects a %s project without a work mode", async (type) => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ type, workMode: "" }),
    )

    expect(state.errors.workMode).toBeDefined()
    expect(createProjectRecord).not.toHaveBeenCalled()
  })

  it.each([
    ["CLIENT", "c1", "HYBRIDE"],
    ["PERSONAL", "c-owner", "REMOTE"],
  ])("passes the meta fields of a %s project", async (type, companyId, workMode) => {
    await createProject(initialProjectFormState, buildFormData({ type, companyId, workMode }))

    expect(createProjectRecord).toHaveBeenCalledWith(objectMatch({ companyId, workMode }), 1)
  })

  it("accepts missing dates", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ startedAt: "", endedAt: "" }),
    )

    expect(state.ok).toBe(true)
  })

  it.each(["githubUrl", "demoUrl"])("rejects a javascript: URL on %s", async (field) => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ [field]: "javascript:alert(1)" }),
    )

    expect(state.ok).toBe(false)
    expect(state.errors[field as "githubUrl" | "demoUrl"]).toBeDefined()
    expect(createProjectRecord).not.toHaveBeenCalled()
  })

  it("rejects a malformed URL", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ githubUrl: "pas-une-url" }),
    )

    expect(state.errors.githubUrl).toBeDefined()
  })

  it("passes an empty URL as null", async () => {
    await createProject(initialProjectFormState, buildFormData({ githubUrl: "" }))

    expect(createProjectRecord).toHaveBeenCalledWith(objectMatch({ githubUrl: null }), 1)
  })

  it("passes the tags in the submitted order", async () => {
    await createProject(initialProjectFormState, buildFormData({}, { tagIds: ["t2", "t1"] }))

    expect(createProjectRecord).toHaveBeenCalledWith(objectMatch({ tagIds: ["t2", "t1"] }), 1)
  })

  it("rejects a duplicated tagId on tagIds without touching the domain", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({}, { tagIds: ["t1", "t1"] }),
    )

    expect(state.errors.tagIds).toBeDefined()
    expect(createProjectRecord).not.toHaveBeenCalled()
  })

  it("returns every submitted format and tagId in values when validation fails", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ slug: "" }, { formats: ["API", "IA"], tagIds: ["t1", "t2"] }),
    )

    expect(state.values?.formats).toEqual(["API", "IA"])
    expect(state.values?.tagIds).toEqual(["t1", "t2"])
  })

  it("passes the display order as the position, outside the written fields", async () => {
    await createProject(initialProjectFormState, buildFormData({ displayOrder: "2" }))

    expect(createProjectRecord).toHaveBeenCalledWith(
      expect.not.objectContaining({ displayOrder: expect.anything() as unknown }),
      2,
    )
  })

  it("answers with the saved id and invalidates the projects caches and the admin lists", async () => {
    const state = await createProject(initialProjectFormState, buildFormData())

    expect(state).toMatchObject({ ok: true, savedId: PROJECT_ID })
    expect(updateCacheTag).toHaveBeenCalledWith("projects")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/projets", "layout")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })

  it("rejects an emptied deliverables count instead of coercing it to zero", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ deliverablesCount: "" }),
    )

    expect(state.errors.deliverablesCount).toEqual(["Le nombre de livrables est requis"])
    expect(createProjectRecord).not.toHaveBeenCalled()
  })

  it("falls back to one deliverable when the field is absent from the form", async () => {
    const formData = buildFormData()
    formData.delete("deliverablesCount")

    await createProject(initialProjectFormState, formData)

    expect(createProjectRecord).toHaveBeenCalledWith(objectMatch({ deliverablesCount: 1 }), 1)
  })

  it("rejects a cover that does not live in a project assets folder", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ coverFilename: "freelance/crm/entreprises/acme/logo.png" }),
    )

    expect(state.errors.coverFilename).toBeDefined()
    expect(createProjectRecord).not.toHaveBeenCalled()
  })

  it("accepts a cover stored in a project assets folder", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ coverFilename: "projets/personal/mon-projet/cover.webp" }),
    )

    expect(state.ok).toBe(true)
  })

  it("returns the submitted values in state when validation fails", async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ slug: "" }))

    expect(state.values?.slug).toBe("")
  })

  it("rejects a call without a session, before touching the domain", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(createProject(initialProjectFormState, buildFormData())).rejects.toThrow()

    expect(createProjectRecord).not.toHaveBeenCalled()
  })
})

describe("updateProject", () => {
  it("passes the parsed id, the fields and the display order as the position", async () => {
    const state = await updateProject(
      "p1",
      initialProjectFormState,
      buildFormData({ slug: "autre", displayOrder: "3" }),
    )

    expect(state.ok).toBe(true)
    expect(updateProjectRecord).toHaveBeenCalledWith(PROJECT_ID, objectMatch({ slug: "autre" }), 3)
    expect(updateCacheTag).toHaveBeenCalledWith("projects")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/projets", "layout")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })

  it("answers project_not_found, keeps the typed values and invalidates the caches when the project was deleted meanwhile", async () => {
    vi.mocked(updateProjectRecord).mockResolvedValueOnce(fail({ code: "not_found" }))

    const state = await updateProject("p1", initialProjectFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.message).toBe("project_not_found")
    expect(state.values?.titleFr).toBe("Mon projet")
    expect(updateCacheTag).toHaveBeenCalledWith("projects")
  })

  it("answers project_not_found for an unreadable id without calling the domain", async () => {
    const state = await updateProject("  ", initialProjectFormState, buildFormData())

    expect(state.message).toBe("project_not_found")
    expect(updateProjectRecord).not.toHaveBeenCalled()
  })

  it("rejects a call without a session, before touching the domain", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(updateProject("p1", initialProjectFormState, buildFormData())).rejects.toThrow()

    expect(updateProjectRecord).not.toHaveBeenCalled()
  })
})

describe.each([
  {
    action: "createProject",
    submit: () => createProject(initialProjectFormState, buildFormData()),
    record: createProjectRecord,
  },
  {
    action: "updateProject",
    submit: () => updateProject("p1", initialProjectFormState, buildFormData()),
    record: updateProjectRecord,
  },
])("$action domain errors", ({ submit, record }) => {
  it.each([
    ["slug_taken", "slug"],
    ["company_not_found", "companyId"],
    ["tag_not_found", "tagIds"],
  ] as const)(
    "translates %s into an error on the %s field without invalidating",
    async (code, field) => {
      vi.mocked(record).mockResolvedValueOnce(fail({ code }))

      const state = await submit()

      expect(state.ok).toBe(false)
      expect(state.message).toBe(code)
      expect(state.errors[field]).toBeDefined()
      expect(state.values?.titleFr).toBe("Mon projet")
      expect(updateCacheTag).not.toHaveBeenCalled()
    },
  )

  it("translates dates_out_of_order into an error on the end date", async () => {
    vi.mocked(record).mockResolvedValueOnce(fail({ code: "dates_out_of_order" }))

    const state = await submit()

    expect(state.message).toBeNull()
    expect(state.errors.endedAt).toEqual(["La date de fin ne peut pas précéder la date de début"])
  })

  it("answers unknown_error when the domain throws", async () => {
    vi.mocked(record).mockRejectedValueOnce(new Error("boom"))

    const state = await submit()

    expect(state.message).toBe("unknown_error")
  })
})

describe("deleteProject", () => {
  it("renumbers the remaining sequence inside the same transaction", async () => {
    vi.mocked(prisma.project.delete).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ id: "p-a" }, { id: "p-c" }] as never)

    await deleteProject("p-b")

    expect(prisma.project.update).toHaveBeenNthCalledWith(1, {
      where: { id: "p-a" },
      data: { displayOrder: 1 },
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(2, {
      where: { id: "p-c" },
      data: { displayOrder: 2 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it("invalidates the caches after deletion", async () => {
    vi.mocked(prisma.project.delete).mockResolvedValueOnce({} as never)

    await deleteProject("p1")

    expect(updateCacheTag).toHaveBeenCalledWith("projects")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/projets", "layout")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })

  it("rejects a call without a session, before any database query", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(deleteProject("p1")).rejects.toThrow()

    expect(prisma.project.delete).not.toHaveBeenCalled()
  })
})

describe("project deleted since the screen loaded", () => {
  it("answers a delete with success", async () => {
    vi.mocked(prisma.project.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.project.count).mockResolvedValueOnce(0)

    const state = await deleteProject("p1")

    expect(state.ok).toBe(true)
  })

  it("answers a delete with unknown_error when the renumbering failed and the project remains", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ id: "p2" }] as never)
    vi.mocked(prisma.project.update).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.project.count).mockResolvedValueOnce(1)

    const state = await deleteProject("p1")

    expect(state.message).toBe("unknown_error")
  })
})

describe("reorderProjects", () => {
  it("rejects a call without a session, before any database query", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(reorderProjects(["p1"])).rejects.toThrow()

    expect(prisma.project.findMany).not.toHaveBeenCalled()
  })

  it("rejects a list containing a duplicate without writing anything", async () => {
    const state = await reorderProjects(["p1", "p1"])

    expect(state).toEqual({ ok: false, message: "invalid_order" })
    expect(prisma.project.findMany).not.toHaveBeenCalled()
  })

  it("rejects a list that does not exactly cover the full set of projects", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ id: "p1" }, { id: "p2" }] as never)

    const state = await reorderProjects(["p1", "p3"])

    expect(state).toEqual({ ok: false, message: "stale_order" })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("rewrites displayOrder from 1 in the received order, inside a transaction, then invalidates the caches", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ id: "p1" }, { id: "p2" }] as never)
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([] as never)

    const state = await reorderProjects(["p2", "p1"])

    expect(state).toEqual({ ok: true, message: null })
    expect(prisma.project.update).toHaveBeenNthCalledWith(1, {
      where: { id: "p2" },
      data: { displayOrder: 1 },
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(2, {
      where: { id: "p1" },
      data: { displayOrder: 2 },
    })
    expect(updateCacheTag).toHaveBeenCalledWith("projects")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/projets", "layout")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })
})
