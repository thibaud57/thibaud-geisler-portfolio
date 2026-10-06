import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const prisma = {
    person: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    lead: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  )
  return { prisma }
})
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/person"

import { createLead, deleteLead, updateLead } from "./leads"
import { initialLeadFormState } from "./leads.types"

const BASE_FIELDS = {
  name: "Claire Morel",
  jobRole: NONE_VALUE,
  zone: NONE_VALUE,
  companyId: NONE_VALUE,
  email: "",
  phone: "",
  linkedinUrl: "",
  metAt: "",
  notes: "",
  details: "",
  origin: "OUTBOUND",
  status: "NOUVEAU",
  interest: NONE_VALUE,
  channel: NONE_VALUE,
  score: "",
}

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  return data
}

function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

// Forme constatée le 2026-09-19 (Prisma 7 + @prisma/adapter-pg) : l'index vit sous `meta.driverAdapterError.cause.constraint.index`.
function uniqueViolation(index: string) {
  return {
    code: "P2002",
    meta: { driverAdapterError: { cause: { constraint: { index } } } },
  }
}

// `vi.clearAllMocks` n'efface que les appels : remettre ces valeurs à chaque test évite qu'une réponse d'un test précédent fausse le suivant.
beforeEach(() => {
  vi.mocked(prisma.person.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.person.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.person.create).mockResolvedValue({ id: "p1" } as never)
  vi.mocked(prisma.person.update).mockResolvedValue({ id: "p1" } as never)
  vi.mocked(prisma.lead.create).mockResolvedValue({ personId: "p1" } as never)
  vi.mocked(prisma.lead.update).mockResolvedValue({ personId: "p1" } as never)
})

