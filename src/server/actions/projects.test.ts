import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const project = { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn() }
  const clientMeta = { create: vi.fn(), upsert: vi.fn() }
  const projectTag = { deleteMany: vi.fn(), createMany: vi.fn() }
  const prisma = { project, clientMeta, projectTag, $transaction: vi.fn() }
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

import { revalidatePath, updateTag as updateCacheTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/get-current-user"
import { createProject, deleteProject, reorderProjects, updateProject } from "./projects"
import { initialProjectFormState } from "./projects.types"

function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

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

function mockCreationInEmptyList(): void {
  vi.mocked(prisma.project.findMany).mockResolvedValue([])
  vi.mocked(prisma.project.create).mockResolvedValue({ id: "p1" } as never)
}

describe("createProject", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("rejects an empty slug without opening a transaction", async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ slug: "" }))

    expect(state.errors.slug).toBeDefined()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("rejects an empty French title", async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ titleFr: "" }))

    expect(state.errors.titleFr).toBeDefined()
  })

  it("rejects an empty English title", async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ titleEn: "" }))

    expect(state.errors.titleEn).toBeDefined()
  })

  it("rejects an unknown type", async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ type: "AUTRE" }))

    expect(state.errors.type).toBeDefined()
  })

  it("rejects an unknown status", async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ status: "AUTRE" }))

    expect(state.errors.status).toBeDefined()
  })

  it("rejects an unknown format", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({}, { formats: ["INCONNU"] }),
    )

    expect(state.errors.formats).toBeDefined()
  })

  it("keeps every submitted format", async () => {
    mockCreationInEmptyList()

    await createProject(initialProjectFormState, buildFormData({}, { formats: ["API", "IA"] }))

    expect(prisma.project.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ formats: ["API", "IA"] }) }),
    )
  })

  it.each(["CLIENT", "PERSONAL"])("rejects a %s project without a company", async (type) => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ type, companyId: "" }),
    )

    expect(state.errors.companyId).toBeDefined()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it.each(["CLIENT", "PERSONAL"])("rejects a %s project without a work mode", async (type) => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ type, workMode: "" }),
    )

    expect(state.errors.workMode).toBeDefined()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("creates the client meta for a client project", async () => {
    mockCreationInEmptyList()

    await createProject(
      initialProjectFormState,
      buildFormData({ type: "CLIENT", companyId: "c1", workMode: "HYBRIDE" }),
    )

    expect(prisma.clientMeta.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ projectId: "p1", companyId: "c1", workMode: "HYBRIDE" }) }),
    )
  })

  it("creates the meta for a personal project, just like for a client project", async () => {
    mockCreationInEmptyList()

    await createProject(
      initialProjectFormState,
      buildFormData({ type: "PERSONAL", companyId: "c-owner", workMode: "REMOTE" }),
    )

    expect(prisma.clientMeta.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({ projectId: "p1", companyId: "c-owner", workMode: "REMOTE" }),
      }),
    )
  })

  it("rejects an end date earlier than the start date", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ startedAt: "2026-06-01", endedAt: "2026-01-01" }),
    )

    expect(state.errors.endedAt).toBeDefined()
  })

  it("accepts missing dates", async () => {
    mockCreationInEmptyList()

    const state = await createProject(
      initialProjectFormState,
      buildFormData({ startedAt: "", endedAt: "" }),
    )

    expect(state.ok).toBe(true)
  })

  it("rejects a javascript: URL on githubUrl", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ githubUrl: "javascript:alert(1)" }),
    )

    expect(state.ok).toBe(false)
    expect(state.errors.githubUrl).toBeDefined()
    expect(prisma.project.create).not.toHaveBeenCalled()
  })

  it("rejects a javascript: URL on demoUrl", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ demoUrl: "javascript:alert(1)" }),
    )

    expect(state.ok).toBe(false)
    expect(state.errors.demoUrl).toBeDefined()
    expect(prisma.project.create).not.toHaveBeenCalled()
  })

  it("rejects a malformed URL", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ githubUrl: "pas-une-url" }),
    )

    expect(state.errors.githubUrl).toBeDefined()
  })

  it("stores an empty URL as null", async () => {
    mockCreationInEmptyList()

    await createProject(initialProjectFormState, buildFormData({ githubUrl: "" }))

    expect(prisma.project.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ githubUrl: null }) }),
    )
  })

  it("attaches tags in the submitted order, starting at 1", async () => {
    mockCreationInEmptyList()

    await createProject(initialProjectFormState, buildFormData({}, { tagIds: ["t2", "t1"] }))

    expect(prisma.projectTag.createMany).toHaveBeenCalledWith(
      objectMatch({
        data: [
          { projectId: "p1", tagId: "t2", displayOrder: 1 },
          { projectId: "p1", tagId: "t1", displayOrder: 2 },
        ],
      }),
    )
  })

  it("rejects a duplicated tagId on tagIds without opening a transaction", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({}, { tagIds: ["t1", "t1"] }),
    )

    expect(state.errors.tagIds).toBeDefined()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("returns every submitted format and tagId in values when validation fails", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ slug: "" }, { formats: ["API", "IA"], tagIds: ["t1", "t2"] }),
    )

    expect(state.values?.formats).toEqual(["API", "IA"])
    expect(state.values?.tagIds).toEqual(["t1", "t2"])
  })

  it("creates a project at an occupied position and shifts the following ones, inside a transaction", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      { id: "p-a" },
      { id: "p-b" },
      { id: "p-c" },
    ] as never)
    vi.mocked(prisma.project.create).mockResolvedValue({ id: "p-new" } as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

    await createProject(initialProjectFormState, buildFormData({ displayOrder: "2" }))

    expect(prisma.project.create).toHaveBeenCalledTimes(1)
    expect(prisma.project.update).toHaveBeenNthCalledWith(1, {
      where: { id: "p-a" },
      data: { displayOrder: 1 },
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(2, {
      where: { id: "p-new" },
      data: { displayOrder: 2 },
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(3, {
      where: { id: "p-b" },
      data: { displayOrder: 3 },
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(4, {
      where: { id: "p-c" },
      data: { displayOrder: 4 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it("opens a transaction", async () => {
    mockCreationInEmptyList()

    await createProject(initialProjectFormState, buildFormData())

    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it("invalidates the projects cache tag", async () => {
    mockCreationInEmptyList()

    await createProject(initialProjectFormState, buildFormData())

    expect(updateCacheTag).toHaveBeenCalledWith("projects")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/projets")
  })

  it("translates a slug uniqueness violation into a field error", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    vi.mocked(prisma.project.create).mockRejectedValue({
      code: "P2002",
      meta: { target: ["slug"] },
    })

    const state = await createProject(initialProjectFormState, buildFormData())

    expect(state.message).toBe("slug_taken")
    expect(state.errors.slug).toBeDefined()
  })

  it("falls back to unknown_error when a P2002 violation does not target the slug", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    vi.mocked(prisma.project.create).mockRejectedValue({
      code: "P2002",
      meta: { target: ["projectId", "tagId"] },
    })

    const state = await createProject(initialProjectFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
    expect(state.errors.slug).toBeUndefined()
  })

  it("reports a deleted company on the companyId field instead of an unknown error", async () => {
    mockCreationInEmptyList()
    vi.mocked(prisma.clientMeta.create).mockRejectedValueOnce({
      code: "P2003",
      meta: {
        driverAdapterError: { cause: { constraint: { index: "ClientMeta_companyId_fkey" } } },
      },
    })

    const state = await createProject(initialProjectFormState, buildFormData())

    expect(state.message).toBe("company_not_found")
    expect(state.errors.companyId).toBeDefined()
  })

  it("reports a deleted tag on the tagIds field instead of an unknown error", async () => {
    mockCreationInEmptyList()
    vi.mocked(prisma.projectTag.createMany).mockRejectedValueOnce({
      code: "P2003",
      meta: { driverAdapterError: { cause: { constraint: { index: "ProjectTag_tagId_fkey" } } } },
    })

    const state = await createProject(
      initialProjectFormState,
      buildFormData({}, { tagIds: ["t1"] }),
    )

    expect(state.message).toBe("tag_not_found")
    expect(state.errors.tagIds).toBeDefined()
  })

  it("rejects an emptied deliverables count instead of coercing it to zero", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ deliverablesCount: "" }),
    )

    expect(state.errors.deliverablesCount).toEqual(["Le nombre de livrables est requis"])
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("falls back to one deliverable when the field is absent from the form", async () => {
    mockCreationInEmptyList()
    const formData = buildFormData()
    formData.delete("deliverablesCount")

    await createProject(initialProjectFormState, formData)

    expect(prisma.clientMeta.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ deliverablesCount: 1 }) }),
    )
  })

  it("rejects a cover that does not live in a project assets folder", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ coverFilename: "freelance/crm/entreprises/foyer/logo.png" }),
    )

    expect(state.errors.coverFilename).toBeDefined()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("accepts a cover stored in a project assets folder", async () => {
    mockCreationInEmptyList()

    const state = await createProject(
      initialProjectFormState,
      buildFormData({ coverFilename: "projets/personal/mon-projet/cover.webp" }),
    )

    expect(state.ok).toBe(true)
  })

  it("reads the current order inside the transaction, so a concurrent write cannot slip in between", async () => {
    mockCreationInEmptyList()

    await createProject(initialProjectFormState, buildFormData())

    const transactionOrder = vi.mocked(prisma.$transaction).mock.invocationCallOrder[0] ?? 0
    const readOrder = vi.mocked(prisma.project.findMany).mock.invocationCallOrder[0] ?? 0
    expect(transactionOrder).toBeGreaterThan(0)
    expect(readOrder).toBeGreaterThan(transactionOrder)
  })

  it("returns the submitted values in state when validation fails", async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ slug: "" }))

    expect(state.values?.slug).toBe("")
  })

  it("rejects a call without a session, before opening the transaction", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(createProject(initialProjectFormState, buildFormData())).rejects.toThrow()

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})

