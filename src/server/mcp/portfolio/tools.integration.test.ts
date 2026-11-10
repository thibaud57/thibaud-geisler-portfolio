import { revalidatePath, revalidateTag } from "next/cache"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const { childLog } = vi.hoisted(() => {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() }
  // Même espion à chaque niveau : mcpLoggerFor enchaîne .child({ domain, keyId }) sur le logger de la requête
  log.child.mockReturnValue(log)
  return { childLog: log }
})
vi.mock("@/lib/logger", () => ({ logger: { child: vi.fn(() => childLog) } }))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }))

import { ADMIN_TAGS_PATH } from "@/lib/admin/routes"
import type { TagIconKey } from "@/lib/icons"
import { jsonOf, textOf, setupMcpSession, type ToolResult } from "@/lib/mcp-test-setup"
import { createProject, prisma, resetDatabase, seedTag, tagIdOf } from "@/lib/prisma-test-setup"
import { PORTFOLIO_ENTITY_NAMES } from "@/server/mcp/portfolio/registry"

const ICON: TagIconKey = "lucide:database"

const { client, call } = setupMcpSession("portfolio")

beforeEach(async () => {
  await resetDatabase()
})

const createTagArgs = (data: Record<string, unknown>) => ({
  entity: "tag",
  data: { slug: "svelte", nameFr: "Svelte", nameEn: "Svelte", kind: "FRAMEWORK", ...data },
})

const updateTagArgs = (id: string, fields: Record<string, unknown>) => ({
  entity: "tag",
  id,
  fields,
})

const idsSchema = z.object({ id: z.string(), slug: z.string() })

async function slugsOf(kind: "FRAMEWORK" | "LANGUAGE" | "DATABASE") {
  const tags = await prisma.tag.findMany({ where: { kind }, orderBy: { displayOrder: "asc" } })
  return tags.map((tag) => `${tag.slug}:${tag.displayOrder}`)
}

describe("tools/list", () => {
  // Contrat vu par l'agent : un écart de ce fichier est un changement visible, à relire avant de le valider.
  it("lists exactly the five portfolio tools and matches the contract snapshot", async () => {
    const { tools } = await client().listTools()

    expect(tools.map(({ name }) => name).sort()).toEqual([
      "portfolio_create",
      "portfolio_fetch",
      "portfolio_query",
      "portfolio_search",
      "portfolio_update",
    ])
    const contract = tools.map(({ name, title, description, inputSchema, annotations }) => ({
      name,
      title,
      description,
      inputSchema,
      annotations,
    }))
    await expect(JSON.stringify(contract, null, 2) + "\n").toMatchFileSnapshot(
      "./tools-list.snapshot.json",
    )
  })

  it("names every entity in the server instructions", () => {
    const instructions = client().getInstructions() ?? ""

    expect(PORTFOLIO_ENTITY_NAMES.filter((entity) => !instructions.includes(entity))).toEqual([])
  })
})

