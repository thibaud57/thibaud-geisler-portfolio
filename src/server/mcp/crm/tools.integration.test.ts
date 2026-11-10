import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client"
import { createMcpHandler, type McpHttpHandler } from "@modelcontextprotocol/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const { childLog } = vi.hoisted(() => {
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() }
  // Même espion à chaque niveau : mcpLoggerFor enchaîne .child({ domain, keyId }) sur le logger de la requête
  log.child.mockReturnValue(log)
  return { childLog: log }
})
vi.mock("@/lib/logger", () => ({ logger: { child: vi.fn(() => childLog) } }))
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }))
// Mocks du préremplissage de l'admin, appelé tel quel pour comparer ses compteurs à ceux de l'outil.
vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/server/company-logo/fetch-company-logo", () => ({ retrieveCompanyLogo: vi.fn() }))

import type { Prisma } from "@/generated/prisma/client"
import { ADMIN_ASSETS_PATH } from "@/lib/admin/routes"
import {
  COMPANY_DETAILS_TEMPLATE,
  CONTACT_DETAILS_TEMPLATE,
  interviewDetailsTemplate,
  leadDetailsTemplate,
  OPPORTUNITY_DETAILS_TEMPLATE,
} from "@/lib/crm/details-templates"
import {
  CLOSED_WEEK_COUNTS,
  CLOSED_WEEK_FRIDAY,
  OPTED_OUT_AT,
  prisma,
  resetDatabase,
  seedClosedWeek,
  seedCompany,
  seedCompanyWithLegalEntity,
  seedEsn,
  seedOptedOutLead,
  seedPerson,
  storedAction,
  storedReview,
  storedSignal,
} from "@/lib/prisma-test-setup"
import { computeWeekCounters } from "@/server/actions/weekly-reviews"
import {
  retrieveCompanyLogo,
  type CompanyIconFailure,
} from "@/server/company-logo/fetch-company-logo"
import { CRM_ENTITY_NAMES } from "@/server/mcp/crm/registry"
import { buildServer } from "@/server/mcp/server"

const authInfo = {
  token: "tgp_test",
  clientId: "key-1",
  scopes: ["read", "write"],
  extra: { requestId: "req-1", ipHash: "abcd1234" },
}

let handler: McpHttpHandler
let client: Client

beforeEach(async () => {
  await resetDatabase()
  // Un handler par test : handler.close() est définitif
  handler = createMcpHandler(() => buildServer("crm"))
  client = new Client({ name: "test", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } })
  await client.connect(
    new StreamableHTTPClientTransport(new URL("http://test.invalid/mcp"), {
      fetch: (url, init) => handler.fetch(new Request(url, init), { authInfo }),
    }),
  )
})

afterEach(async () => {
  await client.close()
  await handler.close()
  vi.restoreAllMocks()
})

type ToolResult = Awaited<ReturnType<Client["callTool"]>>

function textOf(result: ToolResult): string {
  const [block] = result.content
  return block?.type === "text" ? block.text : ""
}

function jsonOf(result: ToolResult): unknown {
  return JSON.parse(textOf(result))
}

const searchBodySchema = z.object({ results: z.array(z.unknown()) })

function call(name: string, args: Record<string, unknown>) {
  return client.callTool({ name, arguments: args })
}

function seedNumberedCompanies(count: number, activeCount: number) {
  const data: Prisma.CompanyCreateManyInput[] = Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, "0")
    return {
      slug: `company-${number}`,
      name: `Company ${number}`,
      relationStatus: index < activeCount ? "ACTIVE" : "DORMANTE",
    }
  })
  return prisma.company.createMany({ data })
}

const createCompanyArgs = (data: Record<string, unknown>) => ({
  entity: "company",
  data: { types: ["CLIENT_FINAL"], ...data },
})

const entityEnumSchema = z.looseObject({
  properties: z.looseObject({ entity: z.looseObject({ enum: z.array(z.string()) }) }),
})
const branchesSchema = z.looseObject({ anyOf: z.array(z.looseObject({ title: z.string() })) })

describe("tools/list", () => {
  it("lists the generic tools and the logo tool with their hints", async () => {
    const { tools } = await client.listTools()

    const hints = Object.fromEntries(tools.map((tool) => [tool.name, tool.annotations]))
    expect(Object.keys(hints).sort()).toEqual([
      "crm_create",
      "crm_fetch",
      "crm_fetch_company_logo",
      "crm_query",
      "crm_search",
      "crm_update",
    ])
    expect(hints["crm_search"]?.readOnlyHint).toBe(true)
    expect(hints["crm_fetch"]).toMatchObject({ readOnlyHint: true, idempotentHint: true })
    expect(hints["crm_query"]?.readOnlyHint).toBe(true)
    expect(hints["crm_update"]?.idempotentHint).toBe(true)
    expect(hints["crm_fetch_company_logo"]?.readOnlyHint).not.toBe(true)
    expect(hints["crm_fetch_company_logo"]?.idempotentHint).toBe(true)
  })

  it.each(["crm_fetch", "crm_query", "crm_create", "crm_update"])(
    "gives %s a flat input schema whose entity lists every entity",
    async (name) => {
      const { tools } = await client.listTools()

      const inputSchema = tools.find((tool) => tool.name === name)?.inputSchema
      expect(inputSchema).not.toHaveProperty("oneOf")
      expect(inputSchema).not.toHaveProperty("anyOf")
      expect(entityEnumSchema.parse(inputSchema).properties.entity.enum).toEqual(CRM_ENTITY_NAMES)
    },
  )

  it.each([
    { name: "crm_query", part: "filters" },
    { name: "crm_create", part: "data" },
    { name: "crm_update", part: "fields" },
  ])("describes the $part of $name with one branch per entity", async ({ name, part }) => {
    const { tools } = await client.listTools()

    const properties = entityEnumSchema.parse(
      tools.find((tool) => tool.name === name)?.inputSchema,
    ).properties
    expect(branchesSchema.parse(properties[part]).anyOf.map(({ title }) => title)).toEqual(
      CRM_ENTITY_NAMES,
    )
  })

  // Contrat vu par l'agent : un écart de ce fichier est un changement visible, à relire avant de le valider.
  it("keeps the tool list the agent sees", async () => {
    const { tools } = await client.listTools()

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
    const instructions = client.getInstructions() ?? ""

    expect(CRM_ENTITY_NAMES.filter((entity) => !instructions.includes(entity))).toEqual([])
  })
})

describe("crm_search", () => {
  it("finds a company ignoring case and accents, with its slug as hint", async () => {
    const company = await seedCompany({ slug: "societe-acme", name: "Société Acme" })
    await seedCompany({ slug: "globex", name: "Globex" })

    const result = await call("crm_search", { query: "societe acm" })

    expect(jsonOf(result)).toEqual({
      results: [{ entity: "company", id: company.id, label: "Société Acme", hint: "societe-acme" }],
    })
  })

  it.each(["", "   "])("rejects the blank search query %j", async (query) => {
    const result = await call("crm_search", { query })

    expect(result.isError).toBe(true)
  })

  it("caps search results at 50", async () => {
    await seedNumberedCompanies(60, 60)

    const capped = await call("crm_search", { query: "company", limit: 50 })
    const overCap = await call("crm_search", { query: "company", limit: 51 })

    expect(searchBodySchema.parse(jsonOf(capped)).results).toHaveLength(50)
    expect(overCap.isError).toBe(true)
  })

  it("returns 10 results by default", async () => {
    await seedNumberedCompanies(12, 12)

    const result = await call("crm_search", { query: "company" })

    expect(searchBodySchema.parse(jsonOf(result)).results).toHaveLength(10)
  })

  it("ranks an exact match first even when it sorts last alphabetically and the limit would cut it", async () => {
    const data = Array.from({ length: 11 }, (_, index) => {
      const number = String(index + 1).padStart(2, "0")
      return { slug: `alpha-zed-${number}`, name: `Alpha Zed ${number}` }
    })
    await prisma.company.createMany({ data })
    const exact = await seedCompany({ slug: "zed", name: "Zed" })

    const result = await call("crm_search", { query: "zed" })

    const { results } = searchBodySchema.parse(jsonOf(result))
    expect(results).toHaveLength(10)
    expect(results[0]).toMatchObject({ id: exact.id })
  })

  it("ranks prefix matches before substring matches, alphabetically within a rank", async () => {
    await seedCompany({ slug: "alpha-zed", name: "Alpha Zed" })
    await seedCompany({ slug: "zedcorp", name: "Zedcorp" })
    await seedCompany({ slug: "zedzed", name: "Zedzed" })

    const result = await call("crm_search", { query: "zed" })

    const { results } = searchBodySchema.parse(jsonOf(result))
    expect(results).toMatchObject([
      { label: "Zedcorp" },
      { label: "Zedzed" },
      { label: "Alpha Zed" },
    ])
  })

  it("refuses an unknown entity filter", async () => {
    const result = await call("crm_search", { query: "acme", entities: ["spaceship"] })

    expect(result.isError).toBe(true)
  })
})

describe("crm_fetch", () => {
  it("fetches a company with its legal entity, persons and opportunities", async () => {
    const company = await seedCompany({
      name: "Acme",
      legalEntity: { create: { slug: "acme", name: "Acme SAS", siret: "12345678901234" } },
    })
    const person = await seedPerson({ name: "Jane Doe", companyId: company.id })
    const opportunity = await prisma.opportunity.create({
      data: { title: "Mission Acme", clientId: company.id },
    })

    const result = await call("crm_fetch", { entity: "company", id: company.id })

    expect(result.isError).toBeFalsy()
    expect(jsonOf(result)).toMatchObject({
      id: company.id,
      name: "Acme",
      legalEntity: { name: "Acme SAS", siret: "12345678901234" },
      persons: [{ id: person.id, name: "Jane Doe", roles: ["lead"] }],
      opportunitiesAsClient: [{ id: opportunity.id, title: "Mission Acme" }],
      opportunitiesAsIntermediary: [],
    })
  })

  it("flags an unknown id in crm_fetch", async () => {
    const result = await call("crm_fetch", { entity: "company", id: "missing-id" })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("missing-id")
    expect(textOf(result)).toContain("crm_search")
  })
})

describe("crm_query", () => {
  it("filters, sorts and paginates crm_query with a total", async () => {
    await seedNumberedCompanies(25, 12)

    const result = await call("crm_query", {
      entity: "company",
      filters: { relationStatus: "ACTIVE" },
      limit: 5,
      offset: 10,
    })

    expect(jsonOf(result)).toMatchObject({
      total: 12,
      rows: [{ name: "Company 11" }, { name: "Company 12" }],
    })
  })

  it("sorts crm_query by name in the requested order", async () => {
    await seedNumberedCompanies(3, 3)

    const result = await call("crm_query", { entity: "company", sort: "name", order: "desc" })

    expect(jsonOf(result)).toMatchObject({
      rows: [{ name: "Company 03" }, { name: "Company 02" }, { name: "Company 01" }],
    })
  })

  it("filters crm_query on types, zones, sectors and size", async () => {
    await seedCompany({
      slug: "match",
      name: "Match",
      types: ["CLIENT_FINAL"],
      zones: ["PARIS"],
      sectors: ["SAAS"],
      size: "PME",
    })
    await seedCompany({ slug: "other", name: "Other", types: ["PARTENAIRE"], zones: ["MONDE"] })

    const result = await call("crm_query", {
      entity: "company",
      filters: { types: ["CLIENT_FINAL"], zones: ["PARIS"], sectors: ["SAAS"], size: "PME" },
    })

    expect(jsonOf(result)).toMatchObject({ total: 1, rows: [{ slug: "match" }] })
  })

  it.each([{ limit: 0 }, { limit: 500 }, { limit: -1 }, { offset: -1 }])(
    "bounds limit and offset in crm_query (%j)",
    async (bounds) => {
      const result = await call("crm_query", { entity: "company", ...bounds })

      expect(result.isError).toBe(true)
    },
  )
})

describe("crm_create", () => {
  it("creates a company with the details template when details is absent", async () => {
    const result = await call("crm_create", createCompanyArgs({ slug: "acme", name: "Acme" }))

    const stored = await prisma.company.findUniqueOrThrow({ where: { slug: "acme" } })
    expect(jsonOf(result)).toEqual({ id: stored.id, slug: "acme", name: "Acme" })
    expect(stored.details).toBe(COMPANY_DETAILS_TEMPLATE)
  })

  it("requires at least one type, like the admin form", async () => {
    const missing = await call("crm_create", {
      entity: "company",
      data: { slug: "acme", name: "Acme" },
    })
    const empty = await call(
      "crm_create",
      createCompanyArgs({ slug: "acme", name: "Acme", types: [] }),
    )

    expect(missing.isError).toBe(true)
    expect(textOf(missing)).toContain("types")
    expect(empty.isError).toBe(true)
    expect(textOf(empty)).toContain("types")
    expect(await prisma.company.count()).toBe(0)
  })

  it("keeps an explicit null details instead of the template", async () => {
    await call("crm_create", createCompanyArgs({ slug: "acme", name: "Acme", details: null }))

    const stored = await prisma.company.findUniqueOrThrow({ where: { slug: "acme" } })
    expect(stored.details).toBeNull()
  })

  it("lowercases and trims the slug like the admin", async () => {
    await call("crm_create", createCompanyArgs({ slug: " Acme ", name: "Acme" }))

    const stored = await prisma.company.findMany()
    expect(stored.map((company) => company.slug)).toEqual(["acme"])
  })

  it("rejects a taken or malformed slug in crm_create", async () => {
    await seedCompany({ slug: "acme" })

    const taken = await call("crm_create", createCompanyArgs({ slug: "Acme", name: "Other" }))
    const malformed = await call(
      "crm_create",
      createCompanyArgs({ slug: "Acme Corp", name: "Other" }),
    )
    const created = await call(
      "crm_create",
      createCompanyArgs({ slug: " Acme-Corp ", name: "Corp" }),
    )

    expect(taken.isError).toBe(true)
    expect(textOf(taken)).toContain('"acme"')
    expect(textOf(taken)).toContain("already used")
    expect(malformed.isError).toBe(true)
    expect(textOf(malformed).toLowerCase()).toContain("slug")
    expect(created.isError).toBeFalsy()
    expect(jsonOf(created)).toMatchObject({ slug: "acme-corp" })
  })

  it("rejects legalEntity fields in crm_create and crm_update", async () => {
    const company = await seedCompany()

    const create = await call(
      "crm_create",
      createCompanyArgs({ slug: "globex", name: "Globex", legalEntityName: "Globex SAS" }),
    )
    const update = await call("crm_update", {
      entity: "company",
      id: company.id,
      fields: { legalEntityName: "Acme SAS" },
    })

    expect(create.isError).toBe(true)
    expect(update.isError).toBe(true)
    expect(await prisma.company.count({ where: { slug: "globex" } })).toBe(0)
    expect(await prisma.legalEntity.count()).toBe(0)
  })
})

