import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))

import { prisma, resetDatabase } from "@/lib/prisma-test-setup"
import { createProject } from "@/server/actions/projects"
import { initialProjectFormState } from "@/server/actions/projects.types"

function buildFormData(overrides: Record<string, string> = {}, tagIds: string[] = []): FormData {
  const formData = new FormData()
  const base = {
    slug: "mon-projet",
    titleFr: "Mon projet",
    titleEn: "My project",
    descriptionFr: "Description française",
    descriptionEn: "English description",
    type: "PERSONAL",
    status: "DRAFT",
    startedAt: "",
    endedAt: "",
    githubUrl: "",
    demoUrl: "",
    coverFilename: "",
    caseStudyMarkdownFr: "",
    caseStudyMarkdownEn: "",
    displayOrder: "1",
    companyId: "",
    workMode: "REMOTE",
    contractStatus: "",
    teamSize: "",
    deliverablesCount: "1",
  }
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    formData.set(key, value)
  }
  formData.append("formats", "WEB_APP")
  for (const tagId of tagIds) formData.append("tagIds", tagId)
  return formData
}

describe("createProject against real Postgres foreign key violations", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("reports a companyId with no matching company as company_not_found on the companyId field", async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ companyId: "does-not-exist" }),
    )

    expect(state.message).toBe("company_not_found")
    expect(state.errors.companyId).toBeDefined()
  })

  it("reports a tagId with no matching tag as tag_not_found on the tagIds field", async () => {
    const company = await prisma.company.create({
      data: { slug: "acme", name: "Acme", sectors: [], size: null },
    })

    const state = await createProject(
      initialProjectFormState,
      buildFormData({ companyId: company.id }, ["does-not-exist"]),
    )

    expect(state.message).toBe("tag_not_found")
    expect(state.errors.tagIds).toBeDefined()
  })
})
