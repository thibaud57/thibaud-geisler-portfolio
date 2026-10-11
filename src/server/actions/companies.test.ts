import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const prisma = {
    company: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    legalEntity: { delete: vi.fn() },
    address: { delete: vi.fn() },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  )
  return { prisma }
})
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { updateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/get-current-user"
import { NONE_VALUE } from "@/lib/schemas/company"
import { createCompany, deleteCompany, updateCompany } from "./companies"
import { initialCompanyFormState } from "./companies.types"

const BASE_FIELDS = {
  slug: "acme",
  name: "Acme",
  size: NONE_VALUE,
  websiteUrl: "",
}

function buildFormData(
  overrides: Record<string, string> = {},
  sectors: string[] = ["SAAS"],
  lists: Record<string, string[]> = {},
): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  for (const sector of sectors) data.append("sectors", sector)
  for (const [key, values] of Object.entries(lists)) {
    for (const value of values) data.append(key, value)
  }
  return data
}

function withLegalEntity(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    legalEntityName: "Acme SAS",
    legalEntityStreet: "1 rue de l'Exemple",
    legalEntityPostalCode: "75000",
    legalEntityCity: "Paris",
    legalEntityCountry: "FR",
    ...overrides,
  }
}

const CRM_FIELDS = ["types", "zones", "relationStatus", "notes", "details"] as const

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie ici.
function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

// Constaté le 2026-09-19 sur ce projet (Prisma 7.10 + @prisma/adapter-pg) : un P2002 ne porte pas
// `meta.target`, l'index de contrainte vit sous `meta.driverAdapterError.cause.constraint.index`.
function uniqueViolation(index: string) {
  return {
    code: "P2002",
    meta: {
      modelName: "Company",
      driverAdapterError: {
        name: "DriverAdapterError",
        cause: {
          originalCode: "23505",
          originalMessage: `duplicate key value violates unique constraint "${index}"`,
          kind: "UniqueConstraintViolation",
          constraint: { index },
          table: "Company",
        },
      },
    },
  }
}

