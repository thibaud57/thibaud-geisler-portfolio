import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const tag = {
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
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
vi.mock("@/server/portfolio/tags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/portfolio/tags")>()),
  createTag: vi.fn(),
  updateTag: vi.fn(),
}))

import { revalidatePath, updateTag as updateCacheTag } from "next/cache"
import { getCurrentUser } from "@/lib/get-current-user"
import { tagIdSchema } from "@/lib/ids"
import { constraintViolation, objectMatch } from "@/lib/matchers-test-setup"
import { prisma } from "@/lib/prisma"
import { fail, ok } from "@/server/result"
import { createTag as createTagRecord, updateTag as updateTagRecord } from "@/server/portfolio/tags"
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

const TAG_ID = tagIdSchema.parse("tag-1")

beforeEach(() => {
  vi.mocked(prisma.tag.findMany).mockResolvedValue([] as never)
  vi.mocked(prisma.tag.update).mockResolvedValue({} as never)
  vi.mocked(prisma.tag.delete).mockResolvedValue({ kind: "FRAMEWORK" } as never)
  vi.mocked(createTagRecord).mockResolvedValue(ok({ id: TAG_ID, slug: "react" }))
  vi.mocked(updateTagRecord).mockResolvedValue(ok({ id: TAG_ID, slug: "react" }))
})

describe("createTag", () => {
  it("rejects an empty slug without touching the domain", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ slug: "" }))

    expect(state.ok).toBe(false)
    expect(state.errors.slug).toBeDefined()
    expect(createTagRecord).not.toHaveBeenCalled()
  })

  it("rejects a category outside the enum", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ kind: "AUTRE" }))

    expect(state.errors.kind).toBeDefined()
    expect(createTagRecord).not.toHaveBeenCalled()
  })

  it("rejects an icon absent from the registry", async () => {
    const state = await createTag(
      initialTagFormState,
      buildFormData({ icon: "simple-icons:inexistant" }),
    )

    expect(state.errors.icon).toBeDefined()
  })

  it("accepts an empty icon and passes it as null", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ icon: "" }))

    expect(state.ok).toBe(true)
    expect(createTagRecord).toHaveBeenCalledWith(objectMatch({ icon: null }), 1)
  })

  it("normalizes the slug to lowercase", async () => {
    await createTag(initialTagFormState, buildFormData({ slug: "React" }))

    expect(createTagRecord).toHaveBeenCalledWith(objectMatch({ slug: "react" }), 1)
  })

  it("passes the display order as the position", async () => {
    await createTag(initialTagFormState, buildFormData({ displayOrder: "2" }))

    expect(createTagRecord).toHaveBeenCalledWith(objectMatch({ slug: "react" }), 2)
  })

  it("rejects an empty display order instead of coercing it to zero", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ displayOrder: "" }))

    expect(state.errors.displayOrder).toBeDefined()
    expect(createTagRecord).not.toHaveBeenCalled()
  })

  it("rejects a display order below 1", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ displayOrder: "0" }))

    expect(state.errors.displayOrder).toBeDefined()
    expect(createTagRecord).not.toHaveBeenCalled()
  })

  it("rejects a slug containing spaces", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ slug: "next js" }))

    expect(state.errors.slug).toBeDefined()
  })

  it("invalidates the tags and projects cache tags and the admin tags path after a successful creation", async () => {
    await createTag(initialTagFormState, buildFormData())

    expect(updateCacheTag).toHaveBeenCalledWith("tags")
    expect(updateCacheTag).toHaveBeenCalledWith("projects")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })

  it("rejects a call without a session, before any validation", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(createTag(initialTagFormState, buildFormData())).rejects.toThrow()

    expect(createTagRecord).not.toHaveBeenCalled()
  })
})

