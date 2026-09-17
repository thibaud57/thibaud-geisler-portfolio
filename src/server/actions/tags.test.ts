import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tag: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { revalidatePath, updateTag as updateCacheTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/get-current-user"
import { createTag, deleteTag, updateTag } from "./tags"
import { initialTagFormState } from "./tags.types"

const VALID = {
  slug: "react",
  nameFr: "React",
  nameEn: "React",
  kind: "FRAMEWORK",
  icon: "",
  displayOrder: "0",
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

  it("accepts an empty icon", async () => {
    vi.mocked(prisma.tag.create).mockResolvedValue({} as never)

    const state = await createTag(initialTagFormState, buildFormData({ icon: "" }))

    expect(state.ok).toBe(true)
  })

  it("normalizes the slug to lowercase", async () => {
    vi.mocked(prisma.tag.create).mockResolvedValue({} as never)

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

  it("rejects a slug containing spaces", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ slug: "next js" }))

    expect(state.errors.slug).toBeDefined()
  })

  it("invalidates the tags cache tag after a successful creation", async () => {
    vi.mocked(prisma.tag.create).mockResolvedValue({} as never)

    await createTag(initialTagFormState, buildFormData())

    expect(updateCacheTag).toHaveBeenCalledWith("tags")
  })

  it("invalidates the projects cache tag after a successful creation", async () => {
    vi.mocked(prisma.tag.create).mockResolvedValue({} as never)

    await createTag(initialTagFormState, buildFormData())

    expect(updateCacheTag).toHaveBeenCalledWith("projects")
  })

  it("invalidates the admin tags path after a successful creation", async () => {
    vi.mocked(prisma.tag.create).mockResolvedValue({} as never)

    await createTag(initialTagFormState, buildFormData())

    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })

  it("translates a uniqueness violation into a field error", async () => {
    vi.mocked(prisma.tag.create).mockRejectedValue({ code: "P2002", meta: { target: ["slug"] } })

    const state = await createTag(initialTagFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.message).toBe("slug_taken")
    expect(state.errors.slug).toBeDefined()
  })

  it("returns the submitted values on failure", async () => {
    const state = await createTag(initialTagFormState, buildFormData({ slug: "", nameFr: "Réact" }))

    expect(state.values?.nameFr).toBe("Réact")
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
    vi.mocked(prisma.tag.update).mockResolvedValue({} as never)

    await updateTag("tag-1", initialTagFormState, buildFormData())

    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })

  it("translates a uniqueness violation into a field error", async () => {
    vi.mocked(prisma.tag.update).mockRejectedValue({ code: "P2002", meta: { target: ["slug"] } })

    const state = await updateTag("tag-1", initialTagFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.message).toBe("slug_taken")
    expect(state.errors.slug).toBeDefined()
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
    vi.mocked(prisma.tag.delete).mockResolvedValue({} as never)

    const state = await deleteTag("tag-1")

    expect(state.ok).toBe(true)
    expect(updateCacheTag).toHaveBeenCalledWith("tags")
    expect(updateCacheTag).toHaveBeenCalledWith("projects")
  })

  it("invalidates the admin tags path after a successful deletion", async () => {
    vi.mocked(prisma.tag.delete).mockResolvedValue({} as never)

    await deleteTag("tag-1")

    expect(revalidatePath).toHaveBeenCalledWith("/admin/tags")
  })

  it("translates a foreign key violation into an explicit message", async () => {
    vi.mocked(prisma.tag.delete).mockRejectedValue({ code: "P2003" })

    const state = await deleteTag("tag-1")

    expect(state.ok).toBe(false)
    expect(state.message).toBe("tag_in_use")
  })

  it("rejects a call without a session, before any validation", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(deleteTag("tag-1")).rejects.toThrow()

    expect(prisma.tag.delete).not.toHaveBeenCalled()
  })
})