describe("createCompany", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("rejects an empty slug without touching the database", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    const state = await createCompany(initialCompanyFormState, buildFormData({ slug: "" }))

    expect(state.errors.slug).toBeDefined()
    expect(prisma.company.create).not.toHaveBeenCalled()
  })

  it("rejects an empty name", async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ name: "" }))

    expect(state.errors.name).toBeDefined()
  })

  it("rejects a malformed slug", async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ slug: "Acme Corp" }))

    expect(state.errors.slug).toBeDefined()
  })

  it("normalizes the slug to lowercase", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(initialCompanyFormState, buildFormData({ slug: "Acme" }))

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ slug: "acme" }) }),
    )
  })

  it("rejects an unknown sector", async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({}, ["INCONNU"]))

    expect(state.errors.sectors).toBeDefined()
  })

  it("accepts an empty sectors list", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    const state = await createCompany(initialCompanyFormState, buildFormData({}, []))

    expect(state.ok).toBe(true)
    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ sectors: [] }) }),
    )
  })

  it("keeps every submitted sector", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(initialCompanyFormState, buildFormData({}, ["SAAS", "FINTECH"]))

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ sectors: ["SAAS", "FINTECH"] }) }),
    )
  })

  it("rejects an unknown size", async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ size: "ENORME" }))

    expect(state.errors.size).toBeDefined()
  })

  it('stores the "aucune" sentinel as null for size', async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(initialCompanyFormState, buildFormData({ size: NONE_VALUE }))

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ size: null }) }),
    )
  })

  it("stores an empty size as null", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(initialCompanyFormState, buildFormData({ size: "" }))

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ size: null }) }),
    )
  })

  it("rejects an invalid website url with a French message", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData({ websiteUrl: "pas-une-url" }),
    )

    expect(state.errors.websiteUrl).toEqual(["L'adresse du site n'est pas valide"])
  })

  it("rejects a javascript: website url with a French message, without touching the database", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData({ websiteUrl: "javascript:alert(1)" }),
    )

    expect(state.errors.websiteUrl).toEqual(["L'adresse du site n'est pas valide"])
    expect(prisma.company.create).not.toHaveBeenCalled()
  })

  it("stores an empty website url as null", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(initialCompanyFormState, buildFormData({ websiteUrl: "" }))

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ websiteUrl: null }) }),
    )
  })

  it("rejects a logo key outside the companies asset folder", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData({ logoFilename: "branding/logos/monogramme.svg" }),
    )

    expect(state.errors.logoFilename).toBeDefined()
    expect(prisma.company.create).not.toHaveBeenCalled()
  })

  it("returns the submitted values on failure", async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ slug: "" }))

    expect(state.values?.name).toBe("Acme")
  })

  it("invalidates the projects cache tag after a successful creation", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(initialCompanyFormState, buildFormData())

    expect(updateTag).toHaveBeenCalledWith("projects")
  })

  it("assigns a slug uniqueness violation to the slug field", async () => {
    vi.mocked(prisma.company.create).mockRejectedValue(uniqueViolation("Company_slug_key"))

    const state = await createCompany(initialCompanyFormState, buildFormData())

    expect(state.message).toBe("slug_taken")
    expect(state.errors.slug).toBeDefined()
  })

  it("creates the legal entity with the company, with the company slug", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntityStatusKey: "SAS" }), ["SAAS"], {
        types: ["CLIENT_FINAL"],
      }),
    )

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          legalEntity: {
            create: objectMatch({
              slug: "acme",
              name: "Acme SAS",
              legalForm: "SAS",
              address: {
                create: {
                  street: "1 rue de l'Exemple",
                  postalCode: "75000",
                  city: "Paris",
                  country: "FR",
                },
              },
            }),
          },
        }),
      }),
    )
  })

  it("rejects a legal entity without a name", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntityName: "" }), ["SAAS"], {
        types: ["CLIENT_FINAL"],
      }),
    )

    expect(state.errors.legalEntityName).toEqual(["La raison sociale est requise"])
    expect(prisma.company.create).not.toHaveBeenCalled()
  })

  it("strips spaces from a SIRET and rejects one that is not 14 digits", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    const invalid = await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntitySiret: "123 456 789 0123" }), ["SAAS"], {
        types: ["CLIENT_FINAL"],
      }),
    )
    await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntitySiret: "111 222 333 00044" }), ["SAAS"], {
        types: ["CLIENT_FINAL"],
      }),
    )

    expect(invalid.errors.legalEntitySiret).toEqual(["Le SIRET compte 14 chiffres"])
    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          legalEntity: { create: objectMatch({ siret: "11122233300044" }) },
        }),
      }),
    )
  })

  it("rejects an unknown legal form", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntityStatusKey: "kg" }), ["SAAS"], {
        types: ["CLIENT_FINAL"],
      }),
    )

    expect(state.errors.legalEntityStatusKey).toBeDefined()
  })

  it("rejects a partial registered office address", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData(
        withLegalEntity({
          legalEntityStreet: "",
          legalEntityPostalCode: "",
          legalEntityCountry: "",
        }),
        ["SAAS"],
        { types: ["CLIENT_FINAL"] },
      ),
    )

    expect(state.errors.legalEntityStreet).toEqual(["Requis pour un siège complet"])
    expect(state.errors.legalEntityPostalCode).toBeDefined()
    expect(state.errors.legalEntityCountry).toBeDefined()
    expect(prisma.company.create).not.toHaveBeenCalled()
  })

  it("ignores the RCS number when the registered office is in France", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(
      initialCompanyFormState,
      buildFormData(
        withLegalEntity({
          legalEntityRcsNumber: "B123456",
          legalEntityStreet: "1 rue de l'Exemple",
          legalEntityPostalCode: "75000",
          legalEntityCity: "Paris",
          legalEntityCountry: "FR",
        }),
        ["SAAS"],
        { types: ["CLIENT_FINAL"] },
      ),
    )

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({ legalEntity: { create: objectMatch({ rcsNumber: null }) } }),
      }),
    )
  })

  it("maps a SIRET uniqueness violation to the SIRET field", async () => {
    vi.mocked(prisma.company.create).mockRejectedValue(uniqueViolation("LegalEntity_siret_key"))

    const state = await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntitySiret: "11122233300044" }), ["SAAS"], {
        types: ["CLIENT_FINAL"],
      }),
    )

    expect(state.message).toBe("siret_taken")
    expect(state.errors.legalEntitySiret).toBeDefined()
    expect(state.errors.slug).toBeUndefined()
  })

  it("maps a legal entity slug collision to the legal name", async () => {
    vi.mocked(prisma.company.create).mockRejectedValue(uniqueViolation("LegalEntity_slug_key"))

    const state = await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity(), ["SAAS"], { types: ["CLIENT_FINAL"] }),
    )

    expect(state.errors.legalEntityName).toBeDefined()
    expect(state.errors.slug).toBeUndefined()
  })

  it("invalidates the legal entity cache tag after a write", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(initialCompanyFormState, buildFormData())

    expect(updateTag).toHaveBeenCalledWith("legal-entity")
  })

  it("rejects a call without a session, before any validation", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(createCompany(initialCompanyFormState, buildFormData())).rejects.toThrow()

    expect(prisma.company.create).not.toHaveBeenCalled()
  })

  it("rejects a submitted but empty types list", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData({}, ["SAAS"], { types: [""] }),
    )

    expect(state.errors.types).toEqual(["Sélectionne au moins un type"])
    expect(prisma.company.create).not.toHaveBeenCalled()
  })

  it("rejects an unknown type", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData({}, ["SAAS"], { types: ["FOURNISSEUR"] }),
    )

    expect(state.errors.types).toBeDefined()
  })

  it("stores the submitted types, zones, relation status, notes and details, with zones sorted into canonical order", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(
      initialCompanyFormState,
      buildFormData(
        {
          relationStatus: "DORMANTE",
          notes: "  Rencontrée au salon  ",
          details: "# 🏢 À propos\n\nÉditeur de logiciels.",
        },
        ["SAAS"],
        { types: ["CLIENT_FINAL", "PARTENAIRE"], zones: ["LUXEMBOURG", "PARIS"] },
      ),
    )

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          types: ["CLIENT_FINAL", "PARTENAIRE"],
          zones: ["PARIS", "LUXEMBOURG"],
          relationStatus: "DORMANTE",
          notes: "Rencontrée au salon",
          details: "# 🏢 À propos\n\nÉditeur de logiciels.",
        }),
      }),
    )
  })

  it("rejects notes longer than 200 characters", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData({ notes: "a".repeat(201) }, ["SAAS"], { types: ["CLIENT_FINAL"] }),
    )

    expect(state.errors.notes).toEqual([
      "Les notes tiennent sur une ligne (200 caractères au plus)",
    ])
    expect(prisma.company.create).not.toHaveBeenCalled()
  })

  it("leaves the relation status to the database default when the field is absent", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(initialCompanyFormState, buildFormData())

    const data = vi.mocked(prisma.company.create).mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >
    expect(data["relationStatus"]).toBeUndefined()
  })

  it("stores empty notes and details as null", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(
      initialCompanyFormState,
      buildFormData({ notes: "   ", details: "   " }, ["SAAS"], { types: ["CLIENT_FINAL"] }),
    )

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ notes: null, details: null }) }),
    )
  })
})

