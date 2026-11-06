import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const prisma = {
    company: {
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
vi.mock("@/server/crm/companies", async (orig) => ({
  ...(await orig<typeof import("@/server/crm/companies")>()),
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
}))

import { updateTag } from "next/cache"
import { getCurrentUser } from "@/lib/get-current-user"
import { constraintViolation, objectMatch } from "@/lib/matchers-test-setup"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/none-value"
import {
  createCompany as createCompanyRecord,
  updateCompany as updateCompanyRecord,
} from "@/server/crm/companies"
import { fail, ok } from "@/server/crm/result"
import { createCompany, deleteCompany, updateCompany } from "./companies"
import { initialCompanyFormState } from "./companies.types"

const baseFields = () => ({
  slug: "acme",
  name: "Acme",
  size: NONE_VALUE,
  websiteUrl: "",
})

const summary = () => ({ id: "c1", slug: "acme", name: "Acme" })

function buildFormData(
  overrides: Record<string, string> = {},
  sectors: string[] = ["SAAS"],
  lists: Record<string, string[]> = {},
): FormData {
  const submittedLists = { types: ["CLIENT_FINAL"], ...lists }
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...baseFields(), ...overrides })) {
    data.set(key, value)
  }
  for (const sector of sectors) data.append("sectors", sector)
  for (const [key, values] of Object.entries(submittedLists)) {
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

beforeEach(() => {
  vi.mocked(createCompanyRecord).mockResolvedValue(ok(summary()))
  vi.mocked(updateCompanyRecord).mockResolvedValue(ok(summary()))
  vi.mocked(prisma.company.findUnique).mockResolvedValue({ legalEntity: null } as never)
  vi.mocked(prisma.company.delete).mockResolvedValue({} as never)
})

describe("createCompany", () => {
  it("rejects an empty slug without calling the domain", async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ slug: "" }))

    expect(state.errors.slug).toBeDefined()
    expect(createCompanyRecord).not.toHaveBeenCalled()
  })

  it("rejects a malformed slug", async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ slug: "Acme Corp" }))

    expect(state.errors.slug).toBeDefined()
  })

  it("normalizes the slug to lowercase", async () => {
    await createCompany(initialCompanyFormState, buildFormData({ slug: "Acme" }))

    expect(createCompanyRecord).toHaveBeenCalledWith(objectMatch({ slug: "acme" }))
  })

  it("accepts an empty sectors list", async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({}, []))

    expect(state.ok).toBe(true)
    expect(createCompanyRecord).toHaveBeenCalledWith(objectMatch({ sectors: [] }))
  })

  it("keeps every submitted sector", async () => {
    await createCompany(initialCompanyFormState, buildFormData({}, ["SAAS", "FINTECH"]))

    expect(createCompanyRecord).toHaveBeenCalledWith(objectMatch({ sectors: ["SAAS", "FINTECH"] }))
  })

  it.each([
    ["the aucune sentinel", NONE_VALUE],
    ["an empty value", ""],
  ])("stores %s as a null size", async (_label, size) => {
    await createCompany(initialCompanyFormState, buildFormData({ size }))

    expect(createCompanyRecord).toHaveBeenCalledWith(objectMatch({ size: null }))
  })

  it.each(["pas-une-url", "javascript:alert(1)"])(
    "rejects %s as a website url with a French message, without calling the domain",
    async (websiteUrl) => {
      const state = await createCompany(initialCompanyFormState, buildFormData({ websiteUrl }))

      expect(state.errors.websiteUrl).toEqual(["L'adresse du site n'est pas valide"])
      expect(createCompanyRecord).not.toHaveBeenCalled()
    },
  )

  it("stores an empty website url as null", async () => {
    await createCompany(initialCompanyFormState, buildFormData({ websiteUrl: "" }))

    expect(createCompanyRecord).toHaveBeenCalledWith(objectMatch({ websiteUrl: null }))
  })

  it("rejects a logo key outside the companies asset folder", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData({ logoFilename: "branding/logos/monogramme.svg" }),
    )

    expect(state.errors.logoFilename).toBeDefined()
    expect(createCompanyRecord).not.toHaveBeenCalled()
  })

  it("returns the submitted values on failure", async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ slug: "" }))

    expect(state.values?.name).toBe("Acme")
  })

  it("invalidates the projects cache tag after a successful creation", async () => {
    await createCompany(initialCompanyFormState, buildFormData())

    expect(updateTag).toHaveBeenCalledWith("projects")
  })

  it("invalidates the legal entity cache tag after a write", async () => {
    await createCompany(initialCompanyFormState, buildFormData())

    expect(updateTag).toHaveBeenCalledWith("legal-entity")
  })

  it("assigns a slug uniqueness violation to the slug field, without invalidating", async () => {
    vi.mocked(createCompanyRecord).mockResolvedValueOnce(fail({ code: "slug_taken" }))

    const state = await createCompany(initialCompanyFormState, buildFormData())

    expect(state.message).toBe("slug_taken")
    expect(state.errors.slug).toBeDefined()
    expect(updateTag).not.toHaveBeenCalled()
  })

  it("maps a SIRET uniqueness violation to the SIRET field", async () => {
    vi.mocked(createCompanyRecord).mockResolvedValueOnce(fail({ code: "siret_taken" }))

    const state = await createCompany(initialCompanyFormState, buildFormData(withLegalEntity()))

    expect(state.message).toBe("siret_taken")
    expect(state.errors.legalEntitySiret).toBeDefined()
    expect(state.errors.slug).toBeUndefined()
  })

  it("maps a legal entity slug collision to the legal name, without a form message", async () => {
    vi.mocked(createCompanyRecord).mockResolvedValueOnce(fail({ code: "legal_entity_slug_taken" }))

    const state = await createCompany(initialCompanyFormState, buildFormData(withLegalEntity()))

    expect(state.message).toBeNull()
    expect(state.errors.legalEntityName).toBeDefined()
    expect(state.errors.slug).toBeUndefined()
  })

  it("answers unknown_error and keeps the typed values when the domain throws", async () => {
    vi.mocked(createCompanyRecord).mockRejectedValueOnce(
      constraintViolation("P2003", "Company_other_fkey"),
    )

    const state = await createCompany(initialCompanyFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
    expect(state.values?.name).toBe("Acme")
  })

  it("forwards the legal entity fields to the domain", async () => {
    await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntityStatusKey: "SAS" })),
    )

    expect(createCompanyRecord).toHaveBeenCalledWith(
      objectMatch({
        legalEntityName: "Acme SAS",
        legalEntityStatusKey: "SAS",
        legalEntityStreet: "1 rue de l'Exemple",
        legalEntityPostalCode: "75000",
        legalEntityCity: "Paris",
        legalEntityCountry: "FR",
      }),
    )
  })

  it("rejects a legal entity without a name", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntityName: "" })),
    )

    expect(state.errors.legalEntityName).toEqual(["La raison sociale est requise"])
    expect(createCompanyRecord).not.toHaveBeenCalled()
  })

  it("rejects a SIRET that is not 14 digits", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntitySiret: "123 456 789 0123" })),
    )

    expect(state.errors.legalEntitySiret).toEqual(["Le SIRET compte 14 chiffres"])
  })

  it("strips spaces from a SIRET", async () => {
    await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntitySiret: "111 222 333 00044" })),
    )

    expect(createCompanyRecord).toHaveBeenCalledWith(
      objectMatch({ legalEntitySiret: "11122233300044" }),
    )
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
      ),
    )

    expect(state.errors.legalEntityStreet).toEqual(["Requis pour un siège complet"])
    expect(state.errors.legalEntityPostalCode).toBeDefined()
    expect(state.errors.legalEntityCountry).toBeDefined()
    expect(createCompanyRecord).not.toHaveBeenCalled()
  })

  it("rejects a call without a session, before any validation", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(createCompany(initialCompanyFormState, buildFormData())).rejects.toThrow()

    expect(createCompanyRecord).not.toHaveBeenCalled()
  })

  it("rejects a form that submits no type", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData({}, ["SAAS"], { types: [] }),
    )

    expect(state.errors.types).toEqual(["Sélectionne au moins un type"])
    expect(createCompanyRecord).not.toHaveBeenCalled()
  })

  it("forwards the submitted types, zones, relation status, notes and details, with zones sorted into canonical order", async () => {
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

    expect(createCompanyRecord).toHaveBeenCalledWith(
      objectMatch({
        types: ["CLIENT_FINAL", "PARTENAIRE"],
        zones: ["PARIS", "LUXEMBOURG"],
        relationStatus: "DORMANTE",
        notes: "Rencontrée au salon",
        details: "# 🏢 À propos\n\nÉditeur de logiciels.",
      }),
    )
  })

  it("rejects notes longer than 200 characters", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData({ notes: "a".repeat(201) }),
    )

    expect(state.errors.notes).toEqual([
      "Les notes tiennent sur une ligne (200 caractères au plus)",
    ])
    expect(createCompanyRecord).not.toHaveBeenCalled()
  })

  it("stores empty notes and details as null", async () => {
    await createCompany(initialCompanyFormState, buildFormData({ notes: "   ", details: "   " }))

    expect(createCompanyRecord).toHaveBeenCalledWith(objectMatch({ notes: null, details: null }))
  })
})