describe("cache refresh", () => {
  it("refreshes the caches after a successful write only", async () => {
    await seedCompany({ slug: "acme" })

    await call("crm_create", createCompanyArgs({ slug: "acme", name: "Duplicate" }))

    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()

    await call("crm_create", createCompanyArgs({ slug: "globex", name: "Globex" }))

    expect(revalidateTag).toHaveBeenCalledWith("projects", "max")
    expect(revalidateTag).toHaveBeenCalledWith("legal-entity", "max")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/entreprises", "layout")
  })

  it("refreshes the caches after a successful update", async () => {
    const company = await seedCompany()

    await call("crm_update", {
      entity: "company",
      id: company.id,
      fields: { relationStatus: "DORMANTE" },
    })

    expect(revalidateTag).toHaveBeenCalledWith("projects", "max")
    expect(revalidateTag).toHaveBeenCalledWith("legal-entity", "max")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/entreprises", "layout")
  })
})

describe("crm_update", () => {
  async function createFromTemplate() {
    await call("crm_create", createCompanyArgs({ slug: "acme", name: "Acme" }))
    return prisma.company.findUniqueOrThrow({ where: { slug: "acme" } })
  }

  it("updates a field and a details section", async () => {
    const company = await createFromTemplate()

    const result = await call("crm_update", {
      entity: "company",
      id: company.id,
      fields: { relationStatus: "DORMANTE" },
      detailsSection: { heading: "Chiffres clés", content: "50 salariés" },
    })

    const stored = await prisma.company.findUniqueOrThrow({ where: { id: company.id } })
    expect(result.isError).toBeFalsy()
    expect(stored.relationStatus).toBe("DORMANTE")
    expect(stored.details).toBe(
      COMPANY_DETAILS_TEMPLATE.replace(
        "# 📊 Chiffres clés\n",
        "# 📊 Chiffres clés\n\n50 salariés\n",
      ),
    )
  })

  it.each([
    ["neither fields nor detailsSection", {}],
    ["an empty fields object", { fields: {} }],
  ])("rejects crm_update with %s", async (_label, patch) => {
    const company = await seedCompany()

    const result = await call("crm_update", { entity: "company", id: company.id, ...patch })

    expect(result.isError).toBe(true)
  })

  it("rejects fields.details together with detailsSection", async () => {
    const company = await createFromTemplate()

    const result = await call("crm_update", {
      entity: "company",
      id: company.id,
      fields: { details: "# Texte" },
      detailsSection: { heading: "Chiffres clés", content: "50 salariés" },
    })

    const stored = await prisma.company.findUniqueOrThrow({ where: { id: company.id } })
    expect(result.isError).toBe(true)
    expect(stored.details).toBe(COMPANY_DETAILS_TEMPLATE)
  })

  it("rejects a detailsSection content that carries its own heading line", async () => {
    const company = await createFromTemplate()

    const result = await call("crm_update", {
      entity: "company",
      id: company.id,
      detailsSection: { heading: "Chiffres clés", content: "50 salariés\n# Autre titre" },
    })

    const stored = await prisma.company.findUniqueOrThrow({ where: { id: company.id } })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("without its heading")
    expect(stored.details).toBe(COMPANY_DETAILS_TEMPLATE)
  })

  it("rejects an empty types list in a patch", async () => {
    const company = await seedCompany({ types: ["CLIENT_FINAL"] })

    const result = await call("crm_update", {
      entity: "company",
      id: company.id,
      fields: { types: [] },
    })

    const stored = await prisma.company.findUniqueOrThrow({ where: { id: company.id } })
    expect(result.isError).toBe(true)
    expect(stored.types).toEqual(["CLIENT_FINAL"])
  })

  it("reports a missing section with the headings present and writes nothing", async () => {
    const company = await createFromTemplate()

    const result = await call("crm_update", {
      entity: "company",
      id: company.id,
      fields: { name: "Renamed" },
      detailsSection: { heading: "Effectifs", content: "50" },
    })

    const stored = await prisma.company.findUniqueOrThrow({ where: { id: company.id } })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("À propos")
    expect(textOf(result)).toContain("Chiffres clés")
    expect(stored.name).toBe("Acme")
    expect(stored.details).toBe(COMPANY_DETAILS_TEMPLATE)
  })

  it("names the lowercased slug when crm_update hits a taken slug", async () => {
    await seedCompany({ slug: "acme" })
    const other = await seedCompany({ slug: "globex", name: "Globex" })

    const result = await call("crm_update", {
      entity: "company",
      id: other.id,
      fields: { slug: " Acme " },
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('"acme"')
  })

  it("keeps the legal entity untouched on crm_update", async () => {
    const company = await seedCompanyWithLegalEntity({ siret: "12345678901234" })
    const before = await prisma.legalEntity.findUniqueOrThrow({
      where: { slug: "acme" },
      include: { address: true },
    })

    await call("crm_update", { entity: "company", id: company.id, fields: { name: "Renamed" } })

    const after = await prisma.legalEntity.findUniqueOrThrow({
      where: { slug: "acme" },
      include: { address: true },
    })
    expect(after).toEqual(before)
  })
})

describe("crm_fetch_company_logo", () => {
  const LOGO_KEY = "freelance/crm/entreprises/acme/logo-0123456789ab.png"
  const PREVIOUS_LOGO_KEY = "freelance/crm/entreprises/acme/logo-previous.png"

  function seedCompanyWithSite(overrides: Partial<Prisma.CompanyCreateInput> = {}) {
    return seedCompany({
      websiteUrl: "https://acme.example.com",
      logoFilename: PREVIOUS_LOGO_KEY,
      ...overrides,
    })
  }

  async function storedLogo(id: string) {
    return (await prisma.company.findUniqueOrThrow({ where: { id } })).logoFilename
  }

  it("stores the fetched logo and returns its key", async () => {
    const company = await seedCompanyWithSite()
    vi.mocked(retrieveCompanyLogo).mockResolvedValueOnce({
      ok: true,
      key: LOGO_KEY,
      width: 256,
      height: 256,
      source: "icon",
    })

    const result = await call("crm_fetch_company_logo", { id: company.id })

    expect(result.isError).toBeFalsy()
    expect(jsonOf(result)).toEqual({ id: company.id, logoFilename: LOGO_KEY })
    expect(await storedLogo(company.id)).toBe(LOGO_KEY)
    expect(revalidatePath).toHaveBeenCalledWith(ADMIN_ASSETS_PATH)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/entreprises", "layout")
    expect(revalidateTag).toHaveBeenCalledWith("projects", "max")
    expect(revalidateTag).toHaveBeenCalledWith("legal-entity", "max")
    expect(childLog.info).toHaveBeenCalledWith({ event: "company_logo:fetched", id: company.id })
  })

  it("asks for a website when the company has none", async () => {
    const company = await seedCompanyWithSite({ websiteUrl: null })

    const result = await call("crm_fetch_company_logo", { id: company.id })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("websiteUrl")
    expect(textOf(result)).toContain("crm_update")
    expect(textOf(result)).toContain("Wayback")
    expect(retrieveCompanyLogo).not.toHaveBeenCalled()
    expect(await storedLogo(company.id)).toBe(PREVIOUS_LOGO_KEY)
  })

  it("flags an unknown id", async () => {
    const result = await call("crm_fetch_company_logo", { id: "missing-id" })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("crm_search")
  })

  it("flags a website the logo service cannot parse", async () => {
    const company = await seedCompanyWithSite({ websiteUrl: "pas-une-url" })

    const result = await call("crm_fetch_company_logo", { id: company.id })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("websiteUrl")
    expect(retrieveCompanyLogo).not.toHaveBeenCalled()
  })

  it.each<[CompanyIconFailure, string]>([
    [{ ok: false, message: "site_unreachable", status: null }, "could not be reached"],
    [{ ok: false, message: "site_too_slow" }, "too slowly"],
    [{ ok: false, message: "address_blocked" }, "internal or private"],
    [{ ok: false, message: "icon_too_small", size: 16 }, "too small"],
    [{ ok: false, message: "no_icon_found" }, "No icon was found"],
  ])("reports the service failure cause %j", async (failure, cause) => {
    const company = await seedCompanyWithSite()
    vi.mocked(retrieveCompanyLogo).mockResolvedValueOnce(failure)

    const result = await call("crm_fetch_company_logo", { id: company.id })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain(cause)
    expect(textOf(result)).toContain("websiteUrl")
    expect(await storedLogo(company.id)).toBe(PREVIOUS_LOGO_KEY)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("logs and reports an unknown error when the storage throws", async () => {
    const company = await seedCompanyWithSite()
    const failure = new Error("storage down")
    vi.mocked(retrieveCompanyLogo).mockRejectedValueOnce(failure)

    const result = await call("crm_fetch_company_logo", { id: company.id })

    expect(result.isError).toBe(true)
    expect(textOf(result)).not.toContain("storage down")
    expect(await storedLogo(company.id)).toBe(PREVIOUS_LOGO_KEY)
    expect(revalidatePath).not.toHaveBeenCalled()
    expect(childLog.error).toHaveBeenCalledWith({
      err: failure,
      event: "company_logo:fetch_failed",
      id: company.id,
    })
  })
})

describe("tool logs", () => {
  it("logs a write with the key id", async () => {
    await call("crm_create", createCompanyArgs({ slug: "acme", name: "Acme" }))

    expect(childLog.child).toHaveBeenCalledWith({ domain: "crm", keyId: "key-1" })
    expect(childLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: "company:created", slug: "acme" }),
    )
  })

  it("logs an unknown write failure and answers with a generic error", async () => {
    const failure = new Error("database down")
    vi.spyOn(prisma.company, "create").mockRejectedValueOnce(failure)

    const result = await call("crm_create", createCompanyArgs({ slug: "acme", name: "Acme" }))

    expect(result.isError).toBe(true)
    expect(textOf(result)).not.toContain("database down")
    expect(childLog.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: failure, event: "company:create_failed", slug: "acme" }),
    )
  })

  it("logs an unknown update failure with the company id", async () => {
    const company = await seedCompany({ slug: "acme" })
    const failure = new Error("database down")
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(failure)

    const result = await call("crm_update", {
      entity: "company",
      id: company.id,
      fields: { name: "Renamed" },
    })

    expect(result.isError).toBe(true)
    expect(childLog.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: failure, event: "company:update_failed", id: company.id }),
    )
  })

  it("logs an unknown read failure and answers with a generic error", async () => {
    const company = await seedCompany({ slug: "acme" })
    const failure = new Error("database down")
    vi.spyOn(prisma.company, "findUnique").mockRejectedValueOnce(failure)

    const result = await call("crm_fetch", { entity: "company", id: company.id })

    expect(result.isError).toBe(true)
    expect(textOf(result)).not.toContain("database down")
    expect(childLog.error).toHaveBeenCalledWith({
      err: failure,
      event: "crm:fetch_failed",
      entity: "company",
      id: company.id,
    })
  })
})

function seedLeadsWithStatus(status: "DISCUSSION" | "NOUVEAU", count: number) {
  return Promise.all(
    Array.from({ length: count }, (_, index) =>
      prisma.person.create({
        data: {
          name: `${status} ${index}`,
          lead: { create: { origin: "OUTBOUND", status } },
        },
      }),
    ),
  )
}

const idBodySchema = z.object({ id: z.string() })

const createLeadArgs = (data: Record<string, unknown>) => ({ entity: "lead", data })
const createContactArgs = (data: Record<string, unknown>) => ({ entity: "contact", data })

describe("persons in crm_search", () => {
  it("finds a person by name and by email, ignoring case and accents", async () => {
    const acme = await seedCompany()
    const jane = await seedPerson({
      name: "Jane Doe",
      email: "jane.doe@example.com",
      companyId: acme.id,
    })

    const byName = await call("crm_search", { query: "JÁNE doe" })
    const byEmail = await call("crm_search", { query: "Jane.Doe@Example" })

    const expected = {
      results: [{ entity: "lead", id: jane.id, label: "Jane Doe", hint: "Acme · lead" }],
    }
    expect(jsonOf(byName)).toEqual(expected)
    expect(jsonOf(byEmail)).toEqual(expected)
  })

  it("names every role of the person in the hint of each entity", async () => {
    const jane = await seedPerson({ name: "Jane Doe" }, { lead: true, contact: true })

    const result = await call("crm_search", { query: "jane" })

    expect(searchBodySchema.parse(jsonOf(result)).results).toEqual(
      expect.arrayContaining([
        { entity: "lead", id: jane.id, label: "Jane Doe", hint: "lead and contact" },
        { entity: "contact", id: jane.id, label: "Jane Doe", hint: "lead and contact" },
      ]),
    )
  })

  it("skips a person who holds no role", async () => {
    await seedPerson({ name: "Jane Doe" }, { lead: false, contact: false })

    const result = await call("crm_search", { query: "jane" })

    expect(jsonOf(result)).toEqual({ results: [] })
  })

  it.each(["jane_doe_ex", "jane.doe@exam"])(
    "finds a person by the fragment %j, never an opted-out one",
    async (fragment) => {
      const jane = await seedPerson({
        name: "Jane Doe",
        email: "jane.doe@example.com",
        linkedinUrl: "https://www.linkedin.com/in/jane_doe_example",
      })
      await seedOptedOutLead({
        email: "john.roe@example.com",
        linkedinUrl: "https://www.linkedin.com/in/john_roe_example",
      })

      const found = await call("crm_search", { query: fragment })
      const opposedByEmail = await call("crm_search", { query: "john.roe" })
      const opposedByLinkedin = await call("crm_search", { query: "john_roe" })

      expect(jsonOf(found)).toMatchObject({ results: [{ id: jane.id }] })
      expect(jsonOf(opposedByEmail)).toEqual({ results: [] })
      expect(jsonOf(opposedByLinkedin)).toEqual({ results: [] })
    },
  )

  it.each([
    ["her email", " John.Roe@Example.com ", "john.roe@example.com"],
    [
      "her LinkedIn URL",
      "linkedin.com/in/John_Roe_Example/",
      "https://www.linkedin.com/in/john_roe_example",
    ],
  ])("finds an opted-out person by %s only", async (_label, query, hint) => {
    const opposed = await seedOptedOutLead({
      email: "john.roe@example.com",
      linkedinUrl: "https://www.linkedin.com/in/john_roe_example",
    })

    const result = await call("crm_search", { query })

    expect(jsonOf(result)).toStrictEqual({
      results: [
        {
          entity: "lead",
          id: opposed.id,
          label: "Opposée à la prospection",
          hint,
          optedOut: true,
        },
      ],
    })
  })
})

