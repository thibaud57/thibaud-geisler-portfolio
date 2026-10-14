import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"

import frMessages from "../../../../../messages/fr.json"
import type { LocalizedProjectWithRelations } from "@/types/project"
import { ProjectsList } from "./ProjectsList"

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}))

function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="fr" messages={frMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

type Company = NonNullable<NonNullable<LocalizedProjectWithRelations["clientMeta"]>["company"]>

function createCompany(overrides?: Partial<Company>): Company {
  return {
    id: "company-id",
    slug: "personnel",
    name: "Personnel",
    websiteUrl: null,
    sectors: [],
    size: null,
    logoFilename: null,
    ...overrides,
  }
}

function createProject(
  overrides?: Partial<LocalizedProjectWithRelations>,
): LocalizedProjectWithRelations {
  const now = new Date()
  const company = overrides?.clientMeta?.company ?? createCompany()
  return {
    id: "project-id",
    slug: "project-slug",
    title: "Project",
    description: "Desc",
    type: "PERSONAL",
    status: "PUBLISHED",
    formats: [],
    startedAt: null,
    endedAt: null,
    githubUrl: null,
    demoUrl: null,
    coverFilename: null,
    caseStudyMarkdown: null,
    displayOrder: 0,
    createdAt: now,
    updatedAt: now,
    tags: [],
    clientMeta: {
      id: "clientmeta-id",
      projectId: "project-id",
      companyId: company.id,
      teamSize: null,
      contractStatus: null,
      workMode: "REMOTE",
      deliverablesCount: 1,
      createdAt: now,
      updatedAt: now,
      company,
    },
    ...overrides,
  }
}

describe("ProjectsList filter", () => {
  const projects = [
    createProject({ id: "1", slug: "p1", title: "Client Project 1", type: "CLIENT" }),
    createProject({ id: "2", slug: "p2", title: "Personal Project 1", type: "PERSONAL" }),
    createProject({ id: "3", slug: "p3", title: "Client Project 2", type: "CLIENT" }),
  ]

  it("shows every project by default", () => {
    renderWithIntl(<ProjectsList projects={projects} />)

    expect(screen.getAllByRole("article")).toHaveLength(3)
  })

  it.each([
    [/client/i, 2],
    [/personnel/i, 1],
  ])("filters the projects when the %s tab is selected", async (tab, expectedCount) => {
    const user = userEvent.setup()
    renderWithIntl(<ProjectsList projects={projects} />)

    await user.click(screen.getByRole("tab", { name: tab }))

    expect(screen.getAllByRole("article")).toHaveLength(expectedCount)
  })

  it("shows every project again when the all tab is selected", async () => {
    const user = userEvent.setup()
    renderWithIntl(<ProjectsList projects={projects} />)
    await user.click(screen.getByRole("tab", { name: /client/i }))

    await user.click(screen.getByRole("tab", { name: /tous/i }))

    expect(screen.getAllByRole("article")).toHaveLength(3)
  })
})
