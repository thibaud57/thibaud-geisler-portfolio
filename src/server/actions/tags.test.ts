import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const tag = {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  }
  const prisma = { tag, $transaction: vi.fn() }
  // Sert les deux formes de $transaction (tableau de promesses ou callback interactif) sans
  // configuration par test : chaque test ne mocke que les lectures/écritures qu'il vérifie.
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
import { createTag, deleteTag, reorderTags, updateTag } from "./tags"
import { initialTagFormState } from "./tags.types"

const VALID = {
  slug: "react",
  nameFr: "React",
  nameEn: "React",
  kind: "FRAMEWORK",
  icon: "",
  displayOrder: "1",
} as const

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...VALID, ...overrides })) {
    data.set(key, value)
  }
  return data
}

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie ici.
function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

describe("createTag", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("rejects an empty slug without touching the database", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ slug: "" }))

    expect(state.ok).toBe(false)
    expect(state.errors.slug).toBeDefined()
    expect(prisma.tag.create).not.toHaveBeenCalled()
  })

  it("rejects an empty French name", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ nameFr: "" }))

    expect(state.errors.nameFr).toBeDefined()
  })

  it("rejects an empty English name", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ nameEn: "" }))

    expect(state.errors.nameEn).toBeDefined()
  })

  it("rejects a category outside the enum", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ kind: "AUTRE" }))

    expect(state.errors.kind).toBeDefined()
    expect(prisma.tag.create).not.toHaveBeenCalled()
  })

  it("rejects an icon absent from the registry", async () => {
    const state = await createTag(
      initialTagFormState,
      buildFormData({ icon: "simple-icons:inexistant" }),
    )

    expect(state.errors.icon).toBeDefined()
  })

  it("accepts an empty icon and stores it as null", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.tag.create).mockResolvedValue({ id: "tag-new" } as never)

    const state = await createTag(initialTagFormState, buildFormData({ icon: "" }))

    expect(state.ok).toBe(true)
    expect(prisma.tag.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ icon: null }) }),
    )
  })

  it("normalizes the slug to lowercase", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.tag.create).mockResolvedValue({ id: "tag-new" } as never)

    await createTag(initialTagFormState, buildFormData({ slug: "React" }))

    expect(prisma.tag.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ slug: "react" }) }),
    )
  })

  it("rejects an empty display order instead of coercing it to zero", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ displayOrder: "" }))

    expect(state.errors.displayOrder).toBeDefined()
    expect(prisma.tag.create).not.toHaveBeenCalled()
  })

  it("rejects a display order below 1", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ displayOrder: "0" }))

    expect(state.errors.displayOrder).toBeDefined()
    expect(prisma.tag.create).not.toHaveBeenCalled()
  })

  it("rejects a slug containing spaces", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ slug: "next js" }))

    expect(state.errors.slug).toBeDefined()
  })

  it("invalidates the tags and projects cache tags and the admin tags path after a successful creation", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.tag.create).mockResolvedValue({ id: "tag-new" } as never)

    await createTag(initialTagFormState, buildFormData())

    expect(updateCacheTag).toHaveBeenCalledWith("tags")
    expect(updateCacheTag).toHaveBeenCalledWith("projects")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })

  it("translates a uniqueness violation into a field error", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.tag.create).mockRejectedValue({ code: "P2002", meta: { target: ["slug"] } })

    const state = await createTag(initialTagFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.message).toBe("slug_taken")
    expect(state.errors.slug).toBeDefined()
  })

  it("creates a tag at an occupied position and rewrites the whole category inside a transaction", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([
      { id: "tag-1" },
      { id: "tag-2" },
      { id: "tag-3" },
    ] as never)
    vi.mocked(prisma.tag.create).mockResolvedValue({ id: "tag-new" } as never)
    vi.mocked(prisma.tag.update).mockResolvedValue({} as never)

    await createTag(initialTagFormState, buildFormData({ displayOrder: "2" }))

    expect(prisma.tag.create).toHaveBeenCalledTimes(1)
    expect(prisma.tag.update).toHaveBeenNthCalledWith(1, {
      where: { id: "tag-1" },
      data: { displayOrder: 1 },
    })
    expect(prisma.tag.update).toHaveBeenNthCalledWith(2, {
      where: { id: "tag-new" },
      data: { displayOrder: 2 },
    })
    expect(prisma.tag.update).toHaveBeenNthCalledWith(3, {
      where: { id: "tag-2" },
      data: { displayOrder: 3 },
    })
    expect(prisma.tag.update).toHaveBeenNthCalledWith(4, {
      where: { id: "tag-3" },
      data: { displayOrder: 4 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it("rejects a call without a session, before any validation", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(createTag(initialTagFormState, buildFormData())).rejects.toThrow()

    expect(prisma.tag.create).not.toHaveBeenCalled()
  })
})

describe("updateTag", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("updates a tag and invalidates the tags and projects cache tags", async () => {
    vi.mocked(prisma.tag.findUniqueOrThrow).mockResolvedValue({ kind: "FRAMEWORK" } as never)
    vi.mocked(prisma.tag.findMany).mockResolvedValue([{ id: "tag-1" }] as never)
    vi.mocked(prisma.tag.update).mockResolvedValue({} as never)

    const state = await updateTag("tag-1", initialTagFormState, buildFormData({ slug: "vue" }))

    expect(state.ok).toBe(true)
    expect(prisma.tag.update).toHaveBeenCalledWith(
      objectMatch({ where: { id: "tag-1" }, data: objectMatch({ slug: "vue" }) }),
    )
    expect(updateCacheTag).toHaveBeenCalledWith("tags")
    expect(updateCacheTag).toHaveBeenCalledWith("projects")
  })

  it("invalidates the admin tags path after a successful update", async () => {
    vi.mocked(prisma.tag.findUniqueOrThrow).mockResolvedValue({ kind: "FRAMEWORK" } as never)
    vi.mocked(prisma.tag.findMany).mockResolvedValue([{ id: "tag-1" }] as never)
    vi.mocked(prisma.tag.update).mockResolvedValue({} as never)

    await updateTag("tag-1", initialTagFormState, buildFormData())

    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })

  it("translates a uniqueness violation into a field error", async () => {
    vi.mocked(prisma.tag.findUniqueOrThrow).mockResolvedValue({ kind: "FRAMEWORK" } as never)
    vi.mocked(prisma.tag.findMany).mockResolvedValue([{ id: "tag-1" }] as never)
    vi.mocked(prisma.tag.update).mockRejectedValue({ code: "P2002", meta: { target: ["slug"] } })

    const state = await updateTag("tag-1", initialTagFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.message).toBe("slug_taken")
    expect(state.errors.slug).toBeDefined()
  })

  it("moves a tag within its category and rewrites the whole category inside a transaction", async () => {
    vi.mocked(prisma.tag.findUniqueOrThrow).mockResolvedValue({ kind: "FRAMEWORK" } as never)
    vi.mocked(prisma.tag.findMany).mockResolvedValue([
      { id: "tag-1" },
      { id: "tag-2" },
      { id: "tag-3" },
    ] as never)
    vi.mocked(prisma.tag.update).mockResolvedValue({} as never)

    await updateTag("tag-3", initialTagFormState, buildFormData({ displayOrder: "1" }))

    expect(prisma.tag.update).toHaveBeenNthCalledWith(1, {
      where: { id: "tag-3" },
      data: objectMatch({ displayOrder: 1 }),
    })
    expect(prisma.tag.update).toHaveBeenNthCalledWith(2, {
      where: { id: "tag-1" },
      data: { displayOrder: 2 },
    })
    expect(prisma.tag.update).toHaveBeenNthCalledWith(3, {
      where: { id: "tag-2" },
      data: { displayOrder: 3 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it("moves a tag to a different category and rewrites both categories inside a transaction", async () => {
    vi.mocked(prisma.tag.findUniqueOrThrow).mockResolvedValue({ kind: "FRAMEWORK" } as never)
    vi.mocked(prisma.tag.findMany)
      .mockResolvedValueOnce([{ id: "tag-1" }, { id: "tag-2" }, { id: "tag-3" }] as never)
      .mockResolvedValueOnce([{ id: "tag-4" }] as never)
    vi.mocked(prisma.tag.update).mockResolvedValue({} as never)

    await updateTag(
      "tag-2",
      initialTagFormState,
      buildFormData({ kind: "LANGUAGE", displayOrder: "1" }),
    )

    expect(prisma.tag.update).toHaveBeenNthCalledWith(1, {
      where: { id: "tag-1" },
      data: { displayOrder: 1 },
    })
    expect(prisma.tag.update).toHaveBeenNthCalledWith(2, {
      where: { id: "tag-3" },
      data: { displayOrder: 2 },
    })
    expect(prisma.tag.update).toHaveBeenNthCalledWith(3, {
      where: { id: "tag-2" },
      data: objectMatch({ kind: "LANGUAGE", displayOrder: 1 }),
    })
    expect(prisma.tag.update).toHaveBeenNthCalledWith(4, {
      where: { id: "tag-4" },
      data: { displayOrder: 2 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it("rejects a call without a session, before any validation", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(updateTag("tag-1", initialTagFormState, buildFormData())).rejects.toThrow()

    expect(prisma.tag.update).not.toHaveBeenCalled()
  })
})

describe("deleteTag", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("deletes an unused tag and invalidates the tags and projects cache tags", async () => {
    vi.mocked(prisma.tag.delete).mockResolvedValue({ kind: "FRAMEWORK" } as never)
    vi.mocked(prisma.tag.findMany).mockResolvedValue([] as never)

    const state = await deleteTag("tag-1")

    expect(state.ok).toBe(true)
    expect(updateCacheTag).toHaveBeenCalledWith("tags")
    expect(updateCacheTag).toHaveBeenCalledWith("projects")
  })

  it("invalidates the admin tags path after a successful deletion", async () => {
    vi.mocked(prisma.tag.delete).mockResolvedValue({ kind: "FRAMEWORK" } as never)
    vi.mocked(prisma.tag.findMany).mockResolvedValue([] as never)

    await deleteTag("tag-1")

    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })

  it("renumbers the remaining category inside the same transaction after a deletion", async () => {
    vi.mocked(prisma.tag.delete).mockResolvedValue({ kind: "FRAMEWORK" } as never)
    vi.mocked(prisma.tag.findMany).mockResolvedValue([
      { id: "tag-1" },
      { id: "tag-2" },
      { id: "tag-3" },
    ] as never)
    vi.mocked(prisma.tag.update).mockResolvedValue({} as never)

    await deleteTag("tag-2")

    expect(prisma.tag.update).toHaveBeenNthCalledWith(1, {
      where: { id: "tag-1" },
      data: { displayOrder: 1 },
    })
    expect(prisma.tag.update).toHaveBeenNthCalledWith(2, {
      where: { id: "tag-3" },
      data: { displayOrder: 2 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it("translates a foreign key violation into an explicit message without renumbering anything", async () => {
    vi.mocked(prisma.tag.delete).mockRejectedValue({ code: "P2003" })

    const state = await deleteTag("tag-1")

    expect(state.ok).toBe(false)
    expect(state.message).toBe("tag_in_use")
    expect(prisma.tag.findMany).not.toHaveBeenCalled()
    expect(prisma.tag.update).not.toHaveBeenCalled()
  })

  it("rejects a call without a session, before any validation", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(deleteTag("tag-1")).rejects.toThrow()

    expect(prisma.tag.delete).not.toHaveBeenCalled()
  })
})

describe("reorderTags", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(reorderTags("FRAMEWORK", ["tag-1"])).rejects.toThrow()

    expect(prisma.tag.findMany).not.toHaveBeenCalled()
  })

  it("rejects an ids array containing a duplicate without writing anything", async () => {
    const state = await reorderTags("FRAMEWORK", ["tag-1", "tag-1"])

    expect(state).toEqual({ ok: false, message: "invalid_order" })
    expect(prisma.tag.findMany).not.toHaveBeenCalled()
  })

  it("rejects an order that does not exactly cover the category's tags", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([{ id: "tag-1" }, { id: "tag-2" }] as never)

    const state = await reorderTags("FRAMEWORK", ["tag-1", "tag-3"])

    expect(state).toEqual({ ok: false, message: "stale_order" })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("rewrites displayOrder from 1 in the received order, inside a transaction", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([{ id: "tag-1" }, { id: "tag-2" }] as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)

    const state = await reorderTags("FRAMEWORK", ["tag-2", "tag-1"])

    expect(state).toEqual({ ok: true, message: null })
    expect(prisma.tag.update).toHaveBeenNthCalledWith(1, {
      where: { id: "tag-2" },
      data: { displayOrder: 1 },
    })
    expect(prisma.tag.update).toHaveBeenNthCalledWith(2, {
      where: { id: "tag-1" },
      data: { displayOrder: 2 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it("invalidates the tags and projects cache tags and the admin tags path after success", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([{ id: "tag-1" }] as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)

    await reorderTags("FRAMEWORK", ["tag-1"])

    expect(updateCacheTag).toHaveBeenCalledWith("tags")
    expect(updateCacheTag).toHaveBeenCalledWith("projects")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })
})