describe("persons in crm_fetch", () => {
  it.each(["lead", "contact"] as const)(
    "fetches the metAt of a %s as the day crm_update takes",
    async (entity) => {
      const jane = await seedPerson(
        { name: "Jane Doe", metAt: new Date("2026-09-15T00:00:00Z") },
        { lead: true, contact: true },
      )

      const result = await call("crm_fetch", { entity, id: jane.id })

      expect(jsonOf(result)).toMatchObject({ metAt: "2026-09-15" })
    },
  )

  it("fetches a lead with its links and its roles", async () => {
    const acme = await seedCompany()
    const jane = await seedPerson({
      name: "Jane Doe",
      email: "jane.doe@example.com",
      companyId: acme.id,
    })
    const opportunity = await prisma.opportunity.create({
      data: { title: "Mission Acme", clientId: acme.id, referrerId: jane.id },
    })
    await prisma.signal.create({
      data: {
        personId: jane.id,
        type: "POST",
        occurredOn: new Date("2026-09-01"),
        content: "Post sur le recrutement",
      },
    })

    const result = await call("crm_fetch", { entity: "lead", id: jane.id })

    expect(result.isError).toBeFalsy()
    expect(jsonOf(result)).toMatchObject({
      id: jane.id,
      name: "Jane Doe",
      email: "jane.doe@example.com",
      company: { id: acme.id, name: "Acme" },
      roles: ["lead"],
      origin: "OUTBOUND",
      opportunities: [{ id: opportunity.id, title: "Mission Acme" }],
      signals: [{ content: "Post sur le recrutement" }],
      interviews: [],
      actionsCount: 0,
    })
  })

  it("fetches a contact with its roles", async () => {
    const jane = await seedPerson(
      { name: "Jane Doe", email: "jane.doe@example.com" },
      { lead: true, contact: true },
    )

    const result = await call("crm_fetch", { entity: "contact", id: jane.id })

    expect(jsonOf(result)).toMatchObject({
      id: jane.id,
      name: "Jane Doe",
      roles: ["lead", "contact"],
      status: "ACTIF",
    })
  })

  it("fetches an opted-out record reduced, without email or LinkedIn", async () => {
    const opposed = await seedOptedOutLead({
      email: "john.roe@example.com",
      linkedinUrl: "https://www.linkedin.com/in/john_roe_example",
    })

    const result = await call("crm_fetch", { entity: "lead", id: opposed.id })

    expect(jsonOf(result)).toStrictEqual({
      id: opposed.id,
      name: null,
      optedOut: true,
      optedOutAt: "2026-10-01T02:00:00.000+02:00",
    })
  })

  it("flags the id of a person who holds the other role only", async () => {
    const jane = await seedPerson({ name: "Jane Doe" }, { lead: false, contact: true })

    const result = await call("crm_fetch", { entity: "lead", id: jane.id })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("crm_search")
  })
})

describe("persons in crm_query", () => {
  it("filters leads and contacts in crm_query", async () => {
    const acme = await seedCompany()
    await seedLeadsWithStatus("DISCUSSION", 3)
    await seedLeadsWithStatus("NOUVEAU", 2)
    await prisma.person.create({
      data: {
        name: "Jane Doe",
        companyId: acme.id,
        contact: { create: { types: ["CLIENT"], status: "ACTIF" } },
      },
    })
    await prisma.person.create({
      data: { name: "John Roe", contact: { create: { types: ["MENTOR"], status: "INACTIF" } } },
    })

    const leads = await call("crm_query", { entity: "lead", filters: { status: "DISCUSSION" } })
    const contacts = await call("crm_query", {
      entity: "contact",
      filters: { types: ["CLIENT"], status: "ACTIF", companyId: acme.id },
    })

    expect(jsonOf(leads)).toMatchObject({ total: 3, rows: [{}, {}, {}] })
    expect(jsonOf(contacts)).toMatchObject({
      total: 1,
      rows: [{ name: "Jane Doe", company: { name: "Acme" }, status: "ACTIF", types: ["CLIENT"] }],
    })
  })

  it("returns summary rows with id, name, company, status and update date", async () => {
    const acme = await seedCompany()
    const jane = await seedPerson({ name: "Jane Doe", companyId: acme.id })

    const result = await call("crm_query", { entity: "lead" })

    expect(jsonOf(result)).toStrictEqual({
      total: 1,
      rows: [
        {
          id: jane.id,
          name: "Jane Doe",
          company: { id: acme.id, name: "Acme" },
          status: "NOUVEAU",
          updatedAt: expect.any(String) as unknown,
        },
      ],
    })
  })

  it("sorts and paginates leads", async () => {
    await seedLeadsWithStatus("NOUVEAU", 3)

    const result = await call("crm_query", {
      entity: "lead",
      sort: "name",
      order: "desc",
      limit: 1,
      offset: 1,
    })

    expect(jsonOf(result)).toMatchObject({ total: 3, rows: [{ name: "NOUVEAU 1" }] })
  })

  it("keeps opted-out persons out of crm_query", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    await seedOptedOutLead({ email: "john.roe@example.com" })

    const unfiltered = await call("crm_query", { entity: "lead" })
    const asked = await call("crm_query", { entity: "lead", filters: { optedOut: true } })

    expect(jsonOf(unfiltered)).toMatchObject({ total: 1, rows: [{ id: jane.id }] })
    expect(asked.isError).toBe(true)
  })
})

describe("persons in crm_create", () => {
  it("creates a lead with the OUTBOUND template", async () => {
    const acme = await seedCompany()

    const result = await call(
      "crm_create",
      createLeadArgs({
        name: " Jane Doe ",
        origin: "OUTBOUND",
        email: "Jane.Doe@Example.com ",
        linkedinUrl: "linkedin.com/in/Jane_Doe_Example/",
        metAt: "2026-09-15",
        companyId: acme.id,
      }),
    )

    const stored = await prisma.person.findFirstOrThrow({ include: { lead: true } })
    expect(jsonOf(result)).toEqual({ id: stored.id })
    expect(stored).toMatchObject({
      name: "Jane Doe",
      email: "jane.doe@example.com",
      linkedinUrl: "https://www.linkedin.com/in/jane_doe_example",
      companyId: acme.id,
      details: leadDetailsTemplate("OUTBOUND"),
      lead: { origin: "OUTBOUND", status: "NOUVEAU", score: null },
    })
    expect(stored.metAt?.toISOString()).toBe("2026-09-15T00:00:00.000Z")
  })

  it("keeps an explicit null details instead of the template", async () => {
    await call("crm_create", createLeadArgs({ name: "Jane Doe", origin: "INBOUND", details: null }))

    const stored = await prisma.person.findFirstOrThrow()
    expect(stored.details).toBeNull()
  })

  it("creates a contact directly", async () => {
    const result = await call(
      "crm_create",
      createContactArgs({ name: "John Roe", types: ["CLIENT"], status: "ACTIF" }),
    )

    const stored = await prisma.person.findUniqueOrThrow({
      where: { id: idBodySchema.parse(jsonOf(result)).id },
      include: { contact: true, lead: true },
    })
    expect(stored).toMatchObject({
      details: CONTACT_DETAILS_TEMPLATE,
      contact: { types: ["CLIENT"] },
      lead: null,
    })
  })

  it("promotes a lead to a contact with fromLeadId", async () => {
    const lead = await seedPerson({ name: "Jane Doe", details: leadDetailsTemplate("OUTBOUND") })

    const result = await call(
      "crm_create",
      createContactArgs({ fromLeadId: lead.id, types: ["PARTENAIRE"], status: "ACTIF" }),
    )

    const stored = await prisma.person.findUniqueOrThrow({
      where: { id: lead.id },
      include: { contact: true, lead: true },
    })
    expect(jsonOf(result)).toEqual({ id: lead.id })
    expect(stored).toMatchObject({
      details: CONTACT_DETAILS_TEMPLATE,
      contact: { types: ["PARTENAIRE"] },
      lead: { origin: "OUTBOUND" },
    })
  })

  it("rejects fromLeadId mixed with person fields", async () => {
    const lead = await seedPerson({ name: "Jane Doe" })

    const result = await call(
      "crm_create",
      createContactArgs({ fromLeadId: lead.id, name: "Other", types: [], status: "ACTIF" }),
    )

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("fromLeadId")
    expect(await prisma.contact.count()).toBe(0)
    expect(await prisma.person.count()).toBe(1)
  })

  it("reports the failing field of a contact without fromLeadId", async () => {
    const result = await call(
      "crm_create",
      createContactArgs({ name: "Jane Doe", email: "not-an-email", types: [], status: "ACTIF" }),
    )

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("email")
    expect(await prisma.person.count()).toBe(0)
  })

  it("promotes a lead then writes a section of the contact Details", async () => {
    const created = await call(
      "crm_create",
      createLeadArgs({ name: "Jane Doe", origin: "OUTBOUND" }),
    )
    const { id } = idBodySchema.parse(jsonOf(created))
    await call(
      "crm_create",
      createContactArgs({ fromLeadId: id, types: ["CLIENT"], status: "ACTIF" }),
    )

    const result = await call("crm_update", {
      entity: "contact",
      id,
      detailsSection: { heading: "Relation", content: "Rencontrée au meetup" },
    })

    const stored = await prisma.person.findUniqueOrThrow({ where: { id } })
    expect(result.isError).toBeFalsy()
    expect(stored.details).toBe(
      CONTACT_DETAILS_TEMPLATE.replace(
        "# 🤝 Relation\n",
        "# 🤝 Relation\n\nRencontrée au meetup\n",
      ),
    )
  })

  it.each([
    ["an email in capitals with spaces", { email: "Jane.Doe@Example.com " }],
    ["a LinkedIn URL without scheme", { linkedinUrl: "linkedin.com/in/Jane_Doe_Example/" }],
  ])("rejects a duplicate after normalization (%s)", async (_label, identity) => {
    await seedPerson({
      name: "Jane Doe",
      email: "jane.doe@example.com",
      linkedinUrl: "https://www.linkedin.com/in/jane_doe_example",
    })

    const result = await call(
      "crm_create",
      createLeadArgs({ name: "Other", origin: "INBOUND", ...identity }),
    )

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("Jane Doe")
    expect(textOf(result)).toContain("lead")
    expect(textOf(result)).toContain("crm_search")
    expect(await prisma.person.count()).toBe(1)
  })

  it("rejects an opted-out identity with its opt-out day in Paris", async () => {
    await seedPerson({
      name: null,
      email: "john.roe@example.com",
      optedOutAt: new Date("2026-09-30T22:30:00Z"),
    })

    const result = await call(
      "crm_create",
      createLeadArgs({ name: "John Roe", origin: "INBOUND", email: "john.roe@example.com" }),
    )

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("2026-10-01")
    expect(await prisma.person.count()).toBe(1)
  })

  it("rejects an unknown companyId and points to crm_search", async () => {
    const result = await call(
      "crm_create",
      createLeadArgs({ name: "Jane Doe", origin: "INBOUND", companyId: "missing-id" }),
    )

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("crm_search")
    expect(textOf(result)).toContain("companyId")
    expect(await prisma.person.count()).toBe(0)
  })

  it("rejects promoting a lead that is already a contact", async () => {
    const jane = await seedPerson({ name: "Jane Doe" }, { lead: true, contact: true })

    const result = await call(
      "crm_create",
      createContactArgs({ fromLeadId: jane.id, types: [], status: "ACTIF" }),
    )

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("Jane Doe")
  })

  it("rejects a score in crm_create", async () => {
    const result = await call(
      "crm_create",
      createLeadArgs({ name: "Jane Doe", origin: "INBOUND", score: 8 }),
    )

    expect(result.isError).toBe(true)
    expect(await prisma.person.count()).toBe(0)
  })
})