describe("updateCompany", () => {
  beforeEach(() => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ legalEntity: null } as never)
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("targets the company by its id", async () => {
    vi.mocked(prisma.company.update).mockResolvedValue({ id: "c1" } as never)

    await updateCompany("c1", initialCompanyFormState, buildFormData())

    expect(prisma.company.update).toHaveBeenCalledWith(objectMatch({ where: { id: "c1" } }))
  })

  it("keeps the submitted logo key instead of clearing it", async () => {
    vi.mocked(prisma.company.update).mockResolvedValue({ id: "c1" } as never)

    await updateCompany(
      "c1",
      initialCompanyFormState,
      buildFormData({ logoFilename: "freelance/crm/entreprises/acme/logo.png" }),
    )

    expect(prisma.company.update).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({ logoFilename: "freelance/crm/entreprises/acme/logo.png" }),
      }),
    )
  })

  it("invalidates the projects cache tag after a successful update", async () => {
    vi.mocked(prisma.company.update).mockResolvedValue({ id: "c1" } as never)

    await updateCompany("c1", initialCompanyFormState, buildFormData())

    expect(updateTag).toHaveBeenCalledWith("projects")
  })

  it("leaves the company untouched when the payload is invalid", async () => {
    const state = await updateCompany("c1", initialCompanyFormState, buildFormData({ slug: "" }))

    expect(state.errors.slug).toBeDefined()
    expect(prisma.company.update).not.toHaveBeenCalled()
  })

  it("rejects a call without a session, before any validation", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(updateCompany("c1", initialCompanyFormState, buildFormData())).rejects.toThrow()

    expect(prisma.company.update).not.toHaveBeenCalled()
  })

  it("leaves every CRM field untouched when the form does not send it", async () => {
    vi.mocked(prisma.company.update).mockResolvedValue({ id: "c1" } as never)

    await updateCompany("c1", initialCompanyFormState, buildFormData())

    const data = vi.mocked(prisma.company.update).mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >
    for (const field of CRM_FIELDS) expect(data[field]).toBeUndefined()
  })

  it("upserts the legal entity on update", async () => {
    vi.mocked(prisma.company.update).mockResolvedValue({ id: "c1" } as never)

    await updateCompany(
      "c1",
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntityPhone: "+33 3 00 00 00 00" }), ["SAAS"], {
        types: ["CLIENT_FINAL"],
      }),
    )

    expect(prisma.company.update).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          legalEntity: {
            upsert: {
              create: objectMatch({ slug: "acme", phone: "+33 3 00 00 00 00" }),
              update: objectMatch({ phone: "+33 3 00 00 00 00" }),
            },
          },
        }),
      }),
    )
  })

  it("leaves the legal entity untouched when the form does not send it", async () => {
    vi.mocked(prisma.company.update).mockResolvedValue({ id: "c1" } as never)

    await updateCompany("c1", initialCompanyFormState, buildFormData())

    const data = vi.mocked(prisma.company.update).mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >
    expect(data["legalEntity"]).toBeUndefined()
  })

  it("writes the vat liability date and regime on the publisher when the entity has one", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      legalEntity: { addressId: null, publisher: { id: "pub1" } },
    } as never)
    vi.mocked(prisma.company.update).mockResolvedValue({ id: "c1" } as never)

    await updateCompany(
      "c1",
      initialCompanyFormState,
      buildFormData(
        withLegalEntity({
          legalEntityVatLiableSince: "2026-01-01",
          legalEntityVatRegime: "REEL_SIMPLIFIE",
          legalEntityVatNumber: "FR00000000000",
        }),
        ["SAAS"],
        { types: ["CLIENT_FINAL"] },
      ),
    )

    expect(prisma.company.update).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          legalEntity: {
            upsert: objectMatch({
              update: objectMatch({
                publisher: {
                  update: { vatRegime: "REEL_SIMPLIFIE", vatLiableSince: new Date("2026-01-01") },
                },
              }),
            }),
          },
        }),
      }),
    )
  })

  it("ignores vat fields when the entity has no publisher", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      legalEntity: { addressId: null, publisher: null },
    } as never)
    vi.mocked(prisma.company.update).mockResolvedValue({ id: "c1" } as never)

    await updateCompany(
      "c1",
      initialCompanyFormState,
      buildFormData(
        withLegalEntity({
          legalEntityVatLiableSince: "2026-01-01",
          legalEntityVatRegime: "REEL_SIMPLIFIE",
          legalEntityVatNumber: "FR00000000000",
        }),
        ["SAAS"],
        { types: ["CLIENT_FINAL"] },
      ),
    )

    const data = vi.mocked(prisma.company.update).mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >
    const legalEntity = data["legalEntity"] as { upsert: { update: Record<string, unknown> } }
    expect(legalEntity.upsert.update["publisher"]).toBeUndefined()
  })
})