describe("createLead", () => {
  afterEach(() => vi.clearAllMocks())

  it("rejects a missing origin", async () => {
    const state = await createLead(initialLeadFormState, buildFormData({ origin: "" }))

    expect(state.errors.origin).toBeDefined()
    expect(prisma.person.create).not.toHaveBeenCalled()
  })

  it("rejects a missing name", async () => {
    const state = await createLead(initialLeadFormState, buildFormData({ name: "" }))

    expect(state.errors.name).toEqual(["Le nom est requis"])
    expect(prisma.person.create).not.toHaveBeenCalled()
  })

  it("rejects a score outside 0 to 10", async () => {
    const state = await createLead(initialLeadFormState, buildFormData({ score: "11" }))

    expect(state.errors.score).toEqual(["Le score est un entier de 0 à 10"])
  })

  it("rejects notes longer than 200 characters", async () => {
    const state = await createLead(initialLeadFormState, buildFormData({ notes: "a".repeat(201) }))

    expect(state.errors.notes).toEqual([
      "Les notes tiennent sur une ligne (200 caractères au plus)",
    ])
    expect(prisma.person.create).not.toHaveBeenCalled()
  })

  it("lowercases the email and normalizes the LinkedIn URL before saving", async () => {
    await createLead(
      initialLeadFormState,
      buildFormData({
        email: " jeanne.dupont@example.com ",
        linkedinUrl: "fr.linkedin.com/in/jeanne-dupont-4b2a1c/",
      }),
    )

    expect(prisma.person.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          email: "jeanne.dupont@example.com",
          linkedinUrl: "https://www.linkedin.com/in/jeanne-dupont-4b2a1c",
        }),
      }),
    )
  })

  it('stores the "aucun" sentinel as null for interest, channel, job role and company', async () => {
    await createLead(initialLeadFormState, buildFormData())

    expect(prisma.person.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ jobRole: null, companyId: null }) }),
    )
    expect(prisma.lead.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ interest: null, channel: null }) }),
    )
  })

  it("refuses an email or LinkedIn already used by another person, naming it", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue({
      name: "Claire Morel",
      email: "claire@acme.example",
      optedOutAt: null,
    } as never)

    const state = await createLead(
      initialLeadFormState,
      buildFormData({ email: "claire@acme.example" }),
    )

    expect(state.message).toBe("lead_exists")
    expect(state.errors.email).toEqual(["Ce lead existe déjà : Claire Morel"])
    expect(prisma.person.create).not.toHaveBeenCalled()
  })

  it("refuses a person who opted out, giving the date", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue({
      name: null,
      email: null,
      optedOutAt: new Date("2026-03-11T23:30:00Z"),
    } as never)

    const state = await createLead(
      initialLeadFormState,
      buildFormData({ linkedinUrl: "https://www.linkedin.com/in/jeanne-dupont-4b2a1c" }),
    )

    expect(state.message).toBe("lead_opted_out")
    expect(state.errors.linkedinUrl).toEqual([
      "Cette personne s'est opposée à la prospection le 12/03/2026",
    ])
  })

  it("maps a concurrent uniqueness violation to the duplicate message", async () => {
    vi.mocked(prisma.person.create).mockRejectedValue(uniqueViolation("Person_linkedinUrl_key"))

    const state = await createLead(
      initialLeadFormState,
      buildFormData({ linkedinUrl: "https://www.linkedin.com/in/jeanne-dupont-4b2a1c" }),
    )

    expect(state.message).toBe("lead_exists")
    expect(state.errors.linkedinUrl).toEqual(["Ce lead existe déjà"])
  })

  it("maps a missing company to the company field", async () => {
    vi.mocked(prisma.person.create).mockRejectedValue({ code: "P2003" })

    const state = await createLead(initialLeadFormState, buildFormData({ companyId: "c-missing" }))

    expect(state.message).toBe("company_not_found")
    expect(state.errors.companyId).toBeDefined()
  })

  it("looks up an opted-out person first when several persons match", async () => {
    await createLead(
      initialLeadFormState,
      buildFormData({
        email: "claire@acme.example",
        linkedinUrl: "https://www.linkedin.com/in/jeanne-dupont-4b2a1c",
      }),
    )

    expect(prisma.person.findFirst).toHaveBeenCalledWith(
      objectMatch({ orderBy: { optedOutAt: { sort: "desc", nulls: "last" } } }),
    )
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = createLead(initialLeadFormState, buildFormData())

    await expect(result).rejects.toThrow()
    expect(prisma.person.findFirst).not.toHaveBeenCalled()
  })
})

describe("updateLead", () => {
  afterEach(() => vi.clearAllMocks())

  it("ignores the lead being edited when checking duplicates", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: null } as never)

    await updateLead("p1", initialLeadFormState, buildFormData({ email: "claire@acme.example" }))

    expect(prisma.person.findFirst).toHaveBeenCalledWith(
      objectMatch({ where: objectMatch({ NOT: { id: "p1" } }) }),
    )
  })

  it("refuses to update an opted-out lead", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: new Date() } as never)

    const state = await updateLead("p1", initialLeadFormState, buildFormData())

    expect(state.message).toBe("lead_opted_out_locked")
    expect(prisma.person.update).not.toHaveBeenCalled()
    expect(prisma.lead.update).not.toHaveBeenCalled()
  })
})

describe("deleteLead", () => {
  afterEach(() => vi.clearAllMocks())

  it("removes the person along with the lead role", async () => {
    await deleteLead("p1")

    expect(prisma.lead.delete).toHaveBeenCalledWith({ where: { personId: "p1" } })
    expect(prisma.person.delete).toHaveBeenCalledWith({ where: { id: "p1" } })
  })

  it("refuses to delete an opted-out lead, keeping its opposition", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ optedOutAt: new Date() } as never)

    const state = await deleteLead("p1")

    expect(state.message).toBe("lead_opted_out_locked")
    expect(prisma.lead.delete).not.toHaveBeenCalled()
    expect(prisma.person.delete).not.toHaveBeenCalled()
  })
})