describe("persons in crm_update", () => {
  it("updates the fields of a lead and normalizes its email", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })

    const result = await call("crm_update", {
      entity: "lead",
      id: jane.id,
      fields: { status: "DISCUSSION", email: " NEW@Example.com ", phone: "0102030405" },
    })

    const stored = await prisma.person.findUniqueOrThrow({
      where: { id: jane.id },
      include: { lead: true },
    })
    expect(jsonOf(result)).toEqual({ id: jane.id })
    expect(stored).toMatchObject({
      name: "Jane Doe",
      email: "new@example.com",
      phone: "0102030405",
      lead: { status: "DISCUSSION" },
    })
  })

  it("updates the role fields of a contact", async () => {
    const jane = await seedPerson({ name: "Jane Doe" }, { lead: false, contact: true })

    await call("crm_update", {
      entity: "contact",
      id: jane.id,
      fields: { types: ["MENTOR"], status: "A_RECONTACTER" },
    })

    const stored = await prisma.contact.findUniqueOrThrow({ where: { personId: jane.id } })
    expect(stored).toMatchObject({ types: ["MENTOR"], status: "A_RECONTACTER" })
  })

  it("rejects score in crm_update and keeps the score unchanged", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })

    const result = await call("crm_update", { entity: "lead", id: jane.id, fields: { score: 8 } })

    const stored = await prisma.lead.findUniqueOrThrow({ where: { personId: jane.id } })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("score")
    expect(stored.score).toBeNull()
  })

  it.each(["optedOutAt", "exchangesErasedAt"])("rejects %s in crm_update", async (field) => {
    const jane = await seedPerson({ name: "Jane Doe" })

    const result = await call("crm_update", {
      entity: "lead",
      id: jane.id,
      fields: { [field]: "2026-10-01T00:00:00Z" },
    })

    expect(result.isError).toBe(true)
  })

  it("rejects a locked record", async () => {
    const opposed = await seedOptedOutLead({ email: "john.roe@example.com" })

    const result = await call("crm_update", {
      entity: "lead",
      id: opposed.id,
      fields: { notes: "relance" },
    })

    const stored = await prisma.person.findUniqueOrThrow({ where: { id: opposed.id } })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("opted out")
    expect(stored.notes).toBeNull()
  })

  it("rejects an email held by another person", async () => {
    await seedPerson({ name: "Jane Doe", email: "jane.doe@example.com" })
    const john = await seedPerson({ name: "John Roe" })

    const result = await call("crm_update", {
      entity: "lead",
      id: john.id,
      fields: { email: "JANE.DOE@example.com" },
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("Jane Doe")
  })

  it("reports a missing section with the headings present", async () => {
    const jane = await seedPerson({ name: "Jane Doe", details: leadDetailsTemplate("OUTBOUND") })

    const result = await call("crm_update", {
      entity: "lead",
      id: jane.id,
      detailsSection: { heading: "Inconnue", content: "x" },
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("Sections present")
  })

  it.each([
    ["neither fields nor detailsSection", {}],
    ["an empty fields object", { fields: {} }],
  ])("rejects crm_update with %s", async (_label, patch) => {
    const jane = await seedPerson({ name: "Jane Doe" })

    const result = await call("crm_update", { entity: "lead", id: jane.id, ...patch })

    expect(result.isError).toBe(true)
  })
})

describe("person write side effects", () => {
  it("does not refresh the person lists when the write is refused", async () => {
    await seedPerson({ name: "Jane Doe", email: "jane.doe@example.com" })

    await call(
      "crm_create",
      createLeadArgs({ name: "Dup", origin: "INBOUND", email: "jane.doe@example.com" }),
    )

    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("refreshes the person lists after a successful write", async () => {
    await call("crm_create", createLeadArgs({ name: "John Roe", origin: "INBOUND" }))

    expect(revalidatePath).toHaveBeenCalledWith("/admin/leads", "layout")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/contacts", "layout")
  })

  it("logs a lead write with the person id and no identity", async () => {
    const result = await call(
      "crm_create",
      createLeadArgs({ name: "Jane Doe", origin: "INBOUND", email: "jane.doe@example.com" }),
    )

    const { id } = idBodySchema.parse(jsonOf(result))
    expect(childLog.info).toHaveBeenCalledWith({ event: "lead:created", personId: id })
  })

  it("logs a contact update with the person id", async () => {
    const jane = await seedPerson({ name: "Jane Doe" }, { lead: false, contact: true })

    await call("crm_update", { entity: "contact", id: jane.id, fields: { notes: "x" } })

    expect(childLog.info).toHaveBeenCalledWith({ event: "contact:updated", personId: jane.id })
  })

  it("logs an unknown lead write failure and answers with a generic error", async () => {
    const failure = new Error("database down")
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(failure)

    const result = await call("crm_create", createLeadArgs({ name: "Jane Doe", origin: "INBOUND" }))

    expect(result.isError).toBe(true)
    expect(textOf(result)).not.toContain("database down")
    expect(childLog.error).toHaveBeenCalledWith({ err: failure, event: "lead:create_failed" })
  })

  it("logs an unknown contact update failure with the person id", async () => {
    const jane = await seedPerson({ name: "Jane Doe" }, { lead: false, contact: true })
    const failure = new Error("database down")
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(failure)

    const result = await call("crm_update", {
      entity: "contact",
      id: jane.id,
      fields: { notes: "x" },
    })

    expect(result.isError).toBe(true)
    expect(childLog.error).toHaveBeenCalledWith({
      err: failure,
      event: "contact:update_failed",
      personId: jane.id,
    })
  })
})

const createOpportunityArgs = (data: Record<string, unknown>) => ({ entity: "opportunity", data })

const startMonthBodySchema = z.object({ startMonth: z.string() })

describe("opportunities in crm_create", () => {
  it("creates an opportunity with its details template and rejects a same client and intermediary", async () => {
    const esn = await seedEsn()
    const acme = await seedCompany({ slug: "acme", name: "Acme", types: ["CLIENT_FINAL"] })

    const created = await call(
      "crm_create",
      createOpportunityArgs({
        title: "Plateforme data",
        intermediaryId: esn.id,
        clientId: acme.id,
      }),
    )
    const same = await call(
      "crm_create",
      createOpportunityArgs({ title: "Doublon", intermediaryId: esn.id, clientId: esn.id }),
    )

    const stored = await prisma.opportunity.findFirstOrThrow()
    expect(jsonOf(created)).toEqual({ id: stored.id, title: "Plateforme data" })
    expect(stored).toMatchObject({ status: "PROPOSEE", details: OPPORTUNITY_DETAILS_TEMPLATE })
    expect(same.isError).toBe(true)
    expect(await prisma.opportunity.count()).toBe(1)
  })

  it("names the ESN type for a non-ESN intermediary and the failing field for a missing relation", async () => {
    const acme = await seedCompany({ slug: "acme", name: "Acme", types: ["CLIENT_FINAL"] })

    const notEsn = await call(
      "crm_create",
      createOpportunityArgs({ title: "Mission", intermediaryId: acme.id }),
    )
    const noReferrer = await call(
      "crm_create",
      createOpportunityArgs({ title: "Mission", referrerId: "missing-person" }),
    )
    const noClient = await call(
      "crm_create",
      createOpportunityArgs({ title: "Mission", clientId: "missing-company" }),
    )

    expect(notEsn.isError).toBe(true)
    expect(textOf(notEsn)).toContain("ESN_RECRUTEMENT")
    expect(textOf(noReferrer)).toContain("referrerId")
    expect(textOf(noClient)).toContain("clientId")
  })

  it.each(["2026-13", "11/2026"])("rejects the malformed startMonth %j", async (startMonth) => {
    const result = await call("crm_create", createOpportunityArgs({ title: "Mission", startMonth }))

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("startMonth")
    expect(await prisma.opportunity.count()).toBe(0)
  })

  it("stores a valid startMonth as the first day of the month", async () => {
    await call("crm_create", createOpportunityArgs({ title: "Mission", startMonth: "2026-11" }))

    const stored = await prisma.opportunity.findFirstOrThrow()
    expect(stored.startMonth).toEqual(new Date("2026-11-01T00:00:00.000Z"))
  })
})

describe("opportunities in crm_update", () => {
  it("updates fields and checks onSiteDays against the stored daysPerWeek", async () => {
    const opportunity = await prisma.opportunity.create({
      data: { title: "Mission", daysPerWeek: 3 },
    })

    const updated = await call("crm_update", {
      entity: "opportunity",
      id: opportunity.id,
      fields: { dailyRate: 650, startMonth: "2027-01", role: null },
    })
    const tooMany = await call("crm_update", {
      entity: "opportunity",
      id: opportunity.id,
      fields: { onSiteDays: 4 },
    })

    expect(jsonOf(updated)).toEqual({ id: opportunity.id, title: "Mission" })
    expect(tooMany.isError).toBe(true)
    expect(
      await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunity.id } }),
    ).toMatchObject({
      dailyRate: 650,
      startMonth: new Date("2027-01-01T00:00:00.000Z"),
      onSiteDays: null,
    })
  })

  it("rejects a clientId alone that equals the stored intermediary", async () => {
    const esn = await seedEsn()
    const acme = await seedCompany({ slug: "acme", name: "Acme" })
    const opportunity = await prisma.opportunity.create({
      data: { title: "Mission", intermediaryId: esn.id, clientId: acme.id },
    })

    const result = await call("crm_update", {
      entity: "opportunity",
      id: opportunity.id,
      fields: { clientId: esn.id },
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("end client cannot be the intermediary")
    expect(
      await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunity.id } }),
    ).toMatchObject({ clientId: acme.id })
  })

  it("logs an opportunity write with its id and refreshes the lists", async () => {
    const result = await call("crm_create", createOpportunityArgs({ title: "Mission" }))

    const { id } = idBodySchema.parse(jsonOf(result))
    expect(childLog.info).toHaveBeenCalledWith({ event: "opportunity:created", id })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/opportunites", "layout")
  })
})

describe("opportunities in crm_search and crm_query", () => {
  it("finds an opportunity by title or client name, hint client · status", async () => {
    const acme = await seedCompany({ slug: "acme", name: "Acme" })
    const opportunity = await prisma.opportunity.create({
      data: { title: "Plateforme data", clientId: acme.id, status: "EN_PROCESS" },
    })
    await prisma.opportunity.create({ data: { title: "Autre mission" } })

    const byTitle = await call("crm_search", { query: "plateforme", entities: ["opportunity"] })
    const byClient = await call("crm_search", { query: "acme", entities: ["opportunity"] })

    const expected = {
      results: [
        {
          entity: "opportunity",
          id: opportunity.id,
          label: "Plateforme data",
          hint: "Acme · EN_PROCESS",
        },
      ],
    }
    expect(jsonOf(byTitle)).toEqual(expected)
    expect(jsonOf(byClient)).toEqual(expected)
  })

  it("filters opportunities by status and client", async () => {
    const acme = await seedCompany({ slug: "acme", name: "Acme" })
    const globex = await seedCompany({ slug: "globex", name: "Globex" })
    await prisma.opportunity.createMany({
      data: [
        { title: "A", clientId: acme.id, status: "EN_PROCESS" },
        { title: "B", clientId: acme.id, status: "REFUSEE" },
        { title: "C", clientId: globex.id, status: "EN_PROCESS" },
      ],
    })

    const result = await call("crm_query", {
      entity: "opportunity",
      filters: { status: "EN_PROCESS", clientId: acme.id },
    })

    expect(jsonOf(result)).toMatchObject({
      total: 1,
      rows: [{ title: "A", status: "EN_PROCESS", client: { name: "Acme" } }],
    })
  })
})

describe("opportunities in crm_fetch", () => {
  it("renders startMonth as YYYY-MM in fetch and query, and writes back what it reads", async () => {
    const opportunity = await prisma.opportunity.create({
      data: { title: "Mission", startMonth: new Date("2026-11-01T00:00:00.000Z") },
    })

    const fetched = await call("crm_fetch", { entity: "opportunity", id: opportunity.id })
    const listed = await call("crm_query", { entity: "opportunity" })
    const { startMonth } = startMonthBodySchema.parse(jsonOf(fetched))
    await call("crm_update", {
      entity: "opportunity",
      id: opportunity.id,
      fields: { startMonth },
    })

    expect(startMonth).toBe("2026-11")
    expect(jsonOf(listed)).toMatchObject({ rows: [{ startMonth: "2026-11" }] })
    expect(
      (await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunity.id } })).startMonth,
    ).toEqual(new Date("2026-11-01T00:00:00.000Z"))
  })

  it("renders an absent startMonth as null", async () => {
    const opportunity = await prisma.opportunity.create({ data: { title: "Mission" } })

    const fetched = await call("crm_fetch", { entity: "opportunity", id: opportunity.id })

    expect(jsonOf(fetched)).toMatchObject({ startMonth: null })
  })

  it("renders an opted-out referrer as id only", async () => {
    const referrer = await seedPerson({
      name: null,
      email: "john.roe@example.com",
      optedOutAt: OPTED_OUT_AT,
    })
    const opportunity = await prisma.opportunity.create({
      data: { title: "Mission", referrerId: referrer.id },
    })

    const result = await call("crm_fetch", { entity: "opportunity", id: opportunity.id })

    expect(jsonOf(result)).toMatchObject({
      id: opportunity.id,
      referrer: { id: referrer.id, name: null, optedOut: true },
    })
    expect(textOf(result)).not.toContain("john.roe@example.com")
  })

  it("fetches an opportunity with its referrer, companies and interviews", async () => {
    const esn = await seedEsn()
    const acme = await seedCompany({ slug: "acme", name: "Acme" })
    const jane = await seedPerson({ name: "Jane Doe" })
    const opportunity = await prisma.opportunity.create({
      data: {
        title: "Plateforme data",
        referrerId: jane.id,
        intermediaryId: esn.id,
        clientId: acme.id,
        interviews: {
          create: {
            side: "CLIENT_FINAL",
            type: "TECHNIQUE",
            scheduledAt: new Date("2026-11-20T10:00:00Z"),
          },
        },
      },
    })

    const result = await call("crm_fetch", { entity: "opportunity", id: opportunity.id })

    expect(jsonOf(result)).toMatchObject({
      title: "Plateforme data",
      referrer: { id: jane.id, name: "Jane Doe" },
      intermediary: { name: "Esn Corp" },
      client: { name: "Acme" },
      interviews: [{ type: "TECHNIQUE" }],
    })
  })
})

const createInterviewArgs = (data: Record<string, unknown>) => ({ entity: "interview", data })

const INTERVIEW_AT = {
  first: new Date("2026-11-20T10:00:00Z"),
  second: new Date("2026-11-25T10:00:00Z"),
}

// Deux entretiens techniques d'une opportunité « Plateforme data », plus un autre d'une seconde opportunité.
async function seedTechnicalInterviews() {
  const opportunity = await prisma.opportunity.create({ data: { title: "Plateforme data" } })
  const other = await prisma.opportunity.create({ data: { title: "Autre mission" } })
  const interview = (opportunityId: string, scheduledAt: Date, status: "PLANIFIE" | "FAIT") =>
    prisma.interview.create({
      data: { opportunityId, side: "CLIENT_FINAL", type: "TECHNIQUE", scheduledAt, status },
    })
  const first = await interview(opportunity.id, INTERVIEW_AT.first, "PLANIFIE")
  const second = await interview(opportunity.id, INTERVIEW_AT.second, "FAIT")
  await interview(other.id, new Date("2026-11-22T10:00:00Z"), "PLANIFIE")
  return { opportunity, first, second }
}