describe("updateCompany", () => {
  it("forwards the parsed fields to the domain, targeting the company by its id", async () => {
    await updateCompany("c1", initialCompanyFormState, buildFormData())

    expect(updateCompanyRecord).toHaveBeenCalledWith("c1", {
      kind: "fields",
      fields: objectMatch({ slug: "acme", name: "Acme" }),
    })
  })

  it("answers company_not_found and purges the caches, without calling the domain, for an invalid id", async () => {
    const state = await updateCompany("  ", initialCompanyFormState, buildFormData())

    expect(state).toMatchObject({ ok: false, message: "company_not_found" })
    expect(state.values?.name).toBe("Acme")
    expect(updateCompanyRecord).not.toHaveBeenCalled()
    expect(updateTag).toHaveBeenCalledWith("projects")
    expect(updateTag).toHaveBeenCalledWith("legal-entity")
  })

  it("invalidates the projects cache tag after a successful update", async () => {
    await updateCompany("c1", initialCompanyFormState, buildFormData())

    expect(updateTag).toHaveBeenCalledWith("projects")
  })

  it("leaves the company untouched when the payload is invalid", async () => {
    const state = await updateCompany("c1", initialCompanyFormState, buildFormData({ slug: "" }))

    expect(state.errors.slug).toBeDefined()
    expect(updateCompanyRecord).not.toHaveBeenCalled()
  })

  it("rejects a call without a session, before any validation", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(updateCompany("c1", initialCompanyFormState, buildFormData())).rejects.toThrow()

    expect(updateCompanyRecord).not.toHaveBeenCalled()
  })

  it("forwards no CRM or legal entity field the form does not send", async () => {
    await updateCompany("c1", initialCompanyFormState, buildFormData())

    const [, patch] = vi.mocked(updateCompanyRecord).mock.calls[0] ?? []
    expect(patch?.fields).toMatchObject({
      relationStatus: undefined,
      notes: undefined,
      details: undefined,
      legalEntityName: undefined,
    })
  })

  it("forwards an empty zones list when the form submits none", async () => {
    await updateCompany("c1", initialCompanyFormState, buildFormData())

    expect(updateCompanyRecord).toHaveBeenCalledWith("c1", {
      kind: "fields",
      fields: objectMatch({ zones: [] }),
    })
  })

  it("forwards an emptied capital as null", async () => {
    await updateCompany(
      "c1",
      initialCompanyFormState,
      buildFormData(
        withLegalEntity({ legalEntityCapitalAmount: "", legalEntityCapitalCurrency: "EUR" }),
      ),
    )

    expect(updateCompanyRecord).toHaveBeenCalledWith("c1", {
      kind: "fields",
      fields: objectMatch({ legalEntityCapitalAmount: null }),
    })
  })

  it("forwards the VAT liability date and regime", async () => {
    await updateCompany(
      "c1",
      initialCompanyFormState,
      buildFormData(
        withLegalEntity({
          legalEntityVatLiableSince: "2026-01-01",
          legalEntityVatRegime: "REEL_SIMPLIFIE",
          legalEntityVatNumber: "FR00000000000",
        }),
      ),
    )

    expect(updateCompanyRecord).toHaveBeenCalledWith("c1", {
      kind: "fields",
      fields: objectMatch({
        legalEntityVatLiableSince: new Date("2026-01-01"),
        legalEntityVatRegime: "REEL_SIMPLIFIE",
      }),
    })
  })

  it("assigns a slug uniqueness violation to the slug field", async () => {
    vi.mocked(updateCompanyRecord).mockResolvedValueOnce(fail({ code: "slug_taken" }))

    const state = await updateCompany("c1", initialCompanyFormState, buildFormData())

    expect(state.message).toBe("slug_taken")
    expect(state.errors.slug).toBeDefined()
    expect(updateTag).not.toHaveBeenCalled()
  })
})

