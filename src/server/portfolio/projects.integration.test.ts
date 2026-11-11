import { beforeEach, describe, expect, it } from "vitest"

import { companyIdSchema, projectIdSchema, type CompanyId } from "@/lib/ids"
import {
  companyIdOf,
  prisma,
  projectIdOf,
  resetDatabase,
  seedCompany,
  seedProject,
  seedTag,
  sequence,
  slugsAndOrders,
  storedProjectTags,
  stubNextTransactionCall,
} from "@/lib/prisma-test-setup"

import { createProject, updateProject, type ProjectWriteData } from "./projects"

function projectData(companyId: CompanyId, overrides: Partial<ProjectWriteData> = {}) {
  return {
    slug: "nouveau",
    titleFr: "Nouveau",
    titleEn: "New",
    descriptionFr: "Description française",
    descriptionEn: "English description",
    type: "PERSONAL",
    status: "DRAFT",
    formats: ["WEB_APP"],
    startedAt: null,
    endedAt: null,
    githubUrl: null,
    demoUrl: null,
    coverFilename: null,
    caseStudyMarkdownFr: null,
    caseStudyMarkdownEn: null,
    tagIds: [],
    companyId,
    workMode: "REMOTE",
    contractStatus: null,
    teamSize: null,
    deliverablesCount: 1,
    ...overrides,
  } satisfies ProjectWriteData
}

async function seedProjects(companyId: string, slugs: readonly string[]): Promise<void> {
  for (const [index, slug] of slugs.entries())
    await seedProject(companyId, { slug, displayOrder: index + 1 })
}

const projectBySlug = (slug: string) => prisma.project.findUniqueOrThrow({ where: { slug } })

async function storedOrder() {
  return slugsAndOrders(await prisma.project.findMany({ orderBy: { displayOrder: "asc" } }))
}

const UNKNOWN_PROJECT = projectIdSchema.parse("missing-project")
const UNKNOWN_COMPANY = companyIdSchema.parse("missing-company")

let companyId: CompanyId

beforeEach(async () => {
  await resetDatabase()
  companyId = companyIdOf(await seedCompany())
})

describe("createProject", () => {
  it("creates a project last without a position, with its ClientMeta and ordered tags", async () => {
    await seedProjects(companyId, ["alpha", "beta"])
    const next = await seedTag({ slug: "next" })
    const react = await seedTag({ slug: "react" })

    const result = await createProject(
      projectData(companyId, {
        workMode: "HYBRIDE",
        teamSize: 4,
        tagIds: [react.id, next.id],
      }),
    )

    expect(result).toMatchObject({ ok: true, value: { slug: "nouveau", titleFr: "Nouveau" } })
    expect(await storedOrder()).toEqual({
      slugs: ["alpha", "beta", "nouveau"],
      orders: sequence(3),
    })
    const created = await prisma.project.findUniqueOrThrow({
      where: { slug: "nouveau" },
      include: { clientMeta: true },
    })
    expect(created.clientMeta).toMatchObject({ companyId, workMode: "HYBRIDE", teamSize: 4 })
    expect(await storedProjectTags(created.id)).toEqual({
      slugs: ["react", "next"],
      orders: [1, 2],
    })
  })

  it("creates a project at the given position and renumbers all projects", async () => {
    await seedProjects(companyId, ["alpha", "beta", "gamma"])

    await createProject(projectData(companyId), 2)

    expect(await storedOrder()).toEqual({
      slugs: ["alpha", "nouveau", "beta", "gamma"],
      orders: sequence(4),
    })
  })

  it("returns dates_out_of_order when the end precedes the start", async () => {
    const result = await createProject(
      projectData(companyId, {
        startedAt: new Date("2026-06-01"),
        endedAt: new Date("2026-01-01"),
      }),
    )

    expect(result).toEqual({ ok: false, error: { code: "dates_out_of_order" } })
    expect(await storedOrder()).toEqual({ slugs: [], orders: [] })
  })
})