describe("interviews in crm_create", () => {
  it("creates a side CLIENT_FINAL, type TECHNIQUE interview with the TECHNIQUE template", async () => {
    const opportunity = await prisma.opportunity.create({ data: { title: "Plateforme data" } })

    const result = await call(
      "crm_create",
      createInterviewArgs({
        opportunityId: opportunity.id,
        side: "CLIENT_FINAL",
        type: "TECHNIQUE",
        scheduledAt: "2026-11-20T11:00:00+01:00",
      }),
    )

    const stored = await prisma.interview.findFirstOrThrow()
    expect(jsonOf(result)).toEqual({ id: stored.id })
    expect(stored).toMatchObject({
      opportunityId: opportunity.id,
      side: "CLIENT_FINAL",
      type: "TECHNIQUE",
      status: "PLANIFIE",
      scheduledAt: INTERVIEW_AT.first,
      details: interviewDetailsTemplate("TECHNIQUE"),
    })
    expect(childLog.info).toHaveBeenCalledWith({ event: "interview:created", id: stored.id })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/entretiens", "layout")
  })

  it("rejects an ESN-side interview on an opportunity without intermediary and names the fix", async () => {
    const opportunity = await prisma.opportunity.create({ data: { title: "Plateforme data" } })

    const result = await call(
      "crm_create",
      createInterviewArgs({
        opportunityId: opportunity.id,
        side: "ESN",
        type: "RECRUTEUR_RH",
        scheduledAt: "2026-11-20T10:00:00Z",
      }),
    )

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("CLIENT_FINAL")
    expect(await prisma.interview.count()).toBe(0)
  })

  it("rejects newCorrespondents as an unknown field", async () => {
    const opportunity = await prisma.opportunity.create({ data: { title: "Plateforme data" } })

    const result = await call(
      "crm_create",
      createInterviewArgs({
        opportunityId: opportunity.id,
        side: "CLIENT_FINAL",
        type: "TECHNIQUE",
        scheduledAt: "2026-11-20T10:00:00Z",
        newCorrespondents: [{ name: "Jane Doe", contactType: "COMMERCIAL" }],
      }),
    )

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("newCorrespondents")
    expect(await prisma.interview.count()).toBe(0)
    expect(await prisma.person.count()).toBe(0)
  })

  it("rejects a date without its time zone offset and a score above 10", async () => {
    const opportunity = await prisma.opportunity.create({ data: { title: "Plateforme data" } })
    const base = { opportunityId: opportunity.id, side: "CLIENT_FINAL", type: "TECHNIQUE" }

    const noOffset = await call(
      "crm_create",
      createInterviewArgs({ ...base, scheduledAt: "2026-11-20T10:00" }),
    )
    const tooHigh = await call(
      "crm_create",
      createInterviewArgs({ ...base, scheduledAt: "2026-11-20T10:00:00Z", score: 11 }),
    )

    expect(noOffset.isError).toBe(true)
    expect(textOf(noOffset)).toContain("scheduledAt")
    expect(tooHigh.isError).toBe(true)
    expect(textOf(tooHigh)).toContain("score")
  })
})

describe("interviews in crm_update", () => {
  it("replaces correspondentIds, clears outcome unless FAIT and keeps the rest", async () => {
    const { first } = await seedTechnicalInterviews()
    const jane = await seedPerson({ name: "Jane Doe" }, { lead: false, contact: true })

    const done = await call("crm_update", {
      entity: "interview",
      id: first.id,
      fields: { status: "FAIT", outcome: "POSITIF", score: 8, correspondentIds: [jane.id] },
    })
    const cancelled = await call("crm_update", {
      entity: "interview",
      id: first.id,
      fields: { status: "ANNULE" },
    })

    expect(jsonOf(done)).toEqual({ id: first.id })
    expect(cancelled.isError).toBeFalsy()
    expect(
      await prisma.interview.findUniqueOrThrow({
        where: { id: first.id },
        include: { correspondents: true },
      }),
    ).toMatchObject({
      status: "ANNULE",
      outcome: null,
      score: 8,
      correspondents: [{ id: jane.id }],
    })
    expect(childLog.info).toHaveBeenCalledWith({ event: "interview:updated", id: first.id })
  })

  it("rejects newCorrespondents in fields and points to crm_search for an unknown id", async () => {
    const { first } = await seedTechnicalInterviews()

    const withNew = await call("crm_update", {
      entity: "interview",
      id: first.id,
      fields: { newCorrespondents: [] },
    })
    const unknown = await call("crm_update", {
      entity: "interview",
      id: "missing-interview",
      fields: { notes: "x" },
    })

    expect(withNew.isError).toBe(true)
    expect(textOf(withNew)).toContain("newCorrespondents")
    expect(unknown.isError).toBe(true)
    expect(textOf(unknown)).toContain("crm_search")
  })

  it("replaces one Details section of an interview", async () => {
    const opportunity = await prisma.opportunity.create({ data: { title: "Plateforme data" } })
    const interview = await prisma.interview.create({
      data: {
        opportunityId: opportunity.id,
        side: "CLIENT_FINAL",
        type: "TECHNIQUE",
        scheduledAt: INTERVIEW_AT.first,
        details: interviewDetailsTemplate("TECHNIQUE"),
      },
    })

    const result = await call("crm_update", {
      entity: "interview",
      id: interview.id,
      detailsSection: { heading: "Exercice technique", content: "Kata de revue de code" },
    })

    expect(result.isError).toBeFalsy()
    expect(
      (await prisma.interview.findUniqueOrThrow({ where: { id: interview.id } })).details,
    ).toContain("# 💻 Exercice technique\n\nKata de revue de code\n\n# 🗒️ Déroulé")
  })
})

describe("interviews in crm_search, crm_query and crm_fetch", () => {
  it("titles interviews Entretien N · Technique in search and fetch", async () => {
    const { opportunity, first, second } = await seedTechnicalInterviews()

    const search = await call("crm_search", {
      query: "plateforme",
      entities: ["opportunity", "interview"],
    })
    const fetched = await call("crm_fetch", { entity: "interview", id: second.id })

    const { results } = searchBodySchema.parse(jsonOf(search))
    expect(results).toHaveLength(3)
    expect(results).toEqual(
      expect.arrayContaining([
        { entity: "opportunity", id: opportunity.id, label: "Plateforme data", hint: "PROPOSEE" },
        {
          entity: "interview",
          id: first.id,
          label: "Entretien 1 · Technique",
          hint: "Plateforme data · 2026-11-20T11:00:00.000+01:00",
        },
        {
          entity: "interview",
          id: second.id,
          label: "Entretien 2 · Technique",
          hint: "Plateforme data · 2026-11-25T11:00:00.000+01:00",
        },
      ]),
    )
    expect(jsonOf(fetched)).toMatchObject({
      id: second.id,
      title: "Entretien 2 · Technique",
      opportunity: { id: opportunity.id, title: "Plateforme data" },
    })
  })

  it("lists the interviews of an opportunity with their titles and total", async () => {
    const { opportunity } = await seedTechnicalInterviews()

    const result = await call("crm_query", {
      entity: "interview",
      filters: { opportunityId: opportunity.id },
      sort: "createdAt",
    })

    expect(jsonOf(result)).toMatchObject({
      total: 2,
      rows: [
        { title: "Entretien 1 · Technique", type: "TECHNIQUE", status: "PLANIFIE" },
        { title: "Entretien 2 · Technique", type: "TECHNIQUE", status: "FAIT" },
      ],
    })
  })

  it("keeps the number of an interview when the query filters on it alone", async () => {
    const { second } = await seedTechnicalInterviews()

    const result = await call("crm_query", { entity: "interview", filters: { status: "FAIT" } })

    expect(jsonOf(result)).toMatchObject({
      total: 1,
      rows: [{ id: second.id, title: "Entretien 2 · Technique" }],
    })
  })

  it("filters interviews on a scheduledAt interval, bounds included", async () => {
    const { first, second } = await seedTechnicalInterviews()

    const result = await call("crm_query", {
      entity: "interview",
      filters: {
        opportunityId: first.opportunityId,
        scheduledAt: { from: "2026-11-25T11:00:00+01:00", to: "2026-11-25T10:00:00Z" },
      },
    })

    expect(jsonOf(result)).toMatchObject({ total: 1, rows: [{ id: second.id }] })
  })

  it("renders an opted-out correspondent as id only, keeps her on update and refuses her on create", async () => {
    const { opportunity, first } = await seedTechnicalInterviews()
    const correspondent = await seedPerson(
      { name: null, email: "john.roe@example.com", optedOutAt: OPTED_OUT_AT },
      { lead: false, contact: true },
    )
    await prisma.interview.update({
      where: { id: first.id },
      data: { correspondents: { connect: { id: correspondent.id } } },
    })

    const fetched = await call("crm_fetch", { entity: "interview", id: first.id })
    const kept = await call("crm_update", {
      entity: "interview",
      id: first.id,
      fields: { correspondentIds: [correspondent.id], notes: "Rappel" },
    })
    const created = await call(
      "crm_create",
      createInterviewArgs({
        opportunityId: opportunity.id,
        side: "CLIENT_FINAL",
        type: "TECHNIQUE",
        scheduledAt: "2026-12-01T10:00:00Z",
        correspondentIds: [correspondent.id],
      }),
    )

    expect(jsonOf(fetched)).toMatchObject({
      correspondents: [{ id: correspondent.id, name: null, optedOut: true }],
    })
    expect(textOf(fetched)).not.toContain("john.roe@example.com")
    expect(kept.isError).toBeFalsy()
    expect(created.isError).toBe(true)
    expect(textOf(created)).toContain("correspondentIds")
  })
})

const createActionArgs = (data: Record<string, unknown>) => ({
  entity: "prospecting-action",
  data,
})

const MONDAY_MIDNIGHT_IN_PARIS = new Date("2026-11-22T23:00:00Z")

const dayBodySchema = z.object({ occurredAt: z.string() })

const seedAction = (
  personId: string,
  data: Partial<Prisma.ProspectingActionUncheckedCreateInput>,
) =>
  prisma.prospectingAction.create({
    data: {
      title: "Relance proposition",
      personId,
      channel: "DM_LINKEDIN",
      occurredAt: MONDAY_MIDNIGHT_IN_PARIS,
      ...data,
    },
  })

describe("prospecting actions in crm_create", () => {
  it("creates a to-do action, refuses an opted-out lead with her date and a person without a lead role", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const opposed = await seedOptedOutLead({ email: "john.roe@example.com" })
    const contact = await seedPerson({ name: "Sami Bernard" }, { lead: false, contact: true })
    const data = { title: "Relance proposition", channel: "DM_LINKEDIN", occurredAt: "2026-11-23" }

    const created = await call("crm_create", createActionArgs({ ...data, personId: jane.id }))
    const refused = await call("crm_create", createActionArgs({ ...data, personId: opposed.id }))
    const withoutRole = await call(
      "crm_create",
      createActionArgs({ ...data, personId: contact.id }),
    )

    const stored = await prisma.prospectingAction.findFirstOrThrow()
    expect(jsonOf(created)).toEqual({ id: stored.id })
    expect(stored).toMatchObject({
      personId: jane.id,
      status: "A_FAIRE",
      occurredAt: MONDAY_MIDNIGHT_IN_PARIS,
      respondedAt: null,
    })
    expect(childLog.info).toHaveBeenCalledWith({
      event: "prospecting_action:created",
      id: stored.id,
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/actions-prospection", "layout")
    expect(refused.isError).toBe(true)
    expect(textOf(refused)).toContain("2026-10-01")
    expect(withoutRole.isError).toBe(true)
    expect(textOf(withoutRole)).toContain("crm_search")
    expect(await prisma.prospectingAction.count()).toBe(1)
  })

  it("rejects a date with a time and a title over its limit", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const base = { personId: jane.id, channel: "DM_LINKEDIN", title: "Relance" }

    const withTime = await call(
      "crm_create",
      createActionArgs({ ...base, occurredAt: "2026-11-23T10:00:00Z" }),
    )
    const tooLong = await call(
      "crm_create",
      createActionArgs({ ...base, occurredAt: "2026-11-23", title: "x".repeat(121) }),
    )

    expect(withTime.isError).toBe(true)
    expect(textOf(withTime)).toContain("occurredAt")
    expect(tooLong.isError).toBe(true)
    expect(textOf(tooLong)).toContain("title")
    expect(await prisma.prospectingAction.count()).toBe(0)
  })
})

describe("prospecting actions in crm_update", () => {
  it("sets the dates with the status rules on a status-only patch to REPONDU", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const action = await seedAction(jane.id, { reply: null })
    const before = new Date()

    const result = await call("crm_update", {
      entity: "prospecting-action",
      id: action.id,
      fields: { status: "REPONDU" },
    })

    const stored = await storedAction(action.id)
    expect(jsonOf(result)).toEqual({ id: action.id })
    expect(stored.status).toBe("REPONDU")
    expect(stored.respondedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(childLog.info).toHaveBeenCalledWith({
      event: "prospecting_action:updated",
      id: action.id,
    })
  })

  it("takes back the null respondedAt it reads from an action without reply", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const action = await seedAction(jane.id, { status: "FAIT", respondedAt: null })
    const { respondedAt } = z
      .object({ respondedAt: z.null() })
      .parse(jsonOf(await call("crm_fetch", { entity: "prospecting-action", id: action.id })))

    const result = await call("crm_update", {
      entity: "prospecting-action",
      id: action.id,
      fields: { respondedAt },
    })

    expect(result.isError).toBeFalsy()
    expect((await storedAction(action.id)).respondedAt).toBeNull()
  })

  it("keeps the reply when absent, clears it with null and writes a respondedAt day", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const action = await seedAction(jane.id, {
      status: "REPONDU",
      reply: "Merci",
      respondedAt: new Date("2026-11-24T09:00:00Z"),
    })

    await call("crm_update", {
      entity: "prospecting-action",
      id: action.id,
      fields: { message: "Relance envoyée" },
    })
    const kept = (await storedAction(action.id)).reply
    await call("crm_update", {
      entity: "prospecting-action",
      id: action.id,
      fields: { reply: null, respondedAt: "2026-11-25" },
    })

    expect(kept).toBe("Merci")
    expect(await storedAction(action.id)).toMatchObject({
      reply: null,
      respondedAt: new Date("2026-11-24T23:00:00Z"),
    })
  })

  it("refuses to rewrite the action of an opted-out lead and points to crm_search for an unknown id", async () => {
    const opposed = await seedOptedOutLead({ email: "john.roe@example.com" })
    const action = await seedAction(opposed.id, {})

    const refused = await call("crm_update", {
      entity: "prospecting-action",
      id: action.id,
      fields: { title: "Réécrit" },
    })
    const unknown = await call("crm_update", {
      entity: "prospecting-action",
      id: "missing-action",
      fields: { title: "x" },
    })

    expect(refused.isError).toBe(true)
    expect(textOf(refused)).toContain("2026-10-01")
    expect(unknown.isError).toBe(true)
    expect(textOf(unknown)).toContain("crm_search")
    expect((await storedAction(action.id)).title).toBe("Relance proposition")
  })
})