describe("deleteCompany", () => {
  afterEach(() => vi.clearAllMocks())

  it("deletes a company that is not referenced by any project", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ legalEntity: null } as never)
    vi.mocked(prisma.company.delete).mockResolvedValue({} as never)

    const state = await deleteCompany("c1")

    expect(state.ok).toBe(true)
    expect(updateTag).toHaveBeenCalledWith("projects")
    expect(updateTag).toHaveBeenCalledWith("legal-entity")
  })

  it("deletes the legal entity and its address with the company", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      legalEntity: { id: "le1", addressId: "a1", publisher: null, _count: { processings: 0 } },
    } as never)
    vi.mocked(prisma.company.delete).mockResolvedValue({} as never)

    await deleteCompany("c1")

    expect(prisma.legalEntity.delete).toHaveBeenCalledWith({ where: { id: "le1" } })
    expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: "a1" } })
  })

  it("only detaches a legal entity used as publisher or processor", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      legalEntity: {
        id: "le1",
        addressId: "a1",
        publisher: { id: "p1" },
        _count: { processings: 0 },
      },
    } as never)
    vi.mocked(prisma.company.delete).mockResolvedValue({} as never)

    await deleteCompany("c1")

    expect(prisma.company.delete).toHaveBeenCalled()
    expect(prisma.legalEntity.delete).not.toHaveBeenCalled()
    expect(prisma.address.delete).not.toHaveBeenCalled()
  })

  it("only detaches a legal entity used as processor", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      legalEntity: {
        id: "le1",
        addressId: "a1",
        publisher: null,
        _count: { processings: 1 },
      },
    } as never)
    vi.mocked(prisma.company.delete).mockResolvedValue({} as never)

    await deleteCompany("c1")

    expect(prisma.company.delete).toHaveBeenCalled()
    expect(prisma.legalEntity.delete).not.toHaveBeenCalled()
    expect(prisma.address.delete).not.toHaveBeenCalled()
  })

  it("translates a foreign key violation into an explicit message", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ legalEntity: null } as never)
    vi.mocked(prisma.company.delete).mockRejectedValue({ code: "P2003" })

    const state = await deleteCompany("c1")

    expect(state.message).toBe("company_in_use")
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(deleteCompany("c1")).rejects.toThrow()

    expect(prisma.company.delete).not.toHaveBeenCalled()
  })
})