describe("updateProject", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it.each(["CLIENT", "PERSONAL"])(
    "creates or updates the meta when the submitted type is %s",
    async (type) => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([{ id: "p1" }] as never)
      vi.mocked(prisma.project.update).mockResolvedValue({} as never)

      await updateProject(
        "p1",
        initialProjectFormState,
        buildFormData({ type, companyId: "c2", workMode: "HYBRIDE" }),
      )

      expect(prisma.clientMeta.upsert).toHaveBeenCalledWith(
        objectMatch({
          where: { projectId: "p1" },
          create: objectMatch({ projectId: "p1", companyId: "c2", workMode: "HYBRIDE" }),
          update: objectMatch({ companyId: "c2", workMode: "HYBRIDE" }),
        }),
      )
    },
  )

  it("rejects a call without a session, before opening the transaction", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(updateProject("p1", initialProjectFormState, buildFormData())).rejects.toThrow()

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("replaces the whole tag set, starting at 1", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ id: "p1" }] as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

    await updateProject("p1", initialProjectFormState, buildFormData({}, { tagIds: ["t3"] }))

    expect(prisma.projectTag.deleteMany).toHaveBeenCalledWith({ where: { projectId: "p1" } })
    expect(prisma.projectTag.createMany).toHaveBeenCalledWith(
      objectMatch({ data: [{ projectId: "p1", tagId: "t3", displayOrder: 1 }] }),
    )
  })

  it("moves a project and closes its former position, inside a transaction", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      { id: "p-a" },
      { id: "p-b" },
      { id: "p-c" },
    ] as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

    await updateProject("p-c", initialProjectFormState, buildFormData({ displayOrder: "1" }))

    expect(prisma.project.update).toHaveBeenNthCalledWith(1, {
      where: { id: "p-c" },
      data: objectMatch({ displayOrder: 1 }),
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(2, {
      where: { id: "p-a" },
      data: { displayOrder: 2 },
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(3, {
      where: { id: "p-b" },
      data: { displayOrder: 3 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})

describe("deleteProject", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renumbers the remaining sequence inside the same transaction", async () => {
    vi.mocked(prisma.project.delete).mockResolvedValue({} as never)
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ id: "p-a" }, { id: "p-c" }] as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

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
    vi.mocked(prisma.project.delete).mockResolvedValue({} as never)
    vi.mocked(prisma.project.findMany).mockResolvedValue([])

    await deleteProject("p1")

    expect(updateCacheTag).toHaveBeenCalledWith("projects")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/projets")
  })

  it("rejects a call without a session, before any database query", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(deleteProject("p1")).rejects.toThrow()

    expect(prisma.project.delete).not.toHaveBeenCalled()
  })
})

describe("reorderProjects", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

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
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)

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
    expect(revalidatePath).toHaveBeenCalledWith("/admin/projets")
  })
})