describe("prospecting actions in crm_search, crm_query and crm_fetch", () => {
  it("finds an action by title or lead name, hint lead · date · status", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const sami = await seedPerson({ name: "Sami Bernard" })
    const action = await seedAction(jane.id, { title: "Relance proposition", status: "FAIT" })
    await seedAction(sami.id, { title: "Candidature" })

    const byTitle = await call("crm_search", { query: "relance", entities: ["prospecting-action"] })
    const byLead = await call("crm_search", { query: "jane", entities: ["prospecting-action"] })

    const expected = {
      results: [
        {
          entity: "prospecting-action",
          id: action.id,
          label: "Relance proposition",
          hint: "Jane Doe · 2026-11-23 · FAIT",
        },
      ],
    }
    expect(jsonOf(byTitle)).toEqual(expected)
    expect(jsonOf(byLead)).toEqual(expected)
  })

  it("renders an opted-out lead as id only", async () => {
    const opposed = await seedOptedOutLead({ email: "john.roe@example.com" })
    const action = await seedAction(opposed.id, { title: "Message d'origine" })

    const fetched = await call("crm_fetch", { entity: "prospecting-action", id: action.id })
    const listed = await call("crm_query", { entity: "prospecting-action" })

    const lead = { id: opposed.id, name: null, optedOut: true }
    expect(jsonOf(fetched)).toMatchObject({ id: action.id, lead })
    expect(jsonOf(listed)).toMatchObject({ total: 1, rows: [{ id: action.id, lead }] })
    expect(textOf(fetched)).not.toContain("john.roe@example.com")
    expect(textOf(listed)).not.toContain("john.roe@example.com")
  })

  it("omits the message and the reply of an opted-out lead in fetch", async () => {
    const opposed = await seedOptedOutLead({ email: "john.roe@example.com" })
    const action = await seedAction(opposed.id, {
      status: "REPONDU",
      message: "Bonjour, écrivez-moi à john.roe@example.com",
      reply: "Appelez-moi au 06 00 00 00 00",
    })

    const fetched = await call("crm_fetch", { entity: "prospecting-action", id: action.id })

    expect(jsonOf(fetched)).not.toHaveProperty("message")
    expect(jsonOf(fetched)).not.toHaveProperty("reply")
    expect(textOf(fetched)).not.toContain("john.roe@example.com")
    expect(textOf(fetched)).not.toContain("06 00 00 00 00")
  })

  describe("title of an action of an opted-out lead", () => {
    const seedOpposedAction = async () => {
      const opposed = await seedOptedOutLead({ email: "john.roe@example.com" })
      return seedAction(opposed.id, { title: "Rappeler John Roe, john.roe@example.com" })
    }

    it("is not findable in crm_search", async () => {
      await seedOpposedAction()

      const result = await call("crm_search", {
        query: "john.roe",
        entities: ["prospecting-action"],
      })

      expect(jsonOf(result)).toEqual({ results: [] })
    })

    it("is omitted from crm_fetch", async () => {
      const action = await seedOpposedAction()

      const result = await call("crm_fetch", { entity: "prospecting-action", id: action.id })

      expect(jsonOf(result)).not.toHaveProperty("title")
      expect(textOf(result)).not.toContain("john.roe@example.com")
    })

    it("is omitted from crm_query", async () => {
      const action = await seedOpposedAction()

      const result = await call("crm_query", { entity: "prospecting-action" })

      expect(jsonOf(result)).toMatchObject({ total: 1, rows: [{ id: action.id }] })
      expect(textOf(result)).not.toContain("john.roe@example.com")
      expect(textOf(result)).not.toContain("Rappeler")
    })
  })

  it("keeps the message and the reply of a lead who did not opt out", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const action = await seedAction(jane.id, {
      status: "REPONDU",
      message: "Bonjour",
      reply: "Merci",
    })

    const fetched = await call("crm_fetch", { entity: "prospecting-action", id: action.id })

    expect(jsonOf(fetched)).toMatchObject({ message: "Bonjour", reply: "Merci" })
  })

  it("renders the day fields as Paris days in fetch and query, and the instants in Paris time", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const action = await seedAction(jane.id, {
      status: "REPONDU",
      respondedAt: new Date("2026-11-24T23:00:00Z"),
    })

    const fetched = await call("crm_fetch", { entity: "prospecting-action", id: action.id })
    const listed = await call("crm_query", { entity: "prospecting-action" })

    const days = { occurredAt: "2026-11-23", respondedAt: "2026-11-25" }
    expect(jsonOf(fetched)).toMatchObject({
      ...days,
      createdAt: ISO_INSTANT,
    })
    expect(jsonOf(listed)).toMatchObject({
      rows: [{ ...days, updatedAt: ISO_INSTANT }],
    })
  })

  it("writes back the day it reads without shifting the action", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const action = await seedAction(jane.id, {})
    const fetched = dayBodySchema.parse(
      jsonOf(await call("crm_fetch", { entity: "prospecting-action", id: action.id })),
    )

    const result = await call("crm_update", {
      entity: "prospecting-action",
      id: action.id,
      fields: { occurredAt: fetched.occurredAt },
    })

    const stored = await storedAction(action.id)
    expect(result.isError).toBeFalsy()
    expect(stored.occurredAt).toEqual(MONDAY_MIDNIGHT_IN_PARIS)
  })

  it("fetches an action with its lead", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const action = await seedAction(jane.id, { message: "Bonjour", status: "FAIT" })

    const result = await call("crm_fetch", { entity: "prospecting-action", id: action.id })

    expect(jsonOf(result)).toMatchObject({
      id: action.id,
      title: "Relance proposition",
      channel: "DM_LINKEDIN",
      status: "FAIT",
      message: "Bonjour",
      lead: { id: jane.id, name: "Jane Doe" },
    })
  })

  it("filters actions by status, channel and lead, and on an occurredAt interval including its last day", async () => {
    const jane = await seedPerson({ name: "Jane Doe" })
    const sami = await seedPerson({ name: "Sami Bernard" })
    const at = (iso: string) => new Date(iso)
    const early = await seedAction(jane.id, { title: "A", occurredAt: at("2026-11-19T10:00:00Z") })
    const lateSameDay = await seedAction(jane.id, {
      title: "B",
      status: "FAIT",
      channel: "EMAIL",
      occurredAt: at("2026-11-20T14:30:00Z"),
    })
    await seedAction(sami.id, { title: "C", occurredAt: at("2026-11-25T10:00:00Z") })

    const byFields = await call("crm_query", {
      entity: "prospecting-action",
      filters: { status: "FAIT", channel: "EMAIL", personId: jane.id },
    })
    const byInterval = await call("crm_query", {
      entity: "prospecting-action",
      filters: { occurredAt: { from: "2026-11-19", to: "2026-11-20" } },
      sort: "createdAt",
    })

    expect(jsonOf(byFields)).toMatchObject({ total: 1, rows: [{ id: lateSameDay.id }] })
    expect(jsonOf(byInterval)).toMatchObject({
      total: 2,
      rows: [{ id: early.id }, { id: lateSameDay.id }],
    })
  })
})

const createSignalArgs = (data: Record<string, unknown>) => ({ entity: "signal", data })

const SIGNAL_DAY = new Date("2026-09-14T00:00:00.000Z")

const signalDayBodySchema = z.object({ occurredOn: z.string() })

const seedSignal = (
  owner: { companyId: string } | { personId: string },
  data: Partial<Prisma.SignalUncheckedCreateInput> = {},
) =>
  prisma.signal.create({
    data: {
      type: "personId" in owner ? "POST" : "OFFRE_POSTE",
      occurredOn: SIGNAL_DAY,
      content: "Recrute deux développeurs IA",
      ...owner,
      ...data,
    },
  })

describe("signals in crm_create", () => {
  it("attaches a signal to a company or to a lead and invalidates both admin lists", async () => {
    const acme = await seedCompany()
    const jane = await seedPerson({ name: "Jane Doe" })
    const data = { occurredOn: "2026-09-14", content: "Recrute deux développeurs IA" }

    const onCompany = await call(
      "crm_create",
      createSignalArgs({ ...data, companyId: acme.id, type: "OFFRE_POSTE" }),
    )
    const onLead = await call(
      "crm_create",
      createSignalArgs({
        ...data,
        personId: jane.id,
        type: "POST",
        sourceUrl: "https://example.com/p",
      }),
    )

    const [byCompany, byLead] = await Promise.all([
      prisma.signal.findFirstOrThrow({ where: { companyId: acme.id } }),
      prisma.signal.findFirstOrThrow({ where: { personId: jane.id } }),
    ])
    expect(jsonOf(onCompany)).toEqual({ id: byCompany.id })
    expect(jsonOf(onLead)).toEqual({ id: byLead.id })
    expect(byCompany).toMatchObject({ occurredOn: SIGNAL_DAY, sourceUrl: null })
    expect(byLead.sourceUrl).toBe("https://example.com/p")
    expect(childLog.info).toHaveBeenCalledWith({ event: "signal:created", id: byCompany.id })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/entreprises", "layout")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/leads", "layout")
  })

  it("rejects both companyId and personId, or neither", async () => {
    const acme = await seedCompany()
    const jane = await seedPerson({ name: "Jane Doe" })
    const base = { occurredOn: "2026-09-14", content: "Signal", type: "OFFRE_POSTE" }

    const both = await call(
      "crm_create",
      createSignalArgs({ ...base, companyId: acme.id, personId: jane.id }),
    )
    const neither = await call("crm_create", createSignalArgs(base))

    expect(both.isError).toBe(true)
    expect(textOf(both)).toContain("exactly one of companyId or personId")
    expect(neither.isError).toBe(true)
    expect(textOf(neither)).toContain("exactly one of companyId or personId")
    expect(await prisma.signal.count()).toBe(0)
  })

  it("refuses a type that does not fit its target and names the types to use", async () => {
    const acme = await seedCompany()
    const jane = await seedPerson({ name: "Jane Doe" })
    const base = { occurredOn: "2026-09-14", content: "Signal" }

    const onCompany = await call(
      "crm_create",
      createSignalArgs({ ...base, companyId: acme.id, type: "POST" }),
    )
    const onLead = await call(
      "crm_create",
      createSignalArgs({ ...base, personId: jane.id, type: "LEVEE" }),
    )

    expect(onCompany.isError).toBe(true)
    expect(textOf(onCompany)).toContain("OFFRE_POSTE")
    expect(onLead.isError).toBe(true)
    expect(textOf(onLead)).toContain("INTERACTION")
    expect(await prisma.signal.count()).toBe(0)
  })

  it("refuses an inbound or opted-out lead", async () => {
    const inbound = await prisma.person.create({
      data: { name: "Sami Bernard", lead: { create: { origin: "INBOUND" } } },
    })
    const opposed = await seedOptedOutLead({ email: "john.roe@example.com" })
    const base = { occurredOn: "2026-09-14", content: "Signal", type: "POST" }

    const onInbound = await call("crm_create", createSignalArgs({ ...base, personId: inbound.id }))
    const onOpposed = await call("crm_create", createSignalArgs({ ...base, personId: opposed.id }))

    expect(onInbound.isError).toBe(true)
    expect(textOf(onInbound)).toContain("OUTBOUND")
    expect(onOpposed.isError).toBe(true)
    expect(await prisma.signal.count()).toBe(0)
  })

  it("points to crm_search for a company that does not exist", async () => {
    const result = await call(
      "crm_create",
      createSignalArgs({
        companyId: "missing-company",
        occurredOn: "2026-09-14",
        content: "Signal",
        type: "OFFRE_POSTE",
      }),
    )

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("crm_search")
  })

  it("rejects a content over 500 characters, a link over 2048 and a date with a time", async () => {
    const acme = await seedCompany()
    const base = { companyId: acme.id, type: "OFFRE_POSTE", occurredOn: "2026-09-14" }

    const tooLong = await call(
      "crm_create",
      createSignalArgs({ ...base, content: "a".repeat(501) }),
    )
    const badLink = await call(
      "crm_create",
      createSignalArgs({
        ...base,
        content: "Signal",
        sourceUrl: `https://example.com/${"a".repeat(2048)}`,
      }),
    )
    const withTime = await call(
      "crm_create",
      createSignalArgs({ ...base, content: "Signal", occurredOn: "2026-09-14T10:00:00Z" }),
    )

    expect(textOf(tooLong)).toContain("content")
    expect(textOf(badLink)).toContain("sourceUrl")
    expect(textOf(withTime)).toContain("occurredOn")
    expect(await prisma.signal.count()).toBe(0)
  })
})

describe("signals in crm_update", () => {
  it("changes the sent fields and clears the link with null", async () => {
    const acme = await seedCompany()
    const signal = await seedSignal({ companyId: acme.id }, { sourceUrl: "https://example.com/a" })

    const result = await call("crm_update", {
      entity: "signal",
      id: signal.id,
      fields: { content: "Recrute trois développeurs", sourceUrl: null, occurredOn: "2026-09-20" },
    })

    expect(jsonOf(result)).toEqual({ id: signal.id })
    expect(await storedSignal(signal.id)).toMatchObject({
      type: "OFFRE_POSTE",
      content: "Recrute trois développeurs",
      sourceUrl: null,
      occurredOn: new Date("2026-09-20T00:00:00.000Z"),
    })
    expect(childLog.info).toHaveBeenCalledWith({ event: "signal:updated", id: signal.id })
  })

  it("refuses to move a signal to another owner and a type that does not fit its owner", async () => {
    const acme = await seedCompany()
    const jane = await seedPerson({ name: "Jane Doe" })
    const signal = await seedSignal({ companyId: acme.id })

    const moved = await call("crm_update", {
      entity: "signal",
      id: signal.id,
      fields: { personId: jane.id },
    })
    const retyped = await call("crm_update", {
      entity: "signal",
      id: signal.id,
      fields: { type: "POST" },
    })

    expect(moved.isError).toBe(true)
    expect(retyped.isError).toBe(true)
    expect(textOf(retyped)).toContain("OFFRE_POSTE")
    expect(await storedSignal(signal.id)).toMatchObject({
      companyId: acme.id,
      personId: null,
      type: "OFFRE_POSTE",
    })
  })
})