describe("updateProject", () => {
  it("keeps the rank of a project updated without a position", async () => {
    const alpha = await seedProject(companyId, { slug: "alpha", displayOrder: 1 })
    const beta = await seedProject(companyId, { slug: "beta", displayOrder: 2 })
    const gamma = await seedProject(companyId, { slug: "gamma", displayOrder: 3 })

    const result = await updateProject(projectIdOf(beta), { titleFr: "Bêta" })

    expect(result).toMatchObject({ ok: true, value: { slug: "beta", titleFr: "Bêta" } })
    expect(await storedOrder()).toEqual({ slugs: ["alpha", "beta", "gamma"], orders: sequence(3) })
    const neighbours = await prisma.project.findMany({
      where: { id: { in: [alpha.id, gamma.id] } },
      orderBy: { displayOrder: "asc" },
    })
    expect(neighbours.map((project) => project.updatedAt)).toEqual([
      alpha.updatedAt,
      gamma.updatedAt,
    ])
  })

  it("moves a project to the given position and renumbers all projects", async () => {
    await seedProjects(companyId, ["alpha", "beta", "gamma"])
    const gamma = await projectBySlug("gamma")

    await updateProject(projectIdOf(gamma), { titleFr: "Gamma" }, 1)

    expect(await storedOrder()).toEqual({ slugs: ["gamma", "alpha", "beta"], orders: sequence(3) })
  })

  it("merges a partial patch of project and ClientMeta fields with the stored values", async () => {
    const other = companyIdOf(await seedCompany({ slug: "globex", name: "Globex" }))
    const stored = await seedProject(companyId, {
      slug: "alpha",
      titleFr: "Alpha",
      descriptionFr: "Description stockée",
    })

    await updateProject(projectIdOf(stored), {
      titleFr: "Alpha 2",
      workMode: "HYBRIDE",
      companyId: other,
    })

    const updated = await prisma.project.findUniqueOrThrow({
      where: { id: stored.id },
      include: { clientMeta: true },
    })
    expect(updated).toMatchObject({ titleFr: "Alpha 2", descriptionFr: "Description stockée" })
    expect(updated.clientMeta).toMatchObject({
      companyId: other,
      workMode: "HYBRIDE",
      deliverablesCount: 1,
    })
  })

  it("renames the slug sent by the admin", async () => {
    const stored = await seedProject(companyId, { slug: "alpha" })

    const result = await updateProject(projectIdOf(stored), { slug: "alpha-renomme" })

    expect(result).toEqual({
      ok: true,
      value: { id: stored.id, slug: "alpha-renomme", titleFr: stored.titleFr },
    })
    expect((await prisma.project.findUniqueOrThrow({ where: { id: stored.id } })).slug).toBe(
      "alpha-renomme",
    )
  })

  it("keeps the tags when tagIds is absent and replaces them in order when present", async () => {
    const a = await seedTag({ slug: "a" })
    const b = await seedTag({ slug: "b" })
    const c = await seedTag({ slug: "c" })
    const stored = await seedProject(companyId, {
      slug: "alpha",
      tags: {
        create: [
          { displayOrder: 1, tag: { connect: { id: a.id } } },
          { displayOrder: 2, tag: { connect: { id: b.id } } },
        ],
      },
    })
    const id = projectIdOf(stored)

    await updateProject(id, { titleFr: "Alpha 2" })
    const kept = await storedProjectTags(stored.id)
    await updateProject(id, { tagIds: [c.id, b.id] })
    const replaced = await storedProjectTags(stored.id)
    await updateProject(id, { tagIds: [] })
    const cleared = await storedProjectTags(stored.id)

    expect(kept).toEqual({ slugs: ["a", "b"], orders: [1, 2] })
    expect(replaced).toEqual({ slugs: ["c", "b"], orders: [1, 2] })
    expect(cleared).toEqual({ slugs: [], orders: [] })
  })

  it("touches updatedAt when only the tags or the ClientMeta change", async () => {
    const tag = await seedTag({ slug: "a" })
    const longAgo = new Date("2026-01-01T00:00:00Z")
    const tagged = await seedProject(companyId, { slug: "alpha", updatedAt: longAgo })
    const moved = await seedProject(companyId, { slug: "beta", updatedAt: longAgo })

    await updateProject(projectIdOf(tagged), { tagIds: [tag.id] })
    await updateProject(projectIdOf(moved), { workMode: "HYBRIDE" })

    expect((await projectBySlug("alpha")).updatedAt.getTime()).toBeGreaterThan(longAgo.getTime())
    expect((await projectBySlug("beta")).updatedAt.getTime()).toBeGreaterThan(longAgo.getTime())
  })

  it("returns dates_out_of_order when only endedAt is sent and precedes the stored startedAt", async () => {
    const stored = await seedProject(companyId, {
      slug: "alpha",
      startedAt: new Date("2026-03-01"),
    })

    const result = await updateProject(projectIdOf(stored), { endedAt: new Date("2026-01-01") })

    expect(result).toEqual({ ok: false, error: { code: "dates_out_of_order" } })
    expect(
      (await prisma.project.findUniqueOrThrow({ where: { id: stored.id } })).endedAt,
    ).toBeNull()
  })

  it("answers not_found when the project vanished between the read and the write", async () => {
    const stored = await seedProject(companyId, { slug: "alpha" })
    await prisma.project.delete({ where: { id: stored.id } })
    stubNextTransactionCall("project", "findUnique", () => Promise.resolve(stored))

    const result = await updateProject(projectIdOf(stored), { titleFr: "Alpha 2" })

    expect(result).toEqual({ ok: false, error: { code: "not_found" } })
  })
})

