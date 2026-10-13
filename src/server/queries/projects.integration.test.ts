import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}))

import { createProject, prisma, resetDatabase } from "@/lib/prisma-test-setup"
import { findManyPublished, findPublishedBySlug } from "@/server/queries/projects"

describe("findManyPublished", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("returns only PUBLISHED projects, excluding DRAFT and ARCHIVED", async () => {
    await createProject({ slug: "pub", status: "PUBLISHED" })
    await createProject({ slug: "draft", status: "DRAFT" })
    await createProject({ slug: "arch", status: "ARCHIVED" })

    const result = await findManyPublished({ locale: "fr" })

    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe("pub")
  })

  it.each([
    ["CLIENT", "cli"],
    ["PERSONAL", "perso"],
  ] as const)("filters on type=%s when given", async (type, expectedSlug) => {
    await createProject({ slug: "cli", type: "CLIENT" })
    await createProject({ slug: "perso", type: "PERSONAL" })

    const result = await findManyPublished({ type, locale: "fr" })

    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe(expectedSlug)
  })

  it("sorts projects by ascending displayOrder, 0 first", async () => {
    await createProject({ slug: "a", displayOrder: 10 })
    await createProject({ slug: "b", displayOrder: 0 })
    await createProject({ slug: "c", displayOrder: 5 })

    const result = await findManyPublished({ locale: "fr" })

    expect(result.map((p) => p.slug)).toEqual(["b", "c", "a"])
  })

  it("includes tags through ProjectTag, sorted by displayOrder across kinds, and the nested clientMeta.company", async () => {
    await prisma.company.create({
      data: {
        slug: "acme",
        name: "Acme",
        sectors: ["LOGICIELS_ENTREPRISE"],
        size: "GROUPE",
      },
    })
    await prisma.tag.createMany({
      data: [
        {
          slug: "react",
          nameFr: "React",
          nameEn: "React",
          kind: "FRAMEWORK",
          icon: "simple-icons:react",
        },
        {
          slug: "anti-bot-scraping",
          nameFr: "Scraping anti-bot",
          nameEn: "Anti-bot scraping",
          kind: "EXPERTISE",
          icon: "lucide:spider",
        },
        {
          slug: "docker",
          nameFr: "Docker",
          nameEn: "Docker",
          kind: "INFRA",
          icon: "simple-icons:docker",
        },
      ],
    })
    await createProject({
      slug: "full",
      type: "CLIENT",
      formats: ["WEB_APP", "API"],
      tags: {
        create: [
          { displayOrder: 0, tag: { connect: { slug: "anti-bot-scraping" } } },
          { displayOrder: 1, tag: { connect: { slug: "react" } } },
          { displayOrder: 2, tag: { connect: { slug: "docker" } } },
        ],
      },
      clientMeta: {
        create: {
          teamSize: 15,
          contractStatus: "FREELANCE",
          workMode: "REMOTE",
          company: { connect: { slug: "acme" } },
        },
      },
    })

    const result = await findManyPublished({ locale: "fr" })

    expect(result).toHaveLength(1)
    expect(result[0]?.tags).toHaveLength(3)
    expect(result[0]?.tags.map((pt) => pt.tag.slug)).toEqual([
      "anti-bot-scraping",
      "react",
      "docker",
    ])
    expect(result[0]?.tags.map((pt) => pt.displayOrder)).toEqual([0, 1, 2])
    expect(result[0]?.tags.map((pt) => pt.tag.kind)).toEqual(["EXPERTISE", "FRAMEWORK", "INFRA"])
    expect(result[0]?.formats).toEqual(["WEB_APP", "API"])
    expect(result[0]?.clientMeta?.workMode).toBe("REMOTE")
    expect(result[0]?.clientMeta?.company.name).toBe("Acme")
    expect(result[0]?.clientMeta?.company.size).toBe("GROUPE")
  })

  it.each([
    ["fr", "Webapp Gestion Sinistres", "Desc FR"],
    ["en", "Claims Management Web App", "Desc EN"],
  ] as const)("resolves title and description in %s", async (locale, title, description) => {
    await createProject({
      slug: "bi",
      titleFr: "Webapp Gestion Sinistres",
      titleEn: "Claims Management Web App",
      descriptionFr: "Desc FR",
      descriptionEn: "Desc EN",
    })

    const result = await findManyPublished({ locale })

    expect(result[0]?.title).toBe(title)
    expect(result[0]?.description).toBe(description)
    expect(result[0]).not.toHaveProperty("titleFr")
    expect(result[0]).not.toHaveProperty("titleEn")
  })

  it.each([
    { locale: "fr", name: "Automatisation" },
    { locale: "en", name: "Automation" },
  ] as const)("applies the $locale locale to nested tags", async ({ locale, name }) => {
    await prisma.tag.create({
      data: {
        slug: "automatisation",
        nameFr: "Automatisation",
        nameEn: "Automation",
        kind: "EXPERTISE",
      },
    })
    await createProject({
      slug: "bi",
      tags: { create: [{ displayOrder: 0, tag: { connect: { slug: "automatisation" } } }] },
    })

    const result = await findManyPublished({ locale })

    expect(result[0]?.tags[0]?.tag.name).toBe(name)
    expect(result[0]?.tags[0]?.tag).not.toHaveProperty("nameFr")
  })
})