describe("deleteCompany", () => {
  it("deletes a company that is not referenced by any project", async () => {
    const state = await deleteCompany("c1")

    expect(state.ok).toBe(true)
    expect(updateTag).toHaveBeenCalledWith("projects")
    expect(updateTag).toHaveBeenCalledWith("legal-entity")
  })

  it("deletes the legal entity and its address with the company", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValueOnce({
      legalEntity: { id: "le1", addressId: "a1", publisher: null, _count: { processings: 0 } },
    } as never)

    await deleteCompany("c1")

    expect(prisma.legalEntity.delete).toHaveBeenCalledWith({ where: { id: "le1" } })
    expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: "a1" } })
  })

  it("only detaches a legal entity used as publisher or processor", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValueOnce({
      legalEntity: {
        id: "le1",
        addressId: "a1",
        publisher: { id: "p1" },
        _count: { processings: 0 },
      },
    } as never)

    await deleteCompany("c1")

    expect(prisma.company.delete).toHaveBeenCalled()
    expect(prisma.legalEntity.delete).not.toHaveBeenCalled()
    expect(prisma.address.delete).not.toHaveBeenCalled()
  })

  it("only detaches a legal entity used as processor", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValueOnce({
      legalEntity: {
        id: "le1",
        addressId: "a1",
        publisher: null,
        _count: { processings: 1 },
      },
    } as never)

    await deleteCompany("c1")

    expect(prisma.company.delete).toHaveBeenCalled()
    expect(prisma.legalEntity.delete).not.toHaveBeenCalled()
    expect(prisma.address.delete).not.toHaveBeenCalled()
  })

  it("translates a foreign key violation into an explicit message", async () => {
    vi.mocked(prisma.company.delete).mockRejectedValueOnce(
      constraintViolation("P2003", "Opportunity_clientId_fkey"),
    )

    const state = await deleteCompany("c1")

    expect(state.message).toBe("company_in_use")
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(deleteCompany("c1")).rejects.toThrow()

    expect(prisma.company.delete).not.toHaveBeenCalled()
  })
})