describe("updateTag", () => {
  it("updates a tag with its fields and position and invalidates the caches", async () => {
    const state = await updateTag("tag-1", initialTagFormState, buildFormData({ slug: "vue" }))

    expect(state.ok).toBe(true)
    expect(updateTagRecord).toHaveBeenCalledWith(TAG_ID, objectMatch({ slug: "vue" }), 1)
    expect(updateCacheTag).toHaveBeenCalledWith("tags")
    expect(updateCacheTag).toHaveBeenCalledWith("projects")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })

  it("answers tag_not_found and invalidates the caches when the tag was deleted meanwhile", async () => {
    vi.mocked(updateTagRecord).mockResolvedValueOnce(fail({ code: "not_found" }))

    const state = await updateTag("tag-1", initialTagFormState, buildFormData())

    expect(state.message).toBe("tag_not_found")
    expect(updateCacheTag).toHaveBeenCalledWith("tags")
  })

  it("answers tag_not_found for an unreadable id without calling the domain", async () => {
    const state = await updateTag("  ", initialTagFormState, buildFormData())

    expect(state.message).toBe("tag_not_found")
    expect(updateTagRecord).not.toHaveBeenCalled()
  })

  it("rejects a call without a session, before any validation", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(updateTag("tag-1", initialTagFormState, buildFormData())).rejects.toThrow()

    expect(updateTagRecord).not.toHaveBeenCalled()
  })
})

describe.each([
  {
    action: "createTag",
    submit: () => createTag(initialTagFormState, buildFormData()),
    record: createTagRecord,
  },
  {
    action: "updateTag",
    submit: () => updateTag("tag-1", initialTagFormState, buildFormData()),
    record: updateTagRecord,
  },
])("$action domain errors", ({ submit, record }) => {
  it("translates a taken slug into a field error without invalidating", async () => {
    vi.mocked(record).mockResolvedValueOnce(fail({ code: "slug_taken" }))

    const state = await submit()

    expect(state.ok).toBe(false)
    expect(state.message).toBe("slug_taken")
    expect(state.errors.slug).toEqual(["Ce slug est déjà utilisé."])
    expect(updateCacheTag).not.toHaveBeenCalled()
  })

  it("answers unknown_error when the domain throws", async () => {
    vi.mocked(record).mockRejectedValueOnce(new Error("boom"))

    const state = await submit()

    expect(state.message).toBe("unknown_error")
  })
})

describe("deleteTag", () => {
  it("deletes an unused tag and invalidates the tags and projects cache tags", async () => {
    const state = await deleteTag("tag-1")

    expect(state.ok).toBe(true)
    expect(updateCacheTag).toHaveBeenCalledWith("tags")
    expect(updateCacheTag).toHaveBeenCalledWith("projects")
  })

  it("invalidates the admin tags path after a successful deletion", async () => {
    await deleteTag("tag-1")

    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })

  it("renumbers the remaining category inside the same transaction after a deletion", async () => {
    vi.mocked(prisma.tag.findMany).mockResolvedValue([
      { id: "tag-1" },
      { id: "tag-2" },
      { id: "tag-3" },
    ] as never)

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
    vi.mocked(prisma.tag.delete).mockRejectedValueOnce(
      constraintViolation("P2003", "ProjectTag_tagId_fkey"),
    )

    const state = await deleteTag("tag-1")

    expect(state.ok).toBe(false)
    expect(state.message).toBe("tag_in_use")
    expect(prisma.tag.findMany).not.toHaveBeenCalled()
    expect(prisma.tag.update).not.toHaveBeenCalled()
  })

  it("treats a tag already deleted elsewhere as deleted", async () => {
    vi.mocked(prisma.tag.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.tag.count).mockResolvedValueOnce(0)

    const state = await deleteTag("tag-1")

    expect(state.ok).toBe(true)
  })

  it("answers unknown_error on a P2025 while the tag still exists", async () => {
    vi.mocked(prisma.tag.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.tag.count).mockResolvedValueOnce(1)

    const state = await deleteTag("tag-1")

    expect(state.message).toBe("unknown_error")
  })

  it("rejects a call without a session, before any validation", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(deleteTag("tag-1")).rejects.toThrow()

    expect(prisma.tag.delete).not.toHaveBeenCalled()
  })
})

describe("reorderTags", () => {
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
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([] as never)

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
    vi.mocked(prisma.$transaction).mockResolvedValueOnce([] as never)

    await reorderTags("FRAMEWORK", ["tag-1"])

    expect(updateCacheTag).toHaveBeenCalledWith("tags")
    expect(updateCacheTag).toHaveBeenCalledWith("projects")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })
})
