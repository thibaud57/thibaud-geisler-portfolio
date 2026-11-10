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

import { ADMIN_PROJECTS_PATH, ADMIN_TAGS_PATH } from "@/lib/admin/routes"
import type { TagIconKey } from "@/lib/icons"
import { jsonOf, textOf, setupMcpSession, type ToolResult } from "@/lib/mcp-test-setup"
import {
  createProject,
  prisma,
  projectIdOf,
  resetDatabase,
  seedCompany,
  seedProject,
  seedTag,
  tagIdOf,
} from "@/lib/prisma-test-setup"
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

describe("project entity", () => {
  const projectSummarySchema = z.object({ id: z.string(), slug: z.string(), titleFr: z.string() })

  const createProjectArgs = (companyId: string, data: Record<string, unknown> = {}) => ({
    entity: "project",
    data: {
      slug: "crm-freelance",
      titleFr: "CRM freelance",
      titleEn: "Freelance CRM",
      descriptionFr: "Un CRM sur mesure.",
      descriptionEn: "A tailor-made CRM.",
      type: "CLIENT",
      formats: ["WEB_APP"],
      companyId,
      workMode: "REMOTE",
      ...data,
    },
  })

  const updateProjectArgs = (id: string, fields: Record<string, unknown>) => ({
    entity: "project",
    id,
    fields,
  })

  const tagSlugsOf = async (projectId: string) => {
    const links = await prisma.projectTag.findMany({
      where: { projectId },
      orderBy: { displayOrder: "asc" },
      include: { tag: true },
    })
    return links.map(({ tag }) => tag.slug)
  }

  const storedProject = (id: string) =>
    prisma.project.findUniqueOrThrow({ where: { id }, include: { clientMeta: true, tags: true } })

  const expectNoInvalidation = () => {
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  }

  it("creates a draft project last with its client and ordered tags, then fetches it", async () => {
    const company = await seedCompany({ name: "Acme" })
    const next = await seedTag({ slug: "next", nameFr: "Next.js" })
    const vue = await seedTag({ slug: "vue", nameFr: "Vue.js" })
    await seedProject(company.id, { slug: "first", displayOrder: 1 })
    await seedProject(company.id, { slug: "second", displayOrder: 2 })

    const created = await call(
      "portfolio_create",
      createProjectArgs(company.id, {
        tagIds: [vue.id, next.id],
        contractStatus: "FREELANCE",
        teamSize: 3,
      }),
    )

    const summary = projectSummarySchema.parse(jsonOf(created))
    expect(summary).toMatchObject({ slug: "crm-freelance", titleFr: "CRM freelance" })
    expect(await prisma.project.findUniqueOrThrow({ where: { id: summary.id } })).toMatchObject({
      status: "DRAFT",
      displayOrder: 3,
    })
    expect(await tagSlugsOf(summary.id)).toEqual(["vue", "next"])
    expect(revalidateTag).toHaveBeenCalledWith("projects", "max")
    expect(revalidatePath).toHaveBeenCalledWith(ADMIN_PROJECTS_PATH, "layout")
    expect(revalidatePath).toHaveBeenCalledWith(ADMIN_TAGS_PATH)

    const fetched = await call("portfolio_fetch", { entity: "project", id: summary.id })

    expect(jsonOf(fetched)).toMatchObject({
      id: summary.id,
      slug: "crm-freelance",
      status: "DRAFT",
      formats: ["WEB_APP"],
      clientMeta: {
        workMode: "REMOTE",
        contractStatus: "FREELANCE",
        teamSize: 3,
        deliverablesCount: 1,
        company: { id: company.id, name: "Acme", logoFilename: null },
      },
      tags: [
        { id: vue.id, slug: "vue", nameFr: "Vue.js" },
        { id: next.id, slug: "next", nameFr: "Next.js" },
      ],
    })
  })

  it("exposes the client company of a project through its reference only", async () => {
    const company = await seedCompany({ logoFilename: "freelance/acme/logo.png" })
    const project = await seedProject(company.id)

    const fetched = await call("portfolio_fetch", { entity: "project", id: project.id })

    expect(jsonOf(fetched)).toMatchObject({
      clientMeta: {
        company: { id: company.id, name: "Acme", logoFilename: "freelance/acme/logo.png" },
      },
    })
    const { clientMeta } = jsonOf(fetched) as { clientMeta: { company: object } }
    expect(Object.keys(clientMeta.company)).toEqual(["id", "name", "logoFilename"])
  })

  it.each([
    ["slug", "crm-freelance"],
    ["French title", "crm freelancé"],
    ["English title", "FREELANCE CRM"],
  ])("finds a project by slug, French title or English title: %s", async (_label, query) => {
    const company = await seedCompany()
    const project = await seedProject(company.id, {
      slug: "crm-freelance",
      titleFr: "CRM freelancé",
      titleEn: "Freelance CRM",
      status: "DRAFT",
    })
    await seedProject(company.id, { slug: "other", titleFr: "Autre", titleEn: "Other" })

    const result = await call("portfolio_search", { query })

    expect(jsonOf(result)).toEqual({
      results: [
        {
          entity: "project",
          id: project.id,
          label: "CRM freelancé",
          hint: "crm-freelance",
        },
      ],
    })
  })

  it("ranks the project whose slug is the query first, before projects sharing its prefix", async () => {
    const company = await seedCompany()
    await seedProject(company.id, { slug: "crm-freelance", titleFr: "Un CRM", displayOrder: 1 })
    const exact = await seedProject(company.id, { slug: "crm", titleFr: "Zéro", displayOrder: 2 })

    const result = await call("portfolio_search", { query: "crm" })

    expect(jsonOf(result)).toMatchObject({
      results: [{ id: exact.id, hint: "crm" }, { hint: "crm-freelance" }],
    })
  })

  it("lists projects filtered by status, type, company and tag, sorted by display order", async () => {
    const acme = await seedCompany({ slug: "acme", name: "Acme" })
    const globex = await seedCompany({ slug: "globex", name: "Globex" })
    const next = await seedTag({ slug: "next" })
    const third = await seedProject(acme.id, { slug: "third", displayOrder: 3, type: "CLIENT" })
    const first = await seedProject(acme.id, { slug: "first", displayOrder: 1, type: "CLIENT" })
    await seedProject(acme.id, { slug: "second", displayOrder: 2, type: "PERSONAL" })
    await seedProject(globex.id, { slug: "fourth", displayOrder: 4, type: "CLIENT" })
    await seedProject(acme.id, { slug: "draft", displayOrder: 5, type: "CLIENT", status: "DRAFT" })
    await prisma.projectTag.createMany({
      data: [first, third].map((project) => ({ projectId: project.id, tagId: next.id })),
    })
    const rowsSchema = z.object({
      rows: z.array(z.object({ slug: z.string() })),
      total: z.number(),
    })
    const slugsFor = async (filters: Record<string, unknown>) => {
      const result = await call("portfolio_query", { entity: "project", filters })
      return rowsSchema.parse(jsonOf(result)).rows.map(({ slug }) => slug)
    }

    const all = await slugsFor({})
    const drafts = await slugsFor({ status: "DRAFT" })
    const personal = await slugsFor({ type: "PERSONAL" })
    const ofGlobex = await slugsFor({ companyId: globex.id })
    const tagged = await slugsFor({ tagId: next.id })
    const combined = await slugsFor({ type: "CLIENT", companyId: acme.id, tagId: next.id })
    const page = await call("portfolio_query", {
      entity: "project",
      order: "desc",
      limit: 2,
      offset: 1,
    })

    expect(all).toEqual(["first", "second", "third", "fourth", "draft"])
    expect(drafts).toEqual(["draft"])
    expect(personal).toEqual(["second"])
    expect(ofGlobex).toEqual(["fourth"])
    expect(tagged).toEqual(["first", "third"])
    expect(combined).toEqual(["first", "third"])
    expect(jsonOf(page)).toMatchObject({
      rows: [
        {
          slug: "fourth",
          titleFr: "Projet",
          titleEn: "Project",
          status: "PUBLISHED",
          type: "CLIENT",
          companyName: "Globex",
          displayOrder: 4,
        },
        { slug: "third", companyName: "Acme" },
      ],
      total: 5,
    })
  })

  it("publishes a draft and invalidates projects and the admin pages", async () => {
    const company = await seedCompany()
    const tag = await seedTag()
    const draft = await seedProject(company.id, { status: "DRAFT", titleFr: "Brouillon" })
    await prisma.projectTag.create({ data: { projectId: draft.id, tagId: tag.id } })

    const result = await call(
      "portfolio_update",
      updateProjectArgs(draft.id, { status: "PUBLISHED" }),
    )

    expect(projectSummarySchema.parse(jsonOf(result))).toEqual({
      id: draft.id,
      slug: "project",
      titleFr: "Brouillon",
    })
    expect(await storedProject(draft.id)).toMatchObject({
      status: "PUBLISHED",
      titleFr: "Brouillon",
      clientMeta: { companyId: company.id, workMode: "REMOTE" },
    })
    expect(await tagSlugsOf(draft.id)).toEqual(["react"])
    expect(revalidateTag).toHaveBeenCalledWith("projects", "max")
    expect(revalidatePath).toHaveBeenCalledWith(ADMIN_PROJECTS_PATH, "layout")
    expect(revalidatePath).toHaveBeenCalledWith(ADMIN_TAGS_PATH)
  })

  it("corrects the French case study of a published project without touching its tags or English case study", async () => {
    const company = await seedCompany()
    const project = await seedProject(company.id, {
      caseStudyMarkdownFr: "Ancien texte",
      caseStudyMarkdownEn: "Old text",
    })
    const tags = [
      await seedTag({ slug: "a" }),
      await seedTag({ slug: "b" }),
      await seedTag({ slug: "c" }),
    ]
    await prisma.projectTag.createMany({
      data: tags.map((tag, index) => ({
        projectId: project.id,
        tagId: tag.id,
        displayOrder: index + 1,
      })),
    })

    const result = await call(
      "portfolio_update",
      updateProjectArgs(project.id, { caseStudyMarkdownFr: "Nouveau texte" }),
    )

    expect(result.isError).not.toBe(true)
    expect(await storedProject(project.id)).toMatchObject({
      status: "PUBLISHED",
      caseStudyMarkdownFr: "Nouveau texte",
      caseStudyMarkdownEn: "Old text",
    })
    expect(await tagSlugsOf(project.id)).toEqual(["a", "b", "c"])
  })

  it("archives a published project and invalidates projects and the admin pages", async () => {
    const company = await seedCompany()
    const project = await seedProject(company.id, { status: "PUBLISHED" })

    const result = await call(
      "portfolio_update",
      updateProjectArgs(project.id, { status: "ARCHIVED" }),
    )

    expect(result.isError).not.toBe(true)
    expect(await storedProject(project.id)).toMatchObject({ status: "ARCHIVED" })
    expect(revalidateTag).toHaveBeenCalledWith("projects", "max")
    expect(revalidatePath).toHaveBeenCalledWith(ADMIN_PROJECTS_PATH, "layout")
  })

  it("creates a project directly as PUBLISHED", async () => {
    const company = await seedCompany()

    const result = await call(
      "portfolio_create",
      createProjectArgs(company.id, { status: "PUBLISHED" }),
    )

    const summary = projectSummarySchema.parse(jsonOf(result))
    expect(await storedProject(summary.id)).toMatchObject({ status: "PUBLISHED" })
    expect(revalidateTag).toHaveBeenCalledWith("projects", "max")
  })

  it("clears nullable fields sent as null and keeps the others", async () => {
    const company = await seedCompany()
    const project = await seedProject(company.id, {
      caseStudyMarkdownFr: "Texte",
      caseStudyMarkdownEn: "Text",
      startedAt: new Date("2026-03-01T00:00:00Z"),
      endedAt: new Date("2026-05-15T00:00:00Z"),
      coverFilename: "projets/client/crm/cover.png",
      githubUrl: "https://github.com/example/crm",
    })

    const result = await call(
      "portfolio_update",
      updateProjectArgs(project.id, {
        caseStudyMarkdownFr: null,
        startedAt: null,
        endedAt: null,
        coverFilename: null,
      }),
    )

    expect(result.isError).not.toBe(true)
    expect(await storedProject(project.id)).toMatchObject({
      caseStudyMarkdownFr: null,
      startedAt: null,
      endedAt: null,
      coverFilename: null,
      caseStudyMarkdownEn: "Text",
      githubUrl: "https://github.com/example/crm",
    })
  })

  it("refuses a tag attached twice and names the correction without writing", async () => {
    const company = await seedCompany()
    const project = await seedProject(company.id)
    const tag = await seedTag()
    const before = await storedProject(project.id)

    const update = await call(
      "portfolio_update",
      updateProjectArgs(project.id, { tagIds: [tag.id, tag.id] }),
    )
    const create = await call(
      "portfolio_create",
      createProjectArgs(company.id, { slug: "other", tagIds: [tag.id, tag.id] }),
    )

    expect(update.isError).toBe(true)
    expect(textOf(update)).toContain("remove the duplicate from tagIds")
    expect(create.isError).toBe(true)
    expect(textOf(create)).toContain("remove the duplicate from tagIds")
    expect(await storedProject(project.id)).toEqual(before)
    expect(await prisma.project.count()).toBe(1)
    expect(await prisma.projectTag.count()).toBe(0)
    expectNoInvalidation()
  })

  it("renders startedAt and endedAt as YYYY-MM-DD days and instants in Paris time", async () => {
    const company = await seedCompany()
    const project = await seedProject(company.id, {
      startedAt: new Date("2026-03-01T00:00:00Z"),
      endedAt: new Date("2026-05-15T00:00:00Z"),
      createdAt: new Date("2026-07-01T10:00:00Z"),
    })

    const fetched = await call("portfolio_fetch", { entity: "project", id: project.id })

    expect(jsonOf(fetched)).toMatchObject({
      startedAt: "2026-03-01",
      endedAt: "2026-05-15",
      createdAt: "2026-07-01T12:00:00.000+02:00",
    })
  })

  it("writes the days sent as midnight UTC", async () => {
    const company = await seedCompany()
    const project = await seedProject(company.id)

    await call(
      "portfolio_update",
      updateProjectArgs(project.id, { startedAt: "2026-03-01", endedAt: "2026-05-15" }),
    )

    expect(await storedProject(project.id)).toMatchObject({
      startedAt: new Date("2026-03-01T00:00:00Z"),
      endedAt: new Date("2026-05-15T00:00:00Z"),
    })
  })

  it.each([
    ["a slug change", { slug: "other" }, "slug"],
    [
      "a cover outside the project folders",
      { coverFilename: "freelance/crm/x.png" },
      "coverFilename",
    ],
    ["an unknown company", { companyId: "missing-company" }, "crm_search"],
    ["an unknown tag", { tagIds: ["missing-tag"] }, "portfolio_search"],
    ["an end before the stored start", { endedAt: "2020-01-01" }, "endedAt"],
    ["an instant instead of a day", { startedAt: "2026-05-01T10:00:00Z" }, "YYYY-MM-DD"],
    ["an empty patch", {}, "fields"],
  ])("refuses %s without writing", async (_label, fields, mention) => {
    const company = await seedCompany()
    const project = await seedProject(company.id, { startedAt: new Date("2026-05-01T00:00:00Z") })
    const before = await storedProject(project.id)

    const result = await call("portfolio_update", updateProjectArgs(project.id, fields))

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain(mention)
    expect(await storedProject(project.id)).toEqual(before)
    expectNoInvalidation()
  })

  it("refuses a slug already taken at creation and points to portfolio_search", async () => {
    const company = await seedCompany()
    await seedProject(company.id, { slug: "crm-freelance" })

    const result = await call("portfolio_create", createProjectArgs(company.id))

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("portfolio_search")
    expect(await prisma.project.count()).toBe(1)
    expectNoInvalidation()
  })

  it("answers an unknown id with a message that points to portfolio_search", async () => {
    const update = await call("portfolio_update", updateProjectArgs("missing", { titleFr: "X" }))
    const fetch = await call("portfolio_fetch", { entity: "project", id: "missing" })

    expect(update.isError).toBe(true)
    expect(textOf(update)).toContain("portfolio_search")
    expect(fetch.isError).toBe(true)
    expect(textOf(fetch)).toContain("portfolio_search")
    expectNoInvalidation()
  })

  it("logs project:created and project:updated with the project id", async () => {
    const company = await seedCompany()
    const created = projectSummarySchema.parse(
      jsonOf(await call("portfolio_create", createProjectArgs(company.id))),
    )
    const projectId = projectIdOf(created)

    await call("portfolio_update", updateProjectArgs(projectId, { titleFr: "CRM 2" }))

    expect(childLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: "project:created", id: projectId, slug: "crm-freelance" }),
    )
    expect(childLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: "project:updated", id: projectId }),
    )
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
