import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest"

import type { TagKind } from "@/generated/prisma/client"
import { tagIdSchema } from "@/lib/ids"
import {
  prisma,
  resetDatabase,
  seedTag,
  sequence,
  slugsAndOrders,
  tagIdOf,
} from "@/lib/prisma-test-setup"

import { createTag, updateTag, type TagWriteData } from "./tags"

function tagData(overrides: Partial<TagWriteData> = {}): TagWriteData {
  return {
    slug: "react",
    nameFr: "React",
    nameEn: "React",
    kind: "FRAMEWORK",
    icon: null,
    ...overrides,
  }
}

async function seedCategory(kind: TagKind, slugs: readonly string[]): Promise<void> {
  for (const [index, slug] of slugs.entries())
    await seedTag({ slug, kind, displayOrder: index + 1 })
}

async function categorySlugs(kind: TagKind) {
  return slugsAndOrders(
    await prisma.tag.findMany({ where: { kind }, orderBy: { displayOrder: "asc" } }),
  )
}

const UNKNOWN_ID = tagIdSchema.parse("missing-tag")

beforeEach(async () => {
  await resetDatabase()
})

describe("createTag", () => {
  it("creates a tag at the end of its category without a position", async () => {
    await seedCategory("FRAMEWORK", ["next", "vue"])

    const result = await createTag(tagData({ slug: "svelte" }))

    expect(result.ok).toBe(true)
    expect(await categorySlugs("FRAMEWORK")).toEqual({
      slugs: ["next", "vue", "svelte"],
      orders: sequence(3),
    })
  })

  it("leaves the other tags of the category untouched without a position", async () => {
    const next = await seedTag({ slug: "next", displayOrder: 1 })
    const vue = await seedTag({ slug: "vue", displayOrder: 2 })

    await createTag(tagData({ slug: "svelte" }))

    const others = await prisma.tag.findMany({
      where: { id: { in: [next.id, vue.id] } },
      orderBy: { displayOrder: "asc" },
    })
    expect(others.map((tag) => tag.updatedAt)).toEqual([next.updatedAt, vue.updatedAt])
  })

  it("takes the order after the highest of a category with a gap without a position", async () => {
    await seedTag({ slug: "next", displayOrder: 1 })
    await seedTag({ slug: "nuxt", displayOrder: 3 })

    await createTag(tagData({ slug: "svelte" }))

    expect(await categorySlugs("FRAMEWORK")).toEqual({
      slugs: ["next", "nuxt", "svelte"],
      orders: [1, 3, 4],
    })
  })

  it("creates a tag at the given position and renumbers the category", async () => {
    await seedCategory("FRAMEWORK", ["next", "vue", "nuxt"])

    const result = await createTag(tagData({ slug: "svelte" }), 2)

    expect(result).toMatchObject({ ok: true, value: { slug: "svelte" } })
    expect(await categorySlugs("FRAMEWORK")).toEqual({
      slugs: ["next", "svelte", "vue", "nuxt"],
      orders: sequence(4),
    })
  })
})

describe("updateTag", () => {
  it("moves a tag to the end of its new category and closes the gap in the old one", async () => {
    await seedTag({ slug: "next", displayOrder: 1 })
    const vue = tagIdOf(await seedTag({ slug: "vue", displayOrder: 2 }))
    await seedTag({ slug: "nuxt", displayOrder: 3 })
    await seedCategory("LANGUAGE", ["typescript", "python"])

    const result = await updateTag(vue, { kind: "LANGUAGE" })

    expect(result).toMatchObject({ ok: true, value: { id: vue, slug: "vue" } })
    expect(await categorySlugs("FRAMEWORK")).toEqual({
      slugs: ["next", "nuxt"],
      orders: sequence(2),
    })
    expect(await categorySlugs("LANGUAGE")).toEqual({
      slugs: ["typescript", "python", "vue"],
      orders: sequence(3),
    })
  })

  it("keeps the position of a tag whose patch repeats its current category", async () => {
    await seedTag({ slug: "next", displayOrder: 1 })
    const vue = tagIdOf(await seedTag({ slug: "vue", displayOrder: 2 }))
    await seedTag({ slug: "nuxt", displayOrder: 3 })

    await updateTag(vue, { kind: "FRAMEWORK", nameFr: "Vue.js" })

    expect(await categorySlugs("FRAMEWORK")).toEqual({
      slugs: ["next", "vue", "nuxt"],
      orders: sequence(3),
    })
    expect((await prisma.tag.findUniqueOrThrow({ where: { id: vue } })).nameFr).toBe("Vue.js")
  })

  it("moves a tag within its category to the given position", async () => {
    await seedCategory("FRAMEWORK", ["next", "vue"])
    const nuxt = tagIdOf(await seedTag({ slug: "nuxt", displayOrder: 3 }))

    await updateTag(nuxt, {}, 1)

    expect(await categorySlugs("FRAMEWORK")).toEqual({
      slugs: ["nuxt", "next", "vue"],
      orders: sequence(3),
    })
  })

  it("returns slug_taken on a taken slug and not_found on an unknown id", async () => {
    await seedTag({ slug: "next", displayOrder: 1 })
    const vue = tagIdOf(await seedTag({ slug: "vue", displayOrder: 2 }))

    const taken = await updateTag(vue, { slug: "next" })
    const created = await createTag(tagData({ slug: "next" }))
    const missing = await updateTag(UNKNOWN_ID, { nameFr: "Inconnu" })

    expect(taken).toEqual({ ok: false, error: { code: "slug_taken" } })
    expect(created).toEqual({ ok: false, error: { code: "slug_taken" } })
    expect(missing).toEqual({ ok: false, error: { code: "not_found" } })
  })

  it("leaves the other tags of the category untouched without a position", async () => {
    const next = await seedTag({ slug: "next", displayOrder: 1 })
    const vue = tagIdOf(await seedTag({ slug: "vue", displayOrder: 2 }))
    const nuxt = await seedTag({ slug: "nuxt", displayOrder: 3 })

    await updateTag(vue, { nameFr: "Vue.js" })

    const others = await prisma.tag.findMany({
      where: { id: { in: [next.id, nuxt.id] } },
      orderBy: { displayOrder: "asc" },
    })
    expect(others.map((tag) => tag.updatedAt)).toEqual([next.updatedAt, nuxt.updatedAt])
  })

  it("answers not_found when the tag vanished between the read and the write", async () => {
    const vue = await seedTag({ slug: "vue", displayOrder: 1 })
    await prisma.tag.delete({ where: { id: vue.id } })
    const read = vi.spyOn(prisma.tag, "findUnique").mockResolvedValueOnce(vue)
    onTestFinished(() => {
      read.mockRestore()
    })

    const result = await updateTag(tagIdOf(vue), { nameFr: "Vue.js" })

    expect(result).toEqual({ ok: false, error: { code: "not_found" } })
  })
})