describe("findPublishedBySlug", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("returns the PUBLISHED project with its localized nested relations", async () => {
    await prisma.company.create({
      data: { slug: "acme", name: "Acme", sectors: ["LOGICIELS_ENTREPRISE"], size: "GROUPE" },
    })
    await prisma.tag.create({
      data: { slug: "react", nameFr: "React", nameEn: "React", kind: "FRAMEWORK" },
    })
    await createProject({
      slug: "mon-projet",
      titleFr: "Mon Projet",
      titleEn: "My Project",
      type: "CLIENT",
      tags: { create: [{ displayOrder: 0, tag: { connect: { slug: "react" } } }] },
      clientMeta: {
        create: { workMode: "REMOTE", company: { connect: { slug: "acme" } } },
      },
    })

    const result = await findPublishedBySlug("mon-projet", "en")

    expect(result).not.toBeNull()
    expect(result?.slug).toBe("mon-projet")
    expect(result?.title).toBe("My Project")
    expect(result?.tags).toHaveLength(1)
    expect(result?.tags[0]?.tag.slug).toBe("react")
    expect(result?.tags[0]?.displayOrder).toBe(0)
    expect(result?.clientMeta?.workMode).toBe("REMOTE")
    expect(result?.clientMeta?.company.name).toBe("Acme")
  })

  it.each([
    ["missing-slug", "a slug absent from the database"],
    ["my-draft", "an existing slug with status DRAFT"],
  ])("returns null for %s (%s)", async (slug) => {
    await createProject({ slug: "my-draft", status: "DRAFT" })

    const result = await findPublishedBySlug(slug, "fr")

    expect(result).toBeNull()
  })
})

describe("findPublishedBySlug company payload", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("does not expose the CRM fields of a published project's company", async () => {
    await prisma.company.create({
      data: {
        slug: "acme",
        name: "Acme",
        sectors: ["SAAS"],
        types: ["CLIENT_FINAL"],
        relationStatus: "DORMANTE",
        zones: ["LUXEMBOURG"],
        notes: "Note interne",
        details: "# 🏢 À propos\n\nDétails internes.",
      },
    })
    await createProject({
      slug: "mission",
      type: "CLIENT",
      clientMeta: {
        create: { workMode: "REMOTE", company: { connect: { slug: "acme" } } },
      },
    })

    const project = await findPublishedBySlug("mission", "fr")

    expect(Object.keys(project?.clientMeta?.company ?? {}).sort()).toEqual([
      "id",
      "logoFilename",
      "name",
      "sectors",
      "size",
      "slug",
      "websiteUrl",
    ])
  })
})