describe("signals in crm_search, crm_query and crm_fetch", () => {
  it("finds a signal by its content, label the type label, hint target · date", async () => {
    const acme = await seedCompany({ name: "Acme" })
    const jane = await seedPerson({ name: "Jane Doe" })
    const onCompany = await seedSignal({ companyId: acme.id })
    const onLead = await seedSignal(
      { personId: jane.id },
      { content: "Post sur l'IA générative", occurredOn: new Date("2026-09-20T00:00:00.000Z") },
    )

    const byContent = await call("crm_search", { query: "développeurs", entities: ["signal"] })
    const byLeadContent = await call("crm_search", { query: "generative", entities: ["signal"] })

    expect(jsonOf(byContent)).toEqual({
      results: [
        { entity: "signal", id: onCompany.id, label: "Offre de poste", hint: "Acme · 2026-09-14" },
      ],
    })
    expect(jsonOf(byLeadContent)).toEqual({
      results: [
        { entity: "signal", id: onLead.id, label: "Post engageant", hint: "Jane Doe · 2026-09-20" },
      ],
    })
  })

  it("fetches a signal with its company or its lead, the day as YYYY-MM-DD", async () => {
    const acme = await seedCompany({ name: "Acme" })
    const jane = await seedPerson({ name: "Jane Doe" })
    const onCompany = await seedSignal({ companyId: acme.id })
    const onLead = await seedSignal({ personId: jane.id })

    const fetchedCompany = await call("crm_fetch", { entity: "signal", id: onCompany.id })
    const fetchedLead = await call("crm_fetch", { entity: "signal", id: onLead.id })

    expect(jsonOf(fetchedCompany)).toMatchObject({
      id: onCompany.id,
      type: "OFFRE_POSTE",
      occurredOn: "2026-09-14",
      company: { id: acme.id, name: "Acme" },
      lead: null,
    })
    expect(jsonOf(fetchedLead)).toMatchObject({
      occurredOn: "2026-09-14",
      company: null,
      lead: { id: jane.id, name: "Jane Doe" },
    })
  })

  it("writes back the day it reads without shifting the signal", async () => {
    const acme = await seedCompany()
    const signal = await seedSignal({ companyId: acme.id })
    const fetched = signalDayBodySchema.parse(
      jsonOf(await call("crm_fetch", { entity: "signal", id: signal.id })),
    )

    const result = await call("crm_update", {
      entity: "signal",
      id: signal.id,
      fields: { occurredOn: fetched.occurredOn },
    })

    expect(result.isError).toBeFalsy()
    expect((await storedSignal(signal.id)).occurredOn).toEqual(SIGNAL_DAY)
  })

  it("lists signals with their day, filters by owner, type and an interval including its bounds", async () => {
    const acme = await seedCompany({ name: "Acme" })
    const jane = await seedPerson({ name: "Jane Doe" })
    const day = (value: string) => new Date(`${value}T00:00:00.000Z`)
    const first = await seedSignal({ companyId: acme.id }, { occurredOn: day("2026-09-10") })
    const second = await seedSignal(
      { companyId: acme.id },
      { type: "LEVEE", occurredOn: day("2026-09-12") },
    )
    await seedSignal({ personId: jane.id }, { occurredOn: day("2026-09-20") })

    const byCompany = await call("crm_query", {
      entity: "signal",
      filters: { companyId: acme.id, type: "LEVEE" },
    })
    const byLead = await call("crm_query", { entity: "signal", filters: { personId: jane.id } })
    const byInterval = await call("crm_query", {
      entity: "signal",
      filters: { occurredOn: { from: "2026-09-10", to: "2026-09-12" } },
    })

    expect(jsonOf(byCompany)).toMatchObject({
      total: 1,
      rows: [{ id: second.id, occurredOn: "2026-09-12", company: { id: acme.id, name: "Acme" } }],
    })
    expect(jsonOf(byLead)).toMatchObject({
      total: 1,
      rows: [{ company: null, lead: { id: jane.id, name: "Jane Doe" } }],
    })
    expect(jsonOf(byInterval)).toMatchObject({
      total: 2,
      rows: [{ id: first.id }, { id: second.id }],
    })
  })
})

const createReviewArgs = (data: Record<string, unknown>) => ({ entity: "weekly-review", data })

const REVIEW_DAY = new Date(`${CLOSED_WEEK_FRIDAY}T00:00:00.000Z`)

const reviewDayBodySchema = z.object({ closingFriday: z.string() })

const seedReview = (data: Partial<Prisma.WeeklyReviewCreateInput> = {}) =>
  prisma.weeklyReview.create({
    data: { closingFriday: REVIEW_DAY, connectionsSent: 5, activeLeads: 7, ...data },
  })

describe("weekly reviews in crm_create", () => {
  it("computes the counters the admin prefill would compute and refuses a second review of the week", async () => {
    await seedClosedWeek()
    const prefill = await computeWeekCounters(CLOSED_WEEK_FRIDAY)

    const created = await call(
      "crm_create",
      createReviewArgs({ closingFriday: CLOSED_WEEK_FRIDAY }),
    )
    const again = await call("crm_create", createReviewArgs({ closingFriday: CLOSED_WEEK_FRIDAY }))

    const stored = await prisma.weeklyReview.findFirstOrThrow()
    expect(jsonOf(created)).toEqual({ id: stored.id })
    expect(prefill).toEqual({ ok: true, counts: CLOSED_WEEK_COUNTS })
    expect(stored).toMatchObject({ closingFriday: REVIEW_DAY, ...CLOSED_WEEK_COUNTS })
    expect(childLog.info).toHaveBeenCalledWith({ event: "weekly_review:created", id: stored.id })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/revues-hebdo", "layout")
    expect(again.isError).toBe(true)
    expect(textOf(again)).toContain("closingFriday")
    expect(await prisma.weeklyReview.count()).toBe(1)
  })

  it("keeps the counters it receives and computes the missing ones", async () => {
    await seedClosedWeek()

    await call(
      "crm_create",
      createReviewArgs({ closingFriday: CLOSED_WEEK_FRIDAY, connectionsSent: 9, activeLeads: 0 }),
    )

    expect(await prisma.weeklyReview.findFirstOrThrow()).toMatchObject({
      ...CLOSED_WEEK_COUNTS,
      connectionsSent: 9,
      activeLeads: 0,
    })
  })

  it("accepts the qualitative fields and their enums", async () => {
    const result = await call(
      "crm_create",
      createReviewArgs({
        closingFriday: CLOSED_WEEK_FRIDAY,
        status: "MOYENNE",
        motivation: "BASSE",
        wins: "Deux réponses",
        blockers: "Peu de leads",
        nextWeekPlan: "Relancer Acme",
        notes: "RAS",
      }),
    )

    expect(result.isError).toBeFalsy()
    expect(await prisma.weeklyReview.findFirstOrThrow()).toMatchObject({
      status: "MOYENNE",
      motivation: "BASSE",
      wins: "Deux réponses",
      blockers: "Peu de leads",
      nextWeekPlan: "Relancer Acme",
      notes: "RAS",
    })
  })

  it("rejects a closingFriday that is not a Friday or carries a time", async () => {
    const monday = await call("crm_create", createReviewArgs({ closingFriday: "2026-10-26" }))
    const withTime = await call(
      "crm_create",
      createReviewArgs({ closingFriday: "2026-10-30T10:00:00Z" }),
    )

    expect(monday.isError).toBe(true)
    expect(textOf(monday)).toContain("Friday")
    expect(withTime.isError).toBe(true)
    expect(textOf(withTime)).toContain("closingFriday")
    expect(await prisma.weeklyReview.count()).toBe(0)
  })

  it("rejects a counter out of 0 to 999, an unknown status and notes over 200 characters", async () => {
    const base = { closingFriday: CLOSED_WEEK_FRIDAY }

    const negative = await call("crm_create", createReviewArgs({ ...base, messagesSent: -1 }))
    const tooHigh = await call("crm_create", createReviewArgs({ ...base, messagesSent: 1000 }))
    const badStatus = await call("crm_create", createReviewArgs({ ...base, status: "EXCELLENTE" }))
    const longNotes = await call(
      "crm_create",
      createReviewArgs({ ...base, notes: "a".repeat(201) }),
    )

    expect(textOf(negative)).toContain("messagesSent")
    expect(textOf(tooHigh)).toContain("messagesSent")
    expect(textOf(badStatus)).toContain("status")
    expect(textOf(longNotes)).toContain("notes")
    expect(await prisma.weeklyReview.count()).toBe(0)
  })
})