describe("portfolio_create", () => {
  it("creates a tag at the end of its category and invalidates tags, projects and the admin tags page", async () => {
    await seedTag({ slug: "next", displayOrder: 1 })
    await seedTag({ slug: "vue", displayOrder: 2 })
    await seedTag({ slug: "nuxt", displayOrder: 3 })

    const result = await call("portfolio_create", createTagArgs({ icon: ICON }))

    const created = idsSchema.parse(jsonOf(result))
    expect(created.slug).toBe("svelte")
    expect(await slugsOf("FRAMEWORK")).toEqual(["next:1", "vue:2", "nuxt:3", "svelte:4"])
    expect(await prisma.tag.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({
      nameFr: "Svelte",
      icon: ICON,
    })
    expect(revalidateTag).toHaveBeenCalledWith("tags", "max")
    expect(revalidateTag).toHaveBeenCalledWith("projects", "max")
    expect(revalidatePath).toHaveBeenCalledWith(ADMIN_TAGS_PATH)
  })

  it("creates a tag without icon", async () => {
    const result = await call("portfolio_create", createTagArgs({ icon: null }))

    const created = idsSchema.parse(jsonOf(result))
    expect((await prisma.tag.findUniqueOrThrow({ where: { id: created.id } })).icon).toBeNull()
  })

  it("refuses a slug already taken and points to portfolio_search", async () => {
    await seedTag({ slug: "svelte" })

    const result = await call("portfolio_create", createTagArgs({}))

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("portfolio_search")
    expect(await prisma.tag.count()).toBe(1)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("refuses an icon outside the registry without writing", async () => {
    const result = await call("portfolio_create", createTagArgs({ icon: "simple-icons:unknown" }))

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("icon")
    expect(await prisma.tag.count()).toBe(0)
  })
})

describe("portfolio_search", () => {
  it.each(["ia-generative", "GENERATIVE", "ia generative"])(
    "finds a tag by slug, French name or English name, case and accents ignored: %s",
    async (query) => {
      const tag = await seedTag({
        slug: "ia-generative",
        nameFr: "IA générative",
        nameEn: "Generative AI",
        kind: "AI",
      })
      await seedTag({ slug: "react" })

      const result = await call("portfolio_search", { query })

      expect(jsonOf(result)).toEqual({
        results: [{ entity: "tag", id: tag.id, label: "IA générative", hint: "ia-generative" }],
      })
    },
  )

  it("ranks the tag whose slug is the query first, before tags sharing its prefix", async () => {
    await seedTag({ slug: "next-auth", nameFr: "Auth.js", nameEn: "Auth.js", displayOrder: 1 })
    await seedTag({
      slug: "nextjs",
      nameFr: "Framework Next",
      nameEn: "Framework Next",
      displayOrder: 2,
    })
    const exact = await seedTag({ slug: "next", nameFr: "Next", nameEn: "Next", displayOrder: 3 })

    const result = await call("portfolio_search", { query: "next" })

    expect(jsonOf(result)).toMatchObject({
      results: [{ id: exact.id, hint: "next" }, { hint: "next-auth" }, { hint: "nextjs" }],
    })
  })
})

describe("portfolio_fetch", () => {
  it("fetches a tag with the projects that carry it", async () => {
    const tag = await seedTag({ slug: "next", nameFr: "Next.js", nameEn: "Next.js" })
    const draft = await createProject({ slug: "beta", titleFr: "Bêta", status: "DRAFT" })
    const published = await createProject({ slug: "alpha", titleFr: "Alpha" })
    await prisma.projectTag.createMany({
      data: [draft, published].map((project) => ({ projectId: project.id, tagId: tag.id })),
    })
    await seedTag({ slug: "unused" })

    const result = await call("portfolio_fetch", { entity: "tag", id: tag.id })

    expect(jsonOf(result)).toMatchObject({
      id: tag.id,
      slug: "next",
      nameFr: "Next.js",
      nameEn: "Next.js",
      kind: "FRAMEWORK",
      icon: null,
      projectCount: 2,
      projects: [
        { id: published.id, slug: "alpha", titleFr: "Alpha", status: "PUBLISHED" },
        { id: draft.id, slug: "beta", titleFr: "Bêta", status: "DRAFT" },
      ],
    })
  })
})

describe("portfolio_query", () => {
  async function seedCatalogue() {
    await seedTag({ slug: "next", kind: "FRAMEWORK", displayOrder: 1 })
    await seedTag({ slug: "vue", kind: "FRAMEWORK", displayOrder: 2 })
    await seedTag({ slug: "typescript", kind: "LANGUAGE", displayOrder: 1 })
    await seedTag({ slug: "python", kind: "LANGUAGE", displayOrder: 2 })
    await seedTag({ slug: "postgres", kind: "DATABASE", displayOrder: 1 })
    await seedTag({ slug: "strategy", kind: "EXPERTISE", displayOrder: 1 })
  }

  const rowsSchema = z.object({
    rows: z.array(z.object({ slug: z.string() })),
    total: z.number(),
  })

  const slugsOfRows = (result: ToolResult) =>
    rowsSchema.parse(jsonOf(result)).rows.map(({ slug }) => slug)

  it("lists tags filtered by kind, sorted like the admin", async () => {
    await seedCatalogue()

    const filtered = await call("portfolio_query", {
      entity: "tag",
      filters: { kind: "FRAMEWORK" },
    })
    const all = await call("portfolio_query", { entity: "tag" })

    expect(rowsSchema.parse(jsonOf(filtered))).toEqual({
      rows: [{ slug: "next" }, { slug: "vue" }].map(
        (row) => expect.objectContaining(row) as unknown,
      ),
      total: 2,
    })
    // L'ordre de l'admin (expertises d'abord), pas celui de l'enum Postgres (langages d'abord)
    expect(slugsOfRows(all)).toEqual([
      "strategy",
      "typescript",
      "python",
      "next",
      "vue",
      "postgres",
    ])
  })

  it("reverses the admin order on desc and pages after sorting", async () => {
    await seedCatalogue()

    const reversed = await call("portfolio_query", { entity: "tag", order: "desc", limit: 2 })
    const paged = await call("portfolio_query", { entity: "tag", limit: 2, offset: 1 })

    expect(slugsOfRows(reversed)).toEqual(["postgres", "vue"])
    expect(slugsOfRows(paged)).toEqual(["typescript", "python"])
    expect(rowsSchema.parse(jsonOf(paged)).total).toBe(6)
  })

  it("sorts by update date", async () => {
    await seedCatalogue()
    await prisma.tag.update({ where: { slug: "vue" }, data: { nameFr: "Vue.js" } })

    const result = await call("portfolio_query", {
      entity: "tag",
      sort: "updatedAt",
      order: "desc",
      limit: 1,
    })

    expect(slugsOfRows(result)).toEqual(["vue"])
  })
})

describe("portfolio_update", () => {
  it("updates name, icon and kind of a tag partially", async () => {
    const tag = await seedTag({ slug: "next", nameFr: "Next", nameEn: "Next", displayOrder: 1 })
    await seedTag({ slug: "typescript", kind: "LANGUAGE", displayOrder: 1 })

    const renamed = await call("portfolio_update", updateTagArgs(tag.id, { nameFr: "Next.js" }))
    const moved = await call(
      "portfolio_update",
      updateTagArgs(tag.id, { icon: ICON, kind: "LANGUAGE" }),
    )
    const cleared = await call("portfolio_update", updateTagArgs(tag.id, { icon: null }))

    expect(idsSchema.parse(jsonOf(renamed))).toEqual({ id: tag.id, slug: "next" })
    expect(moved.isError).not.toBe(true)
    expect(cleared.isError).not.toBe(true)
    expect(await prisma.tag.findUniqueOrThrow({ where: { id: tag.id } })).toMatchObject({
      nameFr: "Next.js",
      nameEn: "Next",
      kind: "LANGUAGE",
      icon: null,
      displayOrder: 2,
    })
    expect(await slugsOf("LANGUAGE")).toEqual(["typescript:1", "next:2"])
    expect(revalidateTag).toHaveBeenCalledWith("tags", "max")
    expect(revalidateTag).toHaveBeenCalledWith("projects", "max")
    expect(revalidatePath).toHaveBeenCalledWith(ADMIN_TAGS_PATH)
  })

  it.each([
    ["a slug change", { slug: "other" }, "fixed at creation"],
    ["an icon outside the registry", { icon: "simple-icons:unknown" }, "icon"],
    ["an empty icon", { icon: "" }, "null"],
    ["an empty patch", {}, "fields"],
  ])("refuses %s without writing", async (_label, fields, mention) => {
    const tag = await seedTag({ slug: "next", nameFr: "Next" })

    const result = await call("portfolio_update", updateTagArgs(tag.id, fields))

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain(mention)
    expect(await prisma.tag.findUniqueOrThrow({ where: { id: tag.id } })).toEqual(tag)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("answers an unknown id with a message that points to portfolio_search", async () => {
    const update = await call("portfolio_update", updateTagArgs("missing", { nameFr: "Inconnu" }))
    const fetch = await call("portfolio_fetch", { entity: "tag", id: "missing" })

    expect(update.isError).toBe(true)
    expect(textOf(update)).toContain("portfolio_search")
    expect(fetch.isError).toBe(true)
    expect(textOf(fetch)).toContain("portfolio_search")
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})

describe("tool logs", () => {
  it("logs tag:created and tag:updated with the tag id", async () => {
    const created = idsSchema.parse(jsonOf(await call("portfolio_create", createTagArgs({}))))
    const tagId = tagIdOf(created)

    await call("portfolio_update", updateTagArgs(tagId, { nameFr: "Svelte 5" }))

    expect(childLog.child).toHaveBeenCalledWith({ domain: "portfolio", keyId: "key-1" })
    expect(childLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: "tag:created", id: tagId, slug: "svelte" }),
    )
    expect(childLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: "tag:updated", id: tagId }),
    )
  })
})