describe("domain errors", () => {
  it("returns slug_taken, company_not_found, tag_not_found and not_found", async () => {
    await seedProjects(companyId, ["alpha", "beta"])
    const betaId = projectIdOf(await projectBySlug("beta"))

    const created = await createProject(projectData(companyId, { slug: "alpha" }))
    const renamed = await updateProject(betaId, { slug: "alpha" })
    const createdWithoutCompany = await createProject(projectData(UNKNOWN_COMPANY))
    const movedToNoCompany = await updateProject(betaId, { companyId: UNKNOWN_COMPANY })
    const createdWithoutTag = await createProject(
      projectData(companyId, { tagIds: ["missing-tag"] }),
    )
    const taggedWithoutTag = await updateProject(betaId, { tagIds: ["missing-tag"] })
    const missing = await updateProject(UNKNOWN_PROJECT, { titleFr: "Inconnu" })

    expect(created).toEqual({ ok: false, error: { code: "slug_taken" } })
    expect(renamed).toEqual({ ok: false, error: { code: "slug_taken" } })
    expect(createdWithoutCompany).toEqual({ ok: false, error: { code: "company_not_found" } })
    expect(movedToNoCompany).toEqual({ ok: false, error: { code: "company_not_found" } })
    expect(createdWithoutTag).toEqual({ ok: false, error: { code: "tag_not_found" } })
    expect(taggedWithoutTag).toEqual({ ok: false, error: { code: "tag_not_found" } })
    expect(missing).toEqual({ ok: false, error: { code: "not_found" } })
    expect(await storedOrder()).toEqual({ slugs: ["alpha", "beta"], orders: sequence(2) })
  })

  // Attribution par contrainte : le P2002 de la clé composite de ProjectTag n'est pas un slug pris.
  it("rethrows a duplicated tag instead of reporting slug_taken", async () => {
    const tag = await seedTag({ slug: "next" })
    const stored = await seedProject(companyId, { slug: "alpha" })

    await expect(
      createProject(projectData(companyId, { tagIds: [tag.id, tag.id] })),
    ).rejects.toMatchObject({ code: "P2002" })
    await expect(
      updateProject(projectIdOf(stored), { tagIds: [tag.id, tag.id] }),
    ).rejects.toMatchObject({ code: "P2002" })
  })
})
