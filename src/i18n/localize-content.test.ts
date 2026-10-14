import { describe, expect, it } from "vitest"
import { localizeProject, localizeTag } from "./localize-content"

function createTag(
  overrides?: Partial<{ id: string; slug: string; nameFr: string; nameEn: string }>,
) {
  return {
    id: "tag-1",
    slug: "docker",
    nameFr: "Docker",
    nameEn: "Docker",
    kind: "INFRA" as const,
    icon: "simple-icons:docker",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createProject() {
  return {
    id: "proj-1",
    slug: "webapp-gestion-sinistres",
    titleFr: "Webapp Gestion Sinistres",
    titleEn: "Claims Management Web App",
    descriptionFr: "Description FR",
    descriptionEn: "Description EN",
    caseStudyMarkdownFr: "# Contexte FR",
    caseStudyMarkdownEn: "# Context EN",
    type: "CLIENT" as const,
    status: "PUBLISHED" as const,
    formats: [],
    startedAt: null,
    endedAt: null,
    githubUrl: null,
    demoUrl: null,
    coverFilename: null,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    clientMeta: null,
  }
}

describe("localizeTag", () => {
  it.each([
    ["fr", "Automatisation"],
    ["en", "Automation"],
  ] as const)("resolves the name from the %s column", (locale, expected) => {
    const tag = createTag({ nameFr: "Automatisation", nameEn: "Automation" })

    const result = localizeTag(tag, locale)

    expect(result.name).toBe(expected)
  })

  it("keeps slug and icon and drops the twin name columns", () => {
    const result = localizeTag(createTag(), "fr")

    expect(result.slug).toBe("docker")
    expect(result.icon).toBe("simple-icons:docker")
    expect(result).not.toHaveProperty("nameFr")
    expect(result).not.toHaveProperty("nameEn")
  })
})

describe("localizeProject", () => {
  it.each([
    ["fr", "Webapp Gestion Sinistres", "Description FR", "# Contexte FR"],
    ["en", "Claims Management Web App", "Description EN", "# Context EN"],
  ] as const)(
    "resolves title, description and case study from the %s columns",
    (locale, title, description, caseStudyMarkdown) => {
      const result = localizeProject(createProject(), locale)

      expect(result).toMatchObject({ title, description, caseStudyMarkdown })
    },
  )

  it("drops the twin columns", () => {
    const result = localizeProject(createProject(), "fr")

    expect(result).not.toHaveProperty("titleFr")
    expect(result).not.toHaveProperty("titleEn")
    expect(result).not.toHaveProperty("descriptionFr")
    expect(result).not.toHaveProperty("caseStudyMarkdownFr")
  })

  it("localizes the nested tags and keeps their displayOrder", () => {
    const project = {
      ...createProject(),
      tags: [
        {
          projectId: "proj-1",
          tagId: "tag-1",
          displayOrder: 0,
          tag: createTag({ nameFr: "Automatisation", nameEn: "Automation" }),
        },
        {
          projectId: "proj-1",
          tagId: "tag-2",
          displayOrder: 1,
          tag: createTag({ id: "tag-2", slug: "scraping", nameFr: "Scraping", nameEn: "Scraping" }),
        },
      ],
    }

    const result = localizeProject(project, "en")

    expect(result.tags).toHaveLength(2)
    expect(result.tags[0]?.displayOrder).toBe(0)
    expect(result.tags[0]?.tag.name).toBe("Automation")
    expect(result.tags[0]?.tag).not.toHaveProperty("nameFr")
    expect(result.tags[1]?.tag.name).toBe("Scraping")
  })
})
