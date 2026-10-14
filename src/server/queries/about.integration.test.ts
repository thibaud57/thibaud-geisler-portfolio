import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}))

import { createProject, prisma, resetDatabase } from "@/lib/prisma-test-setup"
import { countClientsSupported, countMissionsDelivered, findAllTags } from "@/server/queries/about"

async function ensureCompany(slug: string) {
  await prisma.company.upsert({
    where: { slug },
    create: { slug, name: slug, sectors: [], size: null },
    update: {},
  })
}

async function createProjectWithMeta(input: {
  slug: string
  type: "CLIENT" | "PERSONAL"
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  endedAt: Date | null
  deliverablesCount: number
  companySlug?: string
}) {
  const companySlug = input.companySlug ?? "co-" + input.slug
  await ensureCompany(companySlug)
  await createProject({
    slug: input.slug,
    titleFr: input.slug,
    titleEn: input.slug,
    type: input.type,
    status: input.status,
    endedAt: input.endedAt,
    clientMeta: {
      create: {
        workMode: "REMOTE",
        deliverablesCount: input.deliverablesCount,
        company: { connect: { slug: companySlug } },
      },
    },
  })
}

describe("countMissionsDelivered", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("returns 0 when no project matches", async () => {
    const result = await countMissionsDelivered()

    expect(result).toBe(0)
  })

  it("sums deliverablesCount of PUBLISHED CLIENT projects that have ended", async () => {
    await createProjectWithMeta({
      slug: "a",
      type: "CLIENT",
      status: "PUBLISHED",
      endedAt: new Date(),
      deliverablesCount: 3,
    })
    await createProjectWithMeta({
      slug: "b",
      type: "CLIENT",
      status: "PUBLISHED",
      endedAt: new Date(),
      deliverablesCount: 2,
    })

    const result = await countMissionsDelivered()

    expect(result).toBe(5)
  })

  it("excludes DRAFT and ARCHIVED projects", async () => {
    await createProjectWithMeta({
      slug: "pub",
      type: "CLIENT",
      status: "PUBLISHED",
      endedAt: new Date(),
      deliverablesCount: 5,
    })
    await createProjectWithMeta({
      slug: "draft",
      type: "CLIENT",
      status: "DRAFT",
      endedAt: new Date(),
      deliverablesCount: 100,
    })
    await createProjectWithMeta({
      slug: "arch",
      type: "CLIENT",
      status: "ARCHIVED",
      endedAt: new Date(),
      deliverablesCount: 100,
    })

    const result = await countMissionsDelivered()

    expect(result).toBe(5)
  })

  it("excludes PERSONAL projects", async () => {
    await createProjectWithMeta({
      slug: "cli",
      type: "CLIENT",
      status: "PUBLISHED",
      endedAt: new Date(),
      deliverablesCount: 3,
    })
    await createProjectWithMeta({
      slug: "perso",
      type: "PERSONAL",
      status: "PUBLISHED",
      endedAt: new Date(),
      deliverablesCount: 100,
    })

    const result = await countMissionsDelivered()

    expect(result).toBe(3)
  })

  it("excludes ongoing projects (endedAt null)", async () => {
    await createProjectWithMeta({
      slug: "done",
      type: "CLIENT",
      status: "PUBLISHED",
      endedAt: new Date(),
      deliverablesCount: 4,
    })
    await createProjectWithMeta({
      slug: "wip",
      type: "CLIENT",
      status: "PUBLISHED",
      endedAt: null,
      deliverablesCount: 100,
    })

    const result = await countMissionsDelivered()

    expect(result).toBe(4)
  })
})

describe("countClientsSupported", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("returns 0 when no company matches", async () => {
    const result = await countClientsSupported()

    expect(result).toBe(0)
  })

  it("counts the distinct companies linked to a PUBLISHED CLIENT project", async () => {
    await prisma.company.createMany({
      data: [
        { slug: "acme", name: "Acme", sectors: ["ASSURANCE"], size: "ETI" },
        { slug: "globex", name: "Globex", sectors: ["SAAS"], size: "TPE" },
      ],
    })
    await createProject({
      slug: "p1",
      type: "CLIENT",
      clientMeta: { create: { workMode: "REMOTE", company: { connect: { slug: "acme" } } } },
    })
    await createProject({
      slug: "p2",
      type: "CLIENT",
      clientMeta: { create: { workMode: "REMOTE", company: { connect: { slug: "globex" } } } },
    })

    const result = await countClientsSupported()

    expect(result).toBe(2)
  })

  it("counts a company once when it has several client projects", async () => {
    await prisma.company.create({
      data: { slug: "acme", name: "Acme", sectors: ["ASSURANCE"], size: "ETI" },
    })
    await createProject({
      slug: "p1",
      type: "CLIENT",
      clientMeta: { create: { workMode: "REMOTE", company: { connect: { slug: "acme" } } } },
    })
    await createProject({
      slug: "p2",
      type: "CLIENT",
      clientMeta: { create: { workMode: "REMOTE", company: { connect: { slug: "acme" } } } },
    })

    const result = await countClientsSupported()

    expect(result).toBe(1)
  })

  it("excludes companies that only have PERSONAL projects", async () => {
    await prisma.company.create({
      data: { slug: "personnel", name: "Personnel", sectors: [], size: null },
    })
    await createProject({
      slug: "perso",
      type: "PERSONAL",
      clientMeta: { create: { workMode: "REMOTE", company: { connect: { slug: "personnel" } } } },
    })

    const result = await countClientsSupported()

    expect(result).toBe(0)
  })

  it("excludes companies without clientMetas", async () => {
    await prisma.company.create({
      data: { slug: "orphan", name: "Orphan", sectors: [], size: null },
    })

    const result = await countClientsSupported()

    expect(result).toBe(0)
  })
})

describe("findAllTags", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("sorts tags by ascending displayOrder then slug", async () => {
    await prisma.tag.createMany({
      data: [
        { slug: "a", nameFr: "A", nameEn: "A", kind: "FRAMEWORK", displayOrder: 5 },
        { slug: "b", nameFr: "B", nameEn: "B", kind: "FRAMEWORK", displayOrder: 0 },
        { slug: "c", nameFr: "C", nameEn: "C", kind: "FRAMEWORK", displayOrder: 0 },
      ],
    })

    const result = await findAllTags("fr")

    expect(result.map((t) => t.slug)).toEqual(["b", "c", "a"])
  })

  it("returns tags even when no project uses them", async () => {
    await prisma.tag.create({
      data: { slug: "rag", nameFr: "RAG", nameEn: "RAG", kind: "AI" },
    })

    const result = await findAllTags("fr")

    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe("rag")
  })

  it.each([
    { locale: "fr", name: "NomFR" },
    { locale: "en", name: "NameEN" },
  ] as const)("localizes nameFr and nameEn into name for $locale", async ({ locale, name }) => {
    await prisma.tag.create({
      data: { slug: "k", nameFr: "NomFR", nameEn: "NameEN", kind: "INFRA" },
    })

    const result = await findAllTags(locale)

    expect(result[0]?.name).toBe(name)
    expect(result[0]).not.toHaveProperty("nameFr")
    expect(result[0]).not.toHaveProperty("nameEn")
  })
})
