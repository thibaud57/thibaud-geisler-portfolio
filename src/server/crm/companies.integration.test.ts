import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/server/company-logo/fetch-company-logo", () => ({ retrieveCompanyLogo: vi.fn() }))

import { COMPANY_DETAILS_TEMPLATE } from "@/lib/crm/details-templates"
import { companyIdSchema } from "@/lib/ids"
import {
  companyIdOf,
  prisma,
  resetDatabase,
  seedCompany,
  seedCompanyWithLegalEntity,
} from "@/lib/prisma-test-setup"
import type { CompanyInput } from "@/lib/schemas/company"
import { retrieveCompanyLogo } from "@/server/company-logo/fetch-company-logo"

import { createCompany, refreshCompanyLogo, updateCompany } from "./companies"

const LOGO_KEY = "freelance/crm/entreprises/acme/logo-0123456789ab.png"
const PREVIOUS_LOGO_KEY = "freelance/crm/entreprises/acme/logo-previous.png"

function companyInput(overrides: Partial<CompanyInput> = {}): CompanyInput {
  return {
    slug: "acme",
    name: "Acme",
    sectors: ["SAAS"],
    size: null,
    websiteUrl: null,
    logoFilename: null,
    types: ["CLIENT_FINAL"],
    ...overrides,
  }
}

function legalEntityFields(overrides: Partial<CompanyInput> = {}): Partial<CompanyInput> {
  return {
    legalEntityName: "Acme SAS",
    legalEntityStreet: "1 rue de l'Exemple",
    legalEntityPostalCode: "75000",
    legalEntityCity: "Paris",
    legalEntityCountry: "FR",
    ...overrides,
  }
}

function loadCompany(slug = "acme") {
  return prisma.company.findUniqueOrThrow({
    where: { slug },
    include: { legalEntity: { include: { address: true, publisher: true } } },
  })
}

const UNKNOWN_ID = companyIdSchema.parse("missing-company")

