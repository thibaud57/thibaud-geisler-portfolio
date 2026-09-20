import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: { company: { create: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { updateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/get-current-user"
import { NONE_VALUE } from "@/lib/schemas/company"
import { createCompany, deleteCompany } from "./companies"
import { initialCompanyFormState } from "./companies.types"

const BASE_FIELDS = {
  slug: "acme",
  name: "Acme",
  size: NONE_VALUE,
  websiteUrl: "",
  legalEntityId: NONE_VALUE,
}

function buildFormData(
  overrides: Record<string, string> = {},
  sectors: string[] = ["SAAS"],
): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  for (const sector of sectors) data.append("sectors", sector)
  return data
}

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

  it("rejects an empty sectors list", async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({}, []))

    expect(state.errors.sectors).toBeDefined()
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

  it('stores the "aucune" sentinel as null for the legal entity id', async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(initialCompanyFormState, buildFormData({ legalEntityId: NONE_VALUE }))

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ legalEntityId: null }) }),
    )
  })

  it("stores an empty legal entity id as null", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(initialCompanyFormState, buildFormData({ legalEntityId: "" }))

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ legalEntityId: null }) }),
    )
  })

  it("stores an empty website url as null", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(initialCompanyFormState, buildFormData({ websiteUrl: "" }))

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ websiteUrl: null }) }),
    )
  })

  it("returns the submitted values on failure", async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ slug: "" }))

    expect(state.values?.["name"]).toBe("Acme")
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
    expect(state.errors.legalEntityId).toBeUndefined()
  })

  it("assigns a legal entity uniqueness violation to the legal entity field, not the slug", async () => {
    vi.mocked(prisma.company.create).mockRejectedValue(uniqueViolation("Company_legalEntityId_key"))

    const state = await createCompany(initialCompanyFormState, buildFormData())

    expect(state.message).toBe("legal_entity_taken")
    expect(state.errors.legalEntityId).toBeDefined()
    expect(state.errors.slug).toBeUndefined()
  })

  it("rejects a call without a session, before any validation", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(createCompany(initialCompanyFormState, buildFormData())).rejects.toThrow()

    expect(prisma.company.create).not.toHaveBeenCalled()
  })
})

describe("deleteCompany", () => {
  afterEach(() => vi.clearAllMocks())

  it("deletes a company that is not referenced by any project", async () => {
    vi.mocked(prisma.company.delete).mockResolvedValue({} as never)

    const state = await deleteCompany("c1")

    expect(state.ok).toBe(true)
    expect(updateTag).toHaveBeenCalledWith("projects")
  })

  it("translates a foreign key violation into an explicit message", async () => {
    vi.mocked(prisma.company.delete).mockRejectedValue({ code: "P2003" })

    const state = await deleteCompany("c1")

    expect(state.message).toBe("company_in_use")
  })
})
