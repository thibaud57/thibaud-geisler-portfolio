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
vi.mock("@/server/company-logo/fetch-company-logo", () => ({ retrieveCompanyLogo: vi.fn() }))

import type { Prisma } from "@/generated/prisma/client"
import { ADMIN_ASSETS_PATH } from "@/lib/admin/routes"
import { COMPANY_DETAILS_TEMPLATE } from "@/lib/crm/details-templates"
import {
  prisma,
  resetDatabase,
  seedCompany,
  seedCompanyWithLegalEntity,
} from "@/lib/prisma-test-setup"
import {
  retrieveCompanyLogo,
  type CompanyIconFailure,
} from "@/server/company-logo/fetch-company-logo"
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

const createCompanyArgs = (data: Record<string, unknown>) => ({ entity: "company", data })

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
    const person = await prisma.person.create({
      data: { name: "Jane Doe", companyId: company.id, lead: { create: { origin: "OUTBOUND" } } },
    })
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

  it("flags an unknown id in crm_update", async () => {
    const result = await call("crm_update", {
      entity: "company",
      id: "missing-id",
      fields: { name: "Renamed" },
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain("crm_search")
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

describe("write logs", () => {
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
})
