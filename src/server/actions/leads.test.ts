import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => {
  const prisma = {
    person: { deleteMany: vi.fn() },
    lead: { delete: vi.fn(), count: vi.fn() },
    signal: { deleteMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  )
  return { prisma }
})
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/server/crm/leads", () => ({ createLead: vi.fn(), updateLead: vi.fn() }))

import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/get-current-user"
import { personIdSchema } from "@/lib/ids"
import { objectMatch } from "@/lib/matchers-test-setup"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/none-value"
import { createLead as createLeadRecord, updateLead as updateLeadRecord } from "@/server/crm/leads"
import type { PersonFieldsError } from "@/server/crm/person-write"
import { fail, ok } from "@/server/crm/result"

import { createLead, deleteLead, updateLead } from "./leads"
import { initialLeadFormState } from "./leads.types"

const BASE_FIELDS = {
  name: "Jane Doe",
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

const existsConflict = (roles: { lead: boolean; contact: boolean }): PersonFieldsError => ({
  code: "person_conflict",
  conflict: { reason: "exists", field: "email", personName: "John Roe", roles },
})

beforeEach(() => {
  vi.mocked(createLeadRecord).mockResolvedValue(ok({ personId: "p1" }))
  vi.mocked(updateLeadRecord).mockResolvedValue(ok({ personId: "p1" }))
  vi.mocked(prisma.lead.delete).mockResolvedValue({ personId: "p1" } as never)
  vi.mocked(prisma.person.deleteMany).mockResolvedValue({ count: 1 })
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }] as never)
})

it.each([
  ["createLead", () => createLead(initialLeadFormState, buildFormData())],
  ["updateLead", () => updateLead("p1", initialLeadFormState, buildFormData())],
  ["deleteLead", () => deleteLead("p1")],
])("%s rejects a call without a session, before touching the database", async (_name, call) => {
  vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

  const result = call()

  await expect(result).rejects.toThrow()
  expect(prisma.$transaction).not.toHaveBeenCalled()
  expect(createLeadRecord).not.toHaveBeenCalled()
  expect(updateLeadRecord).not.toHaveBeenCalled()
  expect(prisma.lead.delete).not.toHaveBeenCalled()
})