describe("weekly reviews in crm_update", () => {
  it("changes the sent fields, leaves the counters unchanged and clears a field with null", async () => {
    await seedClosedWeek()
    const review = await seedReview({ wins: "Ancien", notes: "Note" })

    const result = await call("crm_update", {
      entity: "weekly-review",
      id: review.id,
      fields: { wins: null, status: "BONNE" },
    })

    expect(jsonOf(result)).toEqual({ id: review.id })
    expect(await storedReview(review.id)).toMatchObject({
      connectionsSent: 5,
      activeLeads: 7,
      wins: null,
      notes: "Note",
      status: "BONNE",
    })
    expect(childLog.info).toHaveBeenCalledWith({ event: "weekly_review:updated", id: review.id })
  })

  it("refuses to move a review onto a Friday already reviewed", async () => {
    await seedReview()
    const other = await seedReview({ closingFriday: new Date("2026-10-23T00:00:00.000Z") })

    const result = await call("crm_update", {
      entity: "weekly-review",
      id: other.id,
      fields: { closingFriday: CLOSED_WEEK_FRIDAY },
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("closingFriday")
    expect((await storedReview(other.id)).closingFriday).toEqual(
      new Date("2026-10-23T00:00:00.000Z"),
    )
  })
})

describe("weekly reviews in crm_search, crm_query and crm_fetch", () => {
  it("finds a review by its week label or its date, label the week, hint the Friday", async () => {
    const review = await seedReview()

    const byWeek = await call("crm_search", { query: "S44", entities: ["weekly-review"] })
    const byDate = await call("crm_search", { query: "2026-10-30", entities: ["weekly-review"] })

    const hit = { entity: "weekly-review", id: review.id, label: "S44 · 2026", hint: "2026-10-30" }
    expect(jsonOf(byWeek)).toEqual({ results: [hit] })
    expect(jsonOf(byDate)).toEqual({ results: [hit] })
  })

  it("fetches a review with its Friday as YYYY-MM-DD and writes the day back without shifting it", async () => {
    const review = await seedReview({ wins: "Deux réponses" })

    const fetched = await call("crm_fetch", { entity: "weekly-review", id: review.id })
    const day = reviewDayBodySchema.parse(jsonOf(fetched)).closingFriday
    const result = await call("crm_update", {
      entity: "weekly-review",
      id: review.id,
      fields: { closingFriday: day },
    })

    expect(jsonOf(fetched)).toMatchObject({
      id: review.id,
      closingFriday: "2026-10-30",
      connectionsSent: 5,
      activeLeads: 7,
      wins: "Deux réponses",
    })
    expect(result.isError).toBeFalsy()
    expect((await storedReview(review.id)).closingFriday).toEqual(REVIEW_DAY)
  })

  it("lists the latest week first, filters by an interval including its bounds", async () => {
    const day = (value: string) => new Date(`${value}T00:00:00.000Z`)
    const first = await seedReview({ closingFriday: day("2026-10-16") })
    const second = await seedReview({ closingFriday: day("2026-10-23") })
    const third = await seedReview({ closingFriday: day("2026-10-30") })

    const byDefault = await call("crm_query", { entity: "weekly-review" })
    const ascending = await call("crm_query", { entity: "weekly-review", order: "asc" })
    const byInterval = await call("crm_query", {
      entity: "weekly-review",
      filters: { closingFriday: { from: "2026-10-16", to: "2026-10-23" } },
    })

    expect(jsonOf(byDefault)).toMatchObject({
      total: 3,
      rows: [
        { id: third.id, closingFriday: "2026-10-30" },
        { id: second.id, closingFriday: "2026-10-23" },
        { id: first.id, closingFriday: "2026-10-16" },
      ],
    })
    expect(jsonOf(ascending)).toMatchObject({
      rows: [{ id: first.id }, { id: second.id }, { id: third.id }],
    })
    expect(jsonOf(byInterval)).toMatchObject({
      total: 2,
      rows: [{ id: second.id }, { id: first.id }],
    })
  })
})

// Chaque filtre de dates du registre s'ajoute ici : un intervalle inversé doit être refusé partout.
const RANGE_FILTERS = [
  {
    name: "interview.scheduledAt",
    entity: "interview",
    field: "scheduledAt",
    earlier: "2026-11-20T10:00:00+01:00",
    later: "2026-11-21T10:00:00+01:00",
  },
  {
    name: "prospecting-action.occurredAt",
    entity: "prospecting-action",
    field: "occurredAt",
    earlier: "2026-11-20",
    later: "2026-11-21",
  },
  {
    name: "signal.occurredOn",
    entity: "signal",
    field: "occurredOn",
    earlier: "2026-11-20",
    later: "2026-11-21",
  },
  {
    name: "weekly-review.closingFriday",
    entity: "weekly-review",
    field: "closingFriday",
    earlier: "2026-11-20",
    later: "2026-11-27",
  },
] as const

describe("date range filters in crm_query", () => {
  it.each(RANGE_FILTERS)(
    "rejects an inverted $name range in crm_query",
    async ({ entity, field, earlier, later }) => {
      const result = await call("crm_query", {
        entity,
        filters: { [field]: { from: later, to: earlier } },
      })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain("from must not be after to")
    },
  )
})

// Des dates qui encadrent minuit à Paris (été et hiver) : un décalage d'un jour s'y voit.
async function seedDatedRecords() {
  const esn = await seedEsn()
  const acme = await seedCompanyWithLegalEntity({
    publisher: {
      create: {
        apeCode: "6201Z",
        registrationType: "RCS",
        publicEmail: "contact@example.com",
        vatLiableSince: new Date("2026-01-15T00:00:00Z"),
      },
    },
  })
  const jane = await seedPerson(
    { name: "Jane Doe", metAt: new Date("2026-10-05T00:00:00Z"), companyId: acme.id },
    { lead: true, contact: true },
  )
  const optedOut = await seedOptedOutLead()
  const opportunity = await prisma.opportunity.create({
    data: {
      title: "Mission",
      startMonth: new Date("2026-11-01T00:00:00Z"),
      clientId: acme.id,
      intermediaryId: esn.id,
      referrerId: jane.id,
    },
  })
  const interview = await prisma.interview.create({
    data: {
      opportunityId: opportunity.id,
      side: "CLIENT_FINAL",
      type: "TECHNIQUE",
      scheduledAt: new Date("2026-11-20T10:00:00Z"),
      correspondents: { connect: { id: jane.id } },
    },
  })
  const action = await seedAction(jane.id, {
    status: "REPONDU",
    occurredAt: new Date("2026-07-13T22:00:00Z"),
    respondedAt: new Date("2026-11-22T22:59:59Z"),
  })
  const acmeSignal = await seedSignal(
    { companyId: acme.id },
    { occurredOn: new Date("2026-10-01T00:00:00Z") },
  )
  const janeSignal = await seedSignal(
    { personId: jane.id },
    { occurredOn: new Date("2026-10-02T00:00:00Z"), content: "Post sur l'IA générative" },
  )
  const review = await seedReview()
  return {
    esn: esn.id,
    acme: acme.id,
    jane: jane.id,
    optedOut: optedOut.id,
    opportunity: opportunity.id,
    interview: interview.id,
    action: action.id,
    acmeSignal: acmeSignal.id,
    janeSignal: janeSignal.id,
    review: review.id,
  }
}

type DatedIds = Awaited<ReturnType<typeof seedDatedRecords>>
type Path = readonly (string | number)[]

function valueAt(body: unknown, path: Path): unknown {
  return path.reduce<unknown>((node, key) => {
    const next: unknown = typeof node === "object" && node !== null ? Reflect.get(node, key) : null
    return next
  }, body)
}

const ISO_INSTANT: unknown = expect.stringMatching(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+0[12]:00$/,
)

interface DateCase {
  label: string
  request: (ids: DatedIds) => { name: string; args: Record<string, unknown> }
  path: Path
  expected: unknown
}

const inFetch =
  (entity: string, id: (ids: DatedIds) => string) =>
  (path: Path, expected: unknown): DateCase => ({
    label: `crm_fetch ${entity} ${path.join(".")}`,
    request: (ids) => ({ name: "crm_fetch", args: { entity, id: id(ids) } }),
    path,
    expected,
  })

const inQuery =
  (entity: string, filters?: (ids: DatedIds) => Record<string, unknown>) =>
  (field: string, expected: unknown): DateCase => ({
    label: `crm_query ${entity} rows.${field}`,
    request: (ids) => ({
      name: "crm_query",
      args: { entity, filters: filters?.(ids) },
    }),
    path: ["rows", 0, field],
    expected,
  })

const inSearch =
  (entity: string, query: string) =>
  (expected: string): DateCase => ({
    label: `crm_search ${entity} hint`,
    request: () => ({ name: "crm_search", args: { query, entities: [entity] } }),
    path: ["results", 0, "hint"],
    expected,
  })

const companyFetch = inFetch("company", ({ acme }) => acme)
const esnFetch = inFetch("company", ({ esn }) => esn)
const leadFetch = inFetch("lead", ({ jane }) => jane)
const optedOutFetch = inFetch("lead", ({ optedOut }) => optedOut)
const contactFetch = inFetch("contact", ({ jane }) => jane)
const opportunityFetch = inFetch("opportunity", ({ opportunity }) => opportunity)
const interviewFetch = inFetch("interview", ({ interview }) => interview)
const actionFetch = inFetch("prospecting-action", ({ action }) => action)
const companySignalFetch = inFetch("signal", ({ acmeSignal }) => acmeSignal)
const leadSignalFetch = inFetch("signal", ({ janeSignal }) => janeSignal)
const reviewFetch = inFetch("weekly-review", ({ review }) => review)

const DATE_CASES: readonly DateCase[] = [
  companyFetch(["signals", 0, "occurredOn"], "2026-10-01"),
  companyFetch(["opportunitiesAsClient", 0, "startMonth"], "2026-11"),
  esnFetch(["opportunitiesAsIntermediary", 0, "startMonth"], "2026-11"),
  companyFetch(["legalEntity", "publisher", "vatLiableSince"], "2026-01-15"),
  companyFetch(["opportunitiesAsClient", 0, "createdAt"], ISO_INSTANT),
  inQuery("company", () => ({ types: ["ESN_RECRUTEMENT"] }))("updatedAt", ISO_INSTANT),
  leadFetch(["metAt"], "2026-10-05"),
  leadFetch(["signals", 0, "occurredOn"], "2026-10-02"),
  leadFetch(["opportunities", 0, "startMonth"], "2026-11"),
  leadFetch(["opportunities", 0, "createdAt"], ISO_INSTANT),
  leadFetch(["interviews", 0, "scheduledAt"], "2026-11-20T11:00:00.000+01:00"),
  leadFetch(["interviews", 0, "createdAt"], ISO_INSTANT),
  leadFetch(["lastReplyAt"], "2026-11-22"),
  optedOutFetch(["optedOutAt"], "2026-10-01T02:00:00.000+02:00"),
  contactFetch(["metAt"], "2026-10-05"),
  opportunityFetch(["startMonth"], "2026-11"),
  opportunityFetch(["interviews", 0, "scheduledAt"], "2026-11-20T11:00:00.000+01:00"),
  opportunityFetch(["interviews", 0, "createdAt"], ISO_INSTANT),
  inQuery("opportunity")("startMonth", "2026-11"),
  interviewFetch(["scheduledAt"], "2026-11-20T11:00:00.000+01:00"),
  inQuery("interview")("scheduledAt", "2026-11-20T11:00:00.000+01:00"),
  inSearch("interview", "mission")("Mission · 2026-11-20T11:00:00.000+01:00"),
  actionFetch(["occurredAt"], "2026-07-14"),
  actionFetch(["respondedAt"], "2026-11-22"),
  inQuery("prospecting-action")("occurredAt", "2026-07-14"),
  inQuery("prospecting-action")("respondedAt", "2026-11-22"),
  inSearch("prospecting-action", "relance")("Jane Doe · 2026-07-14 · REPONDU"),
  companySignalFetch(["occurredOn"], "2026-10-01"),
  leadSignalFetch(["occurredOn"], "2026-10-02"),
  inQuery("signal", ({ acme }) => ({ companyId: acme }))("occurredOn", "2026-10-01"),
  inQuery("signal", ({ jane }) => ({ personId: jane }))("occurredOn", "2026-10-02"),
  inSearch("signal", "développeurs")("Acme · 2026-10-01"),
  reviewFetch(["closingFriday"], CLOSED_WEEK_FRIDAY),
  inQuery("weekly-review")("closingFriday", CLOSED_WEEK_FRIDAY),
  inSearch("weekly-review", CLOSED_WEEK_FRIDAY)(CLOSED_WEEK_FRIDAY),
]

describe("dates of every entity in crm_fetch, crm_query and crm_search", () => {
  it.each(DATE_CASES)("renders $label", async ({ request, path, expected }) => {
    const { name, args } = request(await seedDatedRecords())

    const result = await call(name, args)

    expect(valueAt(jsonOf(result), path)).toEqual(expected)
  })
})

// Une fiche liée ajoutée sans conversion ferait sortir ses jours en instants : chaque clé de jour est contrôlée où qu'elle soit.
const DAY_KEYS = new Set([
  "metAt",
  "occurredOn",
  "occurredAt",
  "respondedAt",
  "lastReplyAt",
  "vatLiableSince",
  "closingFriday",
])
const ISO_DAY: unknown = expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
const ISO_MONTH: unknown = expect.stringMatching(/^\d{4}-\d{2}$/)

function dayFieldsIn(body: unknown): [string, unknown][] {
  if (Array.isArray(body)) return body.flatMap(dayFieldsIn)
  if (typeof body !== "object" || body === null) return []
  return Object.entries(body).flatMap(([key, value]): [string, unknown][] => [
    ...(DAY_KEYS.has(key) || key === "startMonth" ? [[key, value] as [string, unknown]] : []),
    ...dayFieldsIn(value),
  ])
}

describe("day fields nested anywhere in crm_fetch and crm_query", () => {
  it("renders every day as YYYY-MM-DD and every month as YYYY-MM", async () => {
    const ids = await seedDatedRecords()
    const fetches: [string, string][] = [
      ["company", ids.acme],
      ["company", ids.esn],
      ["lead", ids.jane],
      ["contact", ids.jane],
      ["opportunity", ids.opportunity],
      ["interview", ids.interview],
      ["prospecting-action", ids.action],
      ["signal", ids.acmeSignal],
      ["signal", ids.janeSignal],
      ["weekly-review", ids.review],
    ]

    const bodies = [
      ...(await Promise.all(
        fetches.map(async ([entity, id]) => jsonOf(await call("crm_fetch", { entity, id }))),
      )),
      ...(await Promise.all(
        CRM_ENTITY_NAMES.map(async (entity) => jsonOf(await call("crm_query", { entity }))),
      )),
    ]

    const fields = bodies.flatMap(dayFieldsIn).filter(([, value]) => value !== null)
    expect(fields.length).toBeGreaterThan(10)
    expect(fields).toEqual(fields.map(([key]) => [key, key === "startMonth" ? ISO_MONTH : ISO_DAY]))
  })
})

interface RoundTrip {
  label: string
  read: (ids: DatedIds) => Record<string, unknown>
  path: Path
  write: (ids: DatedIds, value: unknown) => Record<string, unknown>
  stored: (ids: DatedIds) => Promise<Date | null>
  expected: Date
}

const writeSignalDay =
  (id: (ids: DatedIds) => string) =>
  (ids: DatedIds, value: unknown): Record<string, unknown> => ({
    entity: "signal",
    id: id(ids),
    fields: { occurredOn: value },
  })

const writeStartMonth = ({ opportunity }: DatedIds, value: unknown): Record<string, unknown> => ({
  entity: "opportunity",
  id: opportunity,
  fields: { startMonth: value },
})

const storedStartMonth = async ({ opportunity }: DatedIds) =>
  (await prisma.opportunity.findUniqueOrThrow({ where: { id: opportunity } })).startMonth

const NOVEMBER = new Date("2026-11-01T00:00:00Z")

const ROUND_TRIPS: readonly RoundTrip[] = [
  {
    label: "a signal in its company",
    read: ({ acme }) => ({ entity: "company", id: acme }),
    path: ["signals", 0, "occurredOn"],
    write: writeSignalDay(({ acmeSignal }) => acmeSignal),
    stored: async ({ acmeSignal }) => (await storedSignal(acmeSignal)).occurredOn,
    expected: new Date("2026-10-01T00:00:00Z"),
  },
  {
    label: "a signal in its lead",
    read: ({ jane }) => ({ entity: "lead", id: jane }),
    path: ["signals", 0, "occurredOn"],
    write: writeSignalDay(({ janeSignal }) => janeSignal),
    stored: async ({ janeSignal }) => (await storedSignal(janeSignal)).occurredOn,
    expected: new Date("2026-10-02T00:00:00Z"),
  },
  {
    label: "an opportunity in its client company",
    read: ({ acme }) => ({ entity: "company", id: acme }),
    path: ["opportunitiesAsClient", 0, "startMonth"],
    write: writeStartMonth,
    stored: storedStartMonth,
    expected: NOVEMBER,
  },
  {
    label: "an opportunity in its intermediary company",
    read: ({ esn }) => ({ entity: "company", id: esn }),
    path: ["opportunitiesAsIntermediary", 0, "startMonth"],
    write: writeStartMonth,
    stored: storedStartMonth,
    expected: NOVEMBER,
  },
  {
    label: "an opportunity in its referrer lead",
    read: ({ jane }) => ({ entity: "lead", id: jane }),
    path: ["opportunities", 0, "startMonth"],
    write: writeStartMonth,
    stored: storedStartMonth,
    expected: NOVEMBER,
  },
  {
    label: "an interview in its correspondent lead",
    read: ({ jane }) => ({ entity: "lead", id: jane }),
    path: ["interviews", 0, "scheduledAt"],
    write: ({ interview }, value) => ({
      entity: "interview",
      id: interview,
      fields: { scheduledAt: value },
    }),
    stored: async ({ interview }) =>
      (await prisma.interview.findUniqueOrThrow({ where: { id: interview } })).scheduledAt,
    expected: new Date("2026-11-20T10:00:00Z"),
  },
]

describe("dates read in linked records in crm_update", () => {
  it.each(ROUND_TRIPS)(
    "accepts the date of $label as read, without shifting it",
    async ({ read, path, write, stored, expected }) => {
      const ids = await seedDatedRecords()
      const value = valueAt(jsonOf(await call("crm_fetch", read(ids))), path)

      const result = await call("crm_update", write(ids, value))

      expect(result.isError).toBeFalsy()
      expect(await stored(ids)).toEqual(expected)
    },
  )
})

describe("unknown id in crm_update", () => {
  it.each([
    { entity: "company", id: "missing-id", fields: { name: "Renamed" } },
    { entity: "lead", id: "missing-id", fields: { notes: "x" } },
    { entity: "signal", id: "missing-signal", fields: { content: "x" } },
    { entity: "weekly-review", id: "missing-review", fields: { wins: "x" } },
  ])("points to crm_search for an unknown $entity id", async (args) => {
    const result = await call("crm_update", args)

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("crm_search")
  })
})

// Une entité sans Détails refuse `detailsSection` au lieu de l'ignorer en répondant un succès.
const WITHOUT_DETAILS = [
  {
    entity: "signal",
    seed: async () => (await seedSignal({ companyId: (await seedCompany()).id }, {})).id,
    read: storedSignal,
    fields: { content: "Recrute trois développeurs" },
  },
  {
    entity: "prospecting-action",
    seed: async () => (await seedAction((await seedPerson({ name: "Jane Doe" })).id, {})).id,
    read: storedAction,
    fields: { title: "Relance envoyée" },
  },
  {
    entity: "weekly-review",
    seed: async () => (await seedReview()).id,
    read: storedReview,
    fields: { wins: "Trois réponses" },
  },
] as const

describe("detailsSection in crm_update of entities without Details", () => {
  it.each(WITHOUT_DETAILS)(
    "rejects detailsSection alone on a $entity without touching it",
    async ({ entity, seed, read }) => {
      const id = await seed()
      const before = await read(id)

      const result = await call("crm_update", {
        entity,
        id,
        detailsSection: { heading: "Chiffres clés", content: "x" },
      })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain("detailsSection")
      expect((await read(id)).updatedAt).toEqual(before.updatedAt)
    },
  )

  it.each(WITHOUT_DETAILS)(
    "rejects fields sent with detailsSection on a $entity and writes neither",
    async ({ entity, seed, read, fields }) => {
      const id = await seed()
      const before = await read(id)

      const result = await call("crm_update", {
        entity,
        id,
        fields,
        detailsSection: { heading: "Chiffres clés", content: "x" },
      })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain("detailsSection")
      expect(await read(id)).toEqual(before)
    },
  )
})