beforeEach(async () => {
  await resetDatabase()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("createCompany", () => {
  it("creates a company with its nested legal entity, headquarters and the company slug", async () => {
    const result = await createCompany(
      companyInput(legalEntityFields({ legalEntityStatusKey: "SAS" })),
    )

    const company = await loadCompany()
    expect(result).toEqual({ ok: true, value: { id: company.id, slug: "acme", name: "Acme" } })
    expect(company.legalEntity).toMatchObject({
      slug: "acme",
      name: "Acme SAS",
      legalForm: "SAS",
      address: { street: "1 rue de l'Exemple", postalCode: "75000", city: "Paris", country: "FR" },
    })
  })

  it("creates no legal entity without legalEntityName", async () => {
    await createCompany(companyInput())

    expect((await loadCompany()).legalEntity).toBeNull()
  })

  it.each([
    ["slug_taken", "a company slug", async () => seedCompany(), companyInput()],
    [
      "siret_taken",
      "a SIRET",
      async () =>
        seedCompany({
          slug: "other",
          name: "Other",
          legalEntity: {
            create: { slug: "other", name: "Other SAS", siret: "11122233300044" },
          },
        }),
      companyInput(legalEntityFields({ legalEntitySiret: "11122233300044" })),
    ],
    [
      "legal_entity_slug_taken",
      "a legal entity slug",
      async () => prisma.legalEntity.create({ data: { slug: "acme", name: "Orphan" } }),
      companyInput(legalEntityFields()),
    ],
  ])("maps %s from a real unique violation on %s", async (code, _label, seed, input) => {
    await seed()

    const result = await createCompany(input)

    expect(result).toEqual({ ok: false, error: { code } })
  })

  it.each([
    ["ignores the RCS number when the headquarters is in France", {}, null],
    [
      "keeps the RCS number when the headquarters is abroad",
      { legalEntityCountry: "LU" },
      "B123456",
    ],
  ] as const)("%s", async (_label, headquarters, expected) => {
    await createCompany(
      companyInput(legalEntityFields({ legalEntityRcsNumber: "B123456", ...headquarters })),
    )

    expect((await loadCompany()).legalEntity?.rcsNumber).toBe(expected)
  })

  it("defaults the capital currency to EUR when a capital has none", async () => {
    await createCompany(companyInput(legalEntityFields({ legalEntityCapitalAmount: 10000 })))

    expect((await loadCompany()).legalEntity).toMatchObject({
      capitalAmount: 10000,
      capitalCurrency: "EUR",
    })
  })

  it("keeps the submitted capital currency", async () => {
    await createCompany(
      companyInput(
        legalEntityFields({ legalEntityCapitalAmount: 10000, legalEntityCapitalCurrency: "USD" }),
      ),
    )

    expect((await loadCompany()).legalEntity?.capitalCurrency).toBe("USD")
  })

  it("stores types, zones, relation status, notes and details", async () => {
    await createCompany(
      companyInput({
        types: ["CLIENT_FINAL", "PARTENAIRE"],
        zones: ["PARIS", "LUXEMBOURG"],
        relationStatus: "DORMANTE",
        notes: "Rencontrée au salon",
        details: "# 🏢 À propos\n\nÉditeur de logiciels.",
      }),
    )

    expect(await loadCompany()).toMatchObject({
      types: ["CLIENT_FINAL", "PARTENAIRE"],
      zones: ["PARIS", "LUXEMBOURG"],
      relationStatus: "DORMANTE",
      notes: "Rencontrée au salon",
      details: "# 🏢 À propos\n\nÉditeur de logiciels.",
    })
  })

  it("leaves the relation status to the database default when absent", async () => {
    await createCompany(companyInput())

    expect((await loadCompany()).relationStatus).toBe("ACTIVE")
  })
})

describe("updateCompany with fields", () => {
  it("leaves absent fields unchanged and clears fields set to null", async () => {
    const company = await seedCompany({ size: "PME", websiteUrl: "https://acme.example.com" })

    const result = await updateCompany(companyIdOf(company), {
      kind: "fields",
      fields: { size: null },
    })

    expect(result).toEqual({ ok: true, value: { id: company.id, slug: "acme", name: "Acme" } })
    expect(await loadCompany()).toMatchObject({
      size: null,
      name: "Acme",
      websiteUrl: "https://acme.example.com",
    })
  })

  it("stores types, zones, relation status, notes and details, and keeps the fields the patch omits", async () => {
    const company = await seedCompany({ sectors: ["SAAS"], types: ["CLIENT_FINAL"] })

    await updateCompany(companyIdOf(company), {
      kind: "fields",
      fields: {
        types: ["PARTENAIRE"],
        zones: ["PARIS", "LUXEMBOURG"],
        relationStatus: "DORMANTE",
        notes: "Rencontrée au salon",
        details: "# 🏢 À propos\n\nÉditeur de logiciels.",
      },
    })

    expect(await loadCompany()).toMatchObject({
      name: "Acme",
      sectors: ["SAAS"],
      types: ["PARTENAIRE"],
      zones: ["PARIS", "LUXEMBOURG"],
      relationStatus: "DORMANTE",
      notes: "Rencontrée au salon",
      details: "# 🏢 À propos\n\nÉditeur de logiciels.",
    })
  })

  it("clears the zones when given an empty list", async () => {
    const company = await seedCompany({ zones: ["PARIS"] })

    await updateCompany(companyIdOf(company), { kind: "fields", fields: { zones: [] } })

    expect((await loadCompany()).zones).toEqual([])
  })

  it("keeps the submitted logo key", async () => {
    const company = await seedCompany()

    await updateCompany(companyIdOf(company), {
      kind: "fields",
      fields: { logoFilename: LOGO_KEY },
    })

    expect((await loadCompany()).logoFilename).toBe(LOGO_KEY)
  })

  it("targets the company by its id", async () => {
    const company = await seedCompany()
    await seedCompany({ slug: "other", name: "Other" })

    await updateCompany(companyIdOf(company), { kind: "fields", fields: { name: "Acme 2" } })

    expect((await loadCompany("other")).name).toBe("Other")
  })

  it("leaves the legal entity and headquarters untouched without legalEntityName", async () => {
    const company = await seedCompanyWithLegalEntity({ phone: "+33 3 00 00 00 00" })
    const before = await loadCompany()

    await updateCompany(companyIdOf(company), { kind: "fields", fields: { name: "Acme 2" } })

    const after = await loadCompany()
    expect(after.name).toBe("Acme 2")
    expect(after.legalEntity).toEqual(before.legalEntity)
  })

  it("upserts the legal entity on update, creating it with the company slug", async () => {
    const company = await seedCompany()

    await updateCompany(companyIdOf(company), { kind: "fields", fields: legalEntityFields() })

    expect((await loadCompany()).legalEntity).toMatchObject({
      slug: "acme",
      name: "Acme SAS",
      address: { city: "Paris" },
    })
  })

  it("upserts the legal entity on update, updating the existing one", async () => {
    const company = await seedCompanyWithLegalEntity()
    const before = await loadCompany()

    await updateCompany(companyIdOf(company), {
      kind: "fields",
      fields: legalEntityFields({ legalEntityPhone: "+33 3 00 00 00 00", legalEntityCity: "Lyon" }),
    })

    const after = await loadCompany()
    expect(after.legalEntity).toMatchObject({
      id: before.legalEntity?.id,
      phone: "+33 3 00 00 00 00",
      address: { id: before.legalEntity?.address?.id, city: "Lyon" },
    })
  })

  it("removes the headquarters when the update gives no address", async () => {
    const company = await seedCompanyWithLegalEntity()
    const addressId = (await loadCompany()).legalEntity?.addressId

    await updateCompany(companyIdOf(company), {
      kind: "fields",
      fields: { legalEntityName: "Acme SAS" },
    })

    expect((await loadCompany()).legalEntity?.address).toBeNull()
    expect(await prisma.address.findUnique({ where: { id: addressId ?? "" } })).toBeNull()
  })

  it("clears the capital currency when the capital is emptied", async () => {
    const company = await seedCompanyWithLegalEntity({
      capitalAmount: 10000,
      capitalCurrency: "EUR",
    })

    await updateCompany(companyIdOf(company), {
      kind: "fields",
      fields: legalEntityFields({ legalEntityCapitalAmount: null }),
    })

    expect((await loadCompany()).legalEntity).toMatchObject({
      capitalAmount: null,
      capitalCurrency: null,
    })
  })

  describe("publisher VAT fields", () => {
    const vatFields = legalEntityFields({
      legalEntityVatNumber: "FR00000000000",
      legalEntityVatRegime: "REEL_SIMPLIFIE",
      legalEntityVatLiableSince: new Date("2026-01-01"),
    })

    function seedPublisher(legalEntityId: string, vatRegime: "REEL_NORMAL" | null = null) {
      return prisma.publisher.create({
        data: {
          legalEntityId,
          apeCode: "6201Z",
          registrationType: "RCS",
          publicEmail: "contact@example.com",
          vatRegime,
        },
      })
    }

    it("writes the publisher VAT fields when the entity has a publisher", async () => {
      const company = await seedCompanyWithLegalEntity()
      await seedPublisher((await loadCompany()).legalEntityId ?? "")

      await updateCompany(companyIdOf(company), { kind: "fields", fields: vatFields })

      expect((await loadCompany()).legalEntity?.publisher).toMatchObject({
        vatRegime: "REEL_SIMPLIFIE",
        vatLiableSince: new Date("2026-01-01"),
      })
    })

    it("leaves the publisher VAT fields untouched when the patch omits them", async () => {
      const company = await seedCompanyWithLegalEntity()
      await seedPublisher((await loadCompany()).legalEntityId ?? "", "REEL_NORMAL")

      await updateCompany(companyIdOf(company), { kind: "fields", fields: legalEntityFields() })

      expect((await loadCompany()).legalEntity?.publisher?.vatRegime).toBe("REEL_NORMAL")
    })

    it("ignores the VAT fields when the entity has no publisher", async () => {
      const company = await seedCompanyWithLegalEntity()

      await updateCompany(companyIdOf(company), { kind: "fields", fields: vatFields })

      expect(await prisma.publisher.count()).toBe(0)
    })
  })

  it("maps real unique violations to slug_taken", async () => {
    await seedCompany({ slug: "other", name: "Other" })
    const company = await seedCompany()

    const result = await updateCompany(companyIdOf(company), {
      kind: "fields",
      fields: { slug: "other" },
    })

    expect(result).toEqual({ ok: false, error: { code: "slug_taken" } })
  })

  it.each([
    ["returns not_found for an unknown id", { name: "Acme 2" }],
    [
      "returns not_found for an unknown id when the patch writes a legal entity",
      legalEntityFields(),
    ],
  ])("%s", async (_label, fields) => {
    const result = await updateCompany(UNKNOWN_ID, { kind: "fields", fields })

    expect(result).toEqual({ ok: false, error: { code: "not_found" } })
  })

  it("rethrows a missing-record error when the company still exists", async () => {
    const company = await seedCompany()
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce({ code: "P2025" })

    const update = updateCompany(companyIdOf(company), {
      kind: "fields",
      fields: { name: "Acme 2" },
    })

    await expect(update).rejects.toEqual({ code: "P2025" })
  })
})

describe("updateCompany with a details section", () => {
  const sectionPatch = {
    kind: "section",
    fields: { notes: "Rencontrée au salon" },
    detailsSection: { heading: "À propos", content: "Éditeur de logiciels." },
  } as const

  it("replaces a details section with the fields in one transaction", async () => {
    const company = await seedCompany({ details: COMPANY_DETAILS_TEMPLATE, notes: "Avant" })

    const result = await updateCompany(companyIdOf(company), sectionPatch)

    expect(result.ok).toBe(true)
    expect(await loadCompany()).toMatchObject({
      notes: "Rencontrée au salon",
      details: COMPANY_DETAILS_TEMPLATE.replace(
        "# 🏢 À propos\n",
        "# 🏢 À propos\n\nÉditeur de logiciels.\n",
      ),
    })
  })

  it("writes nothing on section_not_found", async () => {
    const company = await seedCompany({
      details: COMPANY_DETAILS_TEMPLATE,
      notes: "Avant",
      relationStatus: "ACTIVE",
    })

    const result = await updateCompany(companyIdOf(company), {
      ...sectionPatch,
      fields: { notes: "Après", relationStatus: "DORMANTE" },
      detailsSection: { heading: "Inconnue", content: "x" },
    })

    expect(result).toEqual({
      ok: false,
      error: {
        code: "section_not_found",
        headings: [
          "🏢 À propos",
          "📊 Chiffres clés",
          "🌐 Activités",
          "🤝 Contexte de la relation",
          "🔗 Liens",
        ],
      },
    })
    expect(await loadCompany()).toMatchObject({
      notes: "Avant",
      relationStatus: "ACTIVE",
      details: COMPANY_DETAILS_TEMPLATE,
    })
  })

  it("writes nothing on no_details", async () => {
    const company = await seedCompany({ details: null, notes: "Avant" })

    const result = await updateCompany(companyIdOf(company), {
      ...sectionPatch,
      fields: { notes: "Après", relationStatus: "DORMANTE" },
    })

    expect(result).toEqual({ ok: false, error: { code: "no_details" } })
    expect(await loadCompany()).toMatchObject({ notes: "Avant", relationStatus: "ACTIVE" })
  })

  it("returns not_found for an unknown id", async () => {
    const result = await updateCompany(UNKNOWN_ID, sectionPatch)

    expect(result).toEqual({ ok: false, error: { code: "not_found" } })
  })
})

describe("refreshCompanyLogo", () => {
  it("stores the logo key returned by retrieveCompanyLogo", async () => {
    const company = await seedCompany({ websiteUrl: "https://acme.example.com" })
    vi.mocked(retrieveCompanyLogo).mockResolvedValueOnce({
      ok: true,
      key: LOGO_KEY,
      width: 256,
      height: 256,
      source: "icon",
    })

    const result = await refreshCompanyLogo(companyIdOf(company))

    expect(result).toEqual({ ok: true, value: { key: LOGO_KEY } })
    expect(retrieveCompanyLogo).toHaveBeenCalledWith(new URL("https://acme.example.com"), "acme")
    expect((await loadCompany()).logoFilename).toBe(LOGO_KEY)
  })

  it("returns not_found for an unknown id", async () => {
    const result = await refreshCompanyLogo(UNKNOWN_ID)

    expect(result).toEqual({ ok: false, error: { code: "not_found" } })
  })

  it.each([
    ["no_website", null],
    ["invalid_website", "pas-une-url"],
  ])("returns %s without calling the service or writing", async (code, websiteUrl) => {
    const company = await seedCompany({ websiteUrl, logoFilename: PREVIOUS_LOGO_KEY })

    const result = await refreshCompanyLogo(companyIdOf(company))

    expect(result).toEqual({ ok: false, error: { code } })
    expect(retrieveCompanyLogo).not.toHaveBeenCalled()
    expect((await loadCompany()).logoFilename).toBe(PREVIOUS_LOGO_KEY)
  })

  it("returns the service failure without writing", async () => {
    const company = await seedCompany({
      websiteUrl: "https://acme.example.com",
      logoFilename: PREVIOUS_LOGO_KEY,
    })
    vi.mocked(retrieveCompanyLogo).mockResolvedValueOnce({ ok: false, message: "no_icon_found" })

    const result = await refreshCompanyLogo(companyIdOf(company))

    expect(result).toEqual({ ok: false, error: { code: "no_icon_found" } })
    expect((await loadCompany()).logoFilename).toBe(PREVIOUS_LOGO_KEY)
  })

  it("lets a storage error through", async () => {
    const company = await seedCompany({ websiteUrl: "https://acme.example.com" })
    vi.mocked(retrieveCompanyLogo).mockRejectedValueOnce(new Error("storage down"))

    const refresh = refreshCompanyLogo(companyIdOf(company))

    await expect(refresh).rejects.toThrow("storage down")
  })
})