describe("createLead", () => {
  it("rejects a score outside 0 to 10", async () => {
    const state = await createLead(initialLeadFormState, buildFormData({ score: "11" }))

    expect(state.errors.score).toEqual(["Le score est un entier de 0 à 10"])
    expect(createLeadRecord).not.toHaveBeenCalled()
  })

  it("rejects notes longer than 200 characters", async () => {
    const state = await createLead(initialLeadFormState, buildFormData({ notes: "a".repeat(201) }))

    expect(state.errors.notes).toEqual([
      "Les notes tiennent sur une ligne (200 caractères au plus)",
    ])
    expect(createLeadRecord).not.toHaveBeenCalled()
  })

  it("lowercases the email and normalizes the LinkedIn URL before saving", async () => {
    await createLead(
      initialLeadFormState,
      buildFormData({
        email: " Jane.Doe@Example.COM ",
        linkedinUrl: "fr.linkedin.com/in/Jane-Doe-7e91d3/",
      }),
    )

    expect(createLeadRecord).toHaveBeenCalledWith(
      objectMatch({
        email: "jane.doe@example.com",
        linkedinUrl: "https://www.linkedin.com/in/jane-doe-7e91d3",
      }),
    )
  })

  it('stores the "aucun" sentinel as null for interest, channel, job role and company', async () => {
    await createLead(initialLeadFormState, buildFormData())

    expect(createLeadRecord).toHaveBeenCalledWith(
      objectMatch({ interest: null, channel: null, jobRole: null, companyId: null }),
    )
  })

  it("answers ok and refreshes the lists after the domain wrote the lead", async () => {
    const state = await createLead(initialLeadFormState, buildFormData())

    expect(state.ok).toBe(true)
    expect(revalidatePath).toHaveBeenCalled()
  })

  it("refuses an email already used by another lead, naming it", async () => {
    vi.mocked(createLeadRecord).mockResolvedValue(
      fail(existsConflict({ lead: true, contact: false })),
    )

    const state = await createLead(initialLeadFormState, buildFormData())

    expect(state.message).toBe("lead_exists")
    expect(state.errors.email).toEqual(["Ce lead existe déjà : John Roe"])
  })

  it("tells that the person is already a contact when only the contact role exists", async () => {
    vi.mocked(createLeadRecord).mockResolvedValue(
      fail(existsConflict({ lead: false, contact: true })),
    )

    const state = await createLead(initialLeadFormState, buildFormData())

    expect(state.message).toBe("lead_exists")
    expect(state.errors.email).toEqual(["Cette personne est déjà un contact : John Roe"])
  })

  it("refuses a person who opted out, giving the date", async () => {
    vi.mocked(createLeadRecord).mockResolvedValue(
      fail({
        code: "person_conflict",
        conflict: {
          reason: "opted_out",
          field: "linkedinUrl",
          optedOutAt: new Date("2026-03-11T23:30:00Z"),
        },
      }),
    )

    const state = await createLead(initialLeadFormState, buildFormData())

    expect(state.message).toBe("lead_opted_out")
    expect(state.errors.linkedinUrl).toEqual([
      "Cette personne s'est opposée à la prospection le 12/03/2026",
    ])
  })

  it.each(["email", "linkedinUrl"] as const)(
    "maps a concurrent uniqueness violation on %s to the duplicate message",
    async (field) => {
      vi.mocked(createLeadRecord).mockResolvedValue(fail({ code: "identity_taken", field }))

      const state = await createLead(initialLeadFormState, buildFormData())

      expect(state.message).toBe("lead_exists")
      expect(state.errors[field]).toEqual(["Cette personne existe déjà"])
    },
  )

  it("maps a missing company to the company field and keeps the cache", async () => {
    vi.mocked(createLeadRecord).mockResolvedValue(fail({ code: "company_not_found" }))

    const state = await createLead(initialLeadFormState, buildFormData({ companyId: "c-missing" }))

    expect(state.message).toBe("company_not_found")
    expect(state.errors.companyId).toBeDefined()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("reports an unknown error when the domain throws", async () => {
    vi.mocked(createLeadRecord).mockRejectedValueOnce(new Error("boom"))

    const state = await createLead(initialLeadFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
  })
})

describe("updateLead", () => {
  it("hands the person id and the parsed fields to the domain", async () => {
    await updateLead("p1", initialLeadFormState, buildFormData({ email: "Jane.Doe@Example.com" }))

    expect(updateLeadRecord).toHaveBeenCalledWith(
      personIdSchema.parse("p1"),
      objectMatch({ email: "jane.doe@example.com", name: "Jane Doe" }),
    )
  })

  it("reports the lock when the person opposed since the page loaded", async () => {
    vi.mocked(updateLeadRecord).mockResolvedValue(fail({ code: "person_locked" }))

    const state = await updateLead("p1", initialLeadFormState, buildFormData())

    expect(state.message).toBe("lead_opted_out_locked")
  })

  it("reports a lead deleted since the page loaded and realigns the lists", async () => {
    vi.mocked(updateLeadRecord).mockResolvedValue(fail({ code: "not_found" }))

    const state = await updateLead("p1", initialLeadFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.message).toBe("lead_not_found")
    expect(revalidatePath).toHaveBeenCalled()
  })

  it("answers lead_not_found for an empty person id, without writing", async () => {
    const state = await updateLead("", initialLeadFormState, buildFormData())

    expect(state.message).toBe("lead_not_found")
    expect(updateLeadRecord).not.toHaveBeenCalled()
  })

  it("reports an unknown error when the domain throws", async () => {
    vi.mocked(updateLeadRecord).mockRejectedValueOnce(new Error("boom"))

    const state = await updateLead("p1", initialLeadFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
  })
})

describe("deleteLead", () => {
  it("deletes the person through one conditional statement that spares any other role", async () => {
    await deleteLead("p1")

    expect(prisma.lead.delete).toHaveBeenCalledWith({ where: { personId: "p1" } })
    expect(prisma.person.deleteMany).toHaveBeenCalledWith({
      where: { id: "p1", lead: { is: null }, contact: { is: null } },
    })
  })

  it("deletes the person's signals with the lead role", async () => {
    await deleteLead("p1")

    expect(prisma.signal.deleteMany).toHaveBeenCalledWith({ where: { personId: "p1" } })
  })

  it("treats a lead already deleted elsewhere as deleted, without touching the person", async () => {
    vi.mocked(prisma.lead.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.lead.count).mockResolvedValueOnce(0)

    const state = await deleteLead("p1")

    expect(state.ok).toBe(true)
    expect(prisma.person.deleteMany).not.toHaveBeenCalled()
  })

  it("reports an unknown error when a P2025 comes while the lead still exists", async () => {
    vi.mocked(prisma.lead.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.lead.count).mockResolvedValueOnce(1)

    const state = await deleteLead("p1")

    expect(state.message).toBe("unknown_error")
  })

  it("refuses to delete an opted-out lead before the end of its three years", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ optedOutAt: new Date() }] as never)

    const state = await deleteLead("p1")

    expect(state.message).toBe("lead_opted_out_locked")
    expect(prisma.lead.delete).not.toHaveBeenCalled()
    expect(prisma.person.deleteMany).not.toHaveBeenCalled()
  })

  it("deletes an opted-out lead once its three years are over", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ optedOutAt: new Date(2020, 0, 15) }] as never)

    const state = await deleteLead("p1")

    expect(state.ok).toBe(true)
    expect(prisma.lead.delete).toHaveBeenCalledWith({ where: { personId: "p1" } })
    expect(prisma.person.deleteMany).toHaveBeenCalled()
  })
})