describe("company deleted since the screen loaded", () => {
  it("answers an update with company_not_found, keeps the typed values and purges the caches", async () => {
    vi.mocked(updateCompanyRecord).mockResolvedValueOnce(fail({ code: "not_found" }))

    const state = await updateCompany("c1", initialCompanyFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.message).toBe("company_not_found")
    expect(state.values?.name).toBe("Acme")
    expect(updateTag).toHaveBeenCalledWith("projects")
    expect(updateTag).toHaveBeenCalledWith("legal-entity")
  })

  it("answers an update with unknown_error when the domain throws", async () => {
    vi.mocked(updateCompanyRecord).mockRejectedValueOnce({ code: "P2025" })

    const state = await updateCompany("c1", initialCompanyFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
  })

  it("answers a delete with success", async () => {
    vi.mocked(prisma.company.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.company.count).mockResolvedValueOnce(0)

    const state = await deleteCompany("c1")

    expect(state.ok).toBe(true)
  })

  it("answers a delete with unknown_error when a secondary statement failed and the company remains", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValueOnce({
      legalEntity: { id: "le1", addressId: "a1", publisher: null, _count: { processings: 0 } },
    } as never)
    vi.mocked(prisma.company.delete).mockResolvedValueOnce({} as never)
    vi.mocked(prisma.legalEntity.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.company.count).mockResolvedValueOnce(1)

    const state = await deleteCompany("c1")

    expect(state.message).toBe("unknown_error")
  })
})
