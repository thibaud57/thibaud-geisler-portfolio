import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest"

import type { Prisma } from "@/generated/prisma/client"
import { interviewIdSchema, opportunityIdSchema, personIdSchema } from "@/lib/ids"
import {
  idOf,
  OPTED_OUT_AT,
  prisma,
  rejectNextTransactionWrite,
  resetDatabase,
  seedEsn,
  seedOpportunity,
  seedPerson,
} from "@/lib/prisma-test-setup"
import { findInterviewsPage } from "@/server/queries/interviews"

import {
  createInterview,
  updateInterview,
  type InterviewPatch,
  type InterviewWriteData,
} from "./interviews"

const MEETING = new Date("2026-11-20T10:00:00Z")
const UNKNOWN_INTERVIEW = interviewIdSchema.parse("missing-interview")

async function seedOpportunityWithEsn() {
  const esn = await seedEsn()
  return seedOpportunity({ intermediaryId: esn.id })
}

function interviewData(
  opportunityId: InterviewWriteData["opportunityId"],
  overrides: Partial<InterviewWriteData> = {},
): InterviewWriteData {
  return {
    opportunityId,
    side: "CLIENT_FINAL",
    correspondentIds: [],
    type: "TECHNIQUE",
    format: null,
    status: "PLANIFIE",
    outcome: null,
    scheduledAt: MEETING,
    score: null,
    decision: null,
    notes: null,
    details: null,
    ...overrides,
  }
}

function newCorrespondent(
  overrides: Partial<NonNullable<InterviewWriteData["newCorrespondents"]>[number]> = {},
): NonNullable<InterviewWriteData["newCorrespondents"]>[number] {
  return {
    name: "Sami Bernard",
    jobRole: null,
    zone: null,
    email: "sami@example.com",
    phone: null,
    linkedinUrl: null,
    metAt: null,
    notes: null,
    details: null,
    companyId: null,
    contactType: "COMMERCIAL",
    ...overrides,
  }
}

async function seedInterview(
  opportunityId: string,
  data: Partial<Prisma.InterviewUncheckedCreateInput> = {},
) {
  const row = await prisma.interview.create({
    data: { opportunityId, side: "CLIENT_FINAL", type: "TECHNIQUE", scheduledAt: MEETING, ...data },
  })
  return interviewIdSchema.parse(row.id)
}

const correspondentIdsOf = async (id: string): Promise<string[]> =>
  (
    await prisma.interview.findUniqueOrThrow({
      where: { id },
      select: { correspondents: { select: { id: true }, orderBy: { id: "asc" } } },
    })
  ).correspondents.map((person) => person.id)

beforeEach(async () => {
  await resetDatabase()
})

describe("createInterview", () => {
  it("creates an interview with its correspondents and returns its id", async () => {
    const opportunityId = await seedOpportunity()
    const jane = await seedPerson({ name: "Jane Doe" }, { lead: false, contact: true })

    const result = await createInterview(
      interviewData(opportunityId, { correspondentIds: [idOf(jane)], score: 7 }),
    )

    const stored = await prisma.interview.findFirstOrThrow()
    expect(result).toEqual({ ok: true, value: { id: stored.id } })
    expect(stored).toMatchObject({ opportunityId, type: "TECHNIQUE", score: 7 })
    expect(await correspondentIdsOf(stored.id)).toEqual([jane.id])
  })

  it("rejects an ESN-side interview on an opportunity without intermediary", async () => {
    const withoutEsn = await seedOpportunity()
    const withEsn = await seedOpportunityWithEsn()

    const refused = await createInterview(interviewData(withoutEsn, { side: "ESN" }))
    const accepted = await createInterview(interviewData(withEsn, { side: "ESN" }))

    expect(refused).toEqual({ ok: false, error: { code: "opportunity_without_intermediary" } })
    expect(accepted.ok).toBe(true)
    expect(await prisma.interview.count()).toBe(1)
  })

  it("rejects an unknown opportunity", async () => {
    const result = await createInterview(
      interviewData(opportunityIdSchema.parse("missing-opportunity")),
    )

    expect(result).toEqual({ ok: false, error: { code: "opportunity_not_found" } })
  })

  it("rejects an unknown or opted-out correspondent", async () => {
    const opportunityId = await seedOpportunity()
    const optedOut = await seedPerson(
      { name: null, optedOutAt: OPTED_OUT_AT },
      { lead: false, contact: true },
    )
    const unknown = personIdSchema.parse("missing-person")

    const withUnknown = await createInterview(
      interviewData(opportunityId, { correspondentIds: [unknown] }),
    )
    const withOptedOut = await createInterview(
      interviewData(opportunityId, { correspondentIds: [idOf(optedOut)] }),
    )

    const expected = { ok: false, error: { code: "correspondent_not_found" } }
    expect(withUnknown).toEqual(expected)
    expect(withOptedOut).toEqual(expected)
    expect(await prisma.interview.count()).toBe(0)
  })

  it("returns correspondent_exists with roles or the opt-out date", async () => {
    const opportunityId = await seedOpportunity()
    await seedPerson(
      { name: "Sami Bernard", email: "sami@example.com" },
      { lead: false, contact: true },
    )
    await seedPerson({ name: null, email: "ghost@example.com", optedOutAt: OPTED_OUT_AT })

    const existing = await createInterview(
      interviewData(opportunityId, { newCorrespondents: [newCorrespondent()] }),
    )
    const optedOut = await createInterview(
      interviewData(opportunityId, {
        newCorrespondents: [newCorrespondent({ name: "Ghost", email: "ghost@example.com" })],
      }),
    )

    expect(existing).toEqual({
      ok: false,
      error: {
        code: "correspondent_exists",
        conflict: {
          reason: "exists",
          field: "email",
          personName: "Sami Bernard",
          roles: { lead: false, contact: true },
        },
      },
    })
    expect(optedOut).toEqual({
      ok: false,
      error: {
        code: "correspondent_exists",
        conflict: { reason: "opted_out", field: "email", optedOutAt: OPTED_OUT_AT },
      },
    })
    expect(await prisma.interview.count()).toBe(0)
    expect(await prisma.person.count()).toBe(2)
  })

  it("creates a Contact-role person for a new correspondent and links it", async () => {
    const opportunityId = await seedOpportunity()

    const result = await createInterview(
      interviewData(opportunityId, { newCorrespondents: [newCorrespondent()] }),
    )

    const created = await prisma.person.findFirstOrThrow({
      where: { email: "sami@example.com" },
      include: { contact: true },
    })
    expect(result.ok).toBe(true)
    expect(created.contact).toMatchObject({ types: ["COMMERCIAL"], status: "ACTIF" })
    expect(await correspondentIdsOf((await prisma.interview.findFirstOrThrow()).id)).toEqual([
      created.id,
    ])
  })

  it.each([
    ["PLANIFIE", null],
    ["ANNULE", null],
    ["FAIT", "POSITIF"],
  ] as const)("clears outcome when status is not FAIT (%s)", async (status, expected) => {
    const opportunityId = await seedOpportunity()

    await createInterview(interviewData(opportunityId, { status, outcome: "POSITIF" }))

    expect(await prisma.interview.findFirstOrThrow()).toMatchObject({ outcome: expected })
  })
})

describe("updateInterview", () => {
  it("keeps an opted-out correspondent already linked to the interview on update", async () => {
    const opportunityId = await seedOpportunity()
    const linked = await seedPerson({ name: "Jane Doe" }, { lead: false, contact: true })
    const id = await seedInterview(opportunityId, {
      correspondents: { connect: [{ id: linked.id }] },
    })
    await prisma.person.update({
      where: { id: linked.id },
      data: { name: null, optedOutAt: OPTED_OUT_AT },
    })
    const other = await seedPerson(
      { name: null, email: "ghost@example.com", optedOutAt: OPTED_OUT_AT },
      { lead: false, contact: true },
    )

    const same = await updateInterview(id, { correspondentIds: [idOf(linked)], notes: "À revoir" })
    const added = await updateInterview(id, { correspondentIds: [idOf(linked), idOf(other)] })

    expect(same).toEqual({ ok: true, value: { id } })
    expect(added).toEqual({ ok: false, error: { code: "correspondent_not_found" } })
    expect(await correspondentIdsOf(id)).toEqual([linked.id])
  })

  it("keeps correspondentIds when absent and replaces them when present", async () => {
    const opportunityId = await seedOpportunity()
    const jane = await seedPerson({ name: "Jane Doe" }, { lead: false, contact: true })
    const john = await seedPerson(
      { name: "John Roe", email: "john@example.com" },
      { lead: false, contact: true },
    )
    const id = await seedInterview(opportunityId, {
      correspondents: { connect: [{ id: jane.id }] },
    })

    await updateInterview(id, { notes: "Sans changement de liste" })
    const kept = await correspondentIdsOf(id)
    await updateInterview(id, { correspondentIds: [idOf(john)] })
    const replaced = await correspondentIdsOf(id)
    await updateInterview(id, { correspondentIds: [] })
    const emptied = await correspondentIdsOf(id)

    expect(kept).toEqual([jane.id])
    expect(replaced).toEqual([john.id])
    expect(emptied).toEqual([])
  })

  it("rejects a side ESN patch against the stored opportunity", async () => {
    const opportunityId = await seedOpportunity()
    const id = await seedInterview(opportunityId, { notes: "Avant" })

    const result = await updateInterview(id, { side: "ESN" })

    expect(result).toEqual({ ok: false, error: { code: "opportunity_without_intermediary" } })
    expect(await prisma.interview.findUniqueOrThrow({ where: { id } })).toMatchObject({
      side: "CLIENT_FINAL",
    })
  })

  it("checks the effective opportunity when only opportunityId changes", async () => {
    const withEsn = await seedOpportunityWithEsn()
    const withoutEsn = await seedOpportunity({ title: "Sans ESN" })
    const id = await seedInterview(withEsn, { side: "ESN" })

    const moved = await updateInterview(id, { opportunityId: withoutEsn })

    expect(moved).toEqual({ ok: false, error: { code: "opportunity_without_intermediary" } })
  })

  it("does not recheck the side of an interview when the patch leaves it alone", async () => {
    const opportunityId = await seedOpportunity()
    const id = await seedInterview(opportunityId, { side: "ESN" })

    const result = await updateInterview(id, { notes: "Fait passé" })

    expect(result.ok).toBe(true)
  })

  it("clears outcome when status is not FAIT, also from the stored status", async () => {
    const opportunityId = await seedOpportunity()
    const id = await seedInterview(opportunityId, { status: "FAIT", outcome: "POSITIF" })

    await updateInterview(id, { notes: "Outcome inchangé" })
    const unchanged = await prisma.interview.findUniqueOrThrow({ where: { id } })
    await updateInterview(id, { status: "ANNULE" })
    const cancelled = await prisma.interview.findUniqueOrThrow({ where: { id } })
    await updateInterview(id, { outcome: "NEGATIF" })
    const stillCancelled = await prisma.interview.findUniqueOrThrow({ where: { id } })

    expect(unchanged.outcome).toBe("POSITIF")
    expect(cancelled.outcome).toBeNull()
    expect(stillCancelled.outcome).toBeNull()
  })

  it("leaves the stored outcome alone when the patch touches neither status nor outcome", async () => {
    const opportunityId = await seedOpportunity()
    const id = await seedInterview(opportunityId, { status: "ANNULE", outcome: "POSITIF" })

    await updateInterview(id, { notes: "Outcome inchangé" })

    expect(await prisma.interview.findUniqueOrThrow({ where: { id } })).toMatchObject({
      outcome: "POSITIF",
    })
  })

  it("replaces a details section and reports an unknown interview, missing Details and section", async () => {
    const opportunityId = await seedOpportunity()
    const withDetails = await seedInterview(opportunityId, {
      details: "# 🎯 Objectifs\n\nAncien\n\n# ➡️ Suite\n\nx\n",
    })
    const withoutDetails = await seedInterview(opportunityId)
    const patch = (heading: string): InterviewPatch => ({
      detailsSection: { heading, content: "Nouveau" },
    })

    const replaced = await updateInterview(withDetails, patch("Objectifs"))
    const noSection = await updateInterview(withDetails, patch("Absente"))
    const noDetails = await updateInterview(withoutDetails, patch("Objectifs"))
    const unknown = await updateInterview(UNKNOWN_INTERVIEW, { notes: "x" })

    expect(replaced.ok).toBe(true)
    expect((await prisma.interview.findUniqueOrThrow({ where: { id: withDetails } })).details).toBe(
      "# 🎯 Objectifs\n\nNouveau\n\n# ➡️ Suite\n\nx\n",
    )
    expect(noSection).toEqual({
      ok: false,
      error: { code: "section_not_found", headings: ["🎯 Objectifs", "➡️ Suite"] },
    })
    expect(noDetails).toEqual({ ok: false, error: { code: "no_details" } })
    expect(unknown).toEqual({ ok: false, error: { code: "not_found" } })
  })
})

describe("updateInterview with new correspondents", () => {
  it("creates them and replaces the list with the ids and the new ones when correspondentIds is present", async () => {
    const opportunityId = await seedOpportunity()
    const jane = await seedPerson({ name: "Jane Doe" }, { lead: false, contact: true })
    const john = await seedPerson(
      { name: "John Roe", email: "john@example.com" },
      { lead: false, contact: true },
    )
    const id = await seedInterview(opportunityId, {
      correspondents: { connect: [{ id: jane.id }] },
    })

    const result = await updateInterview(id, {
      correspondentIds: [idOf(john)],
      newCorrespondents: [newCorrespondent()],
    })

    const sami = await prisma.person.findFirstOrThrow({ where: { email: "sami@example.com" } })
    expect(result.ok).toBe(true)
    expect(await correspondentIdsOf(id)).toEqual([john.id, sami.id].sort())
  })

  it("adds them to the current list when correspondentIds is absent", async () => {
    const opportunityId = await seedOpportunity()
    const jane = await seedPerson({ name: "Jane Doe" }, { lead: false, contact: true })
    const id = await seedInterview(opportunityId, {
      correspondents: { connect: [{ id: jane.id }] },
    })

    const result = await updateInterview(id, { newCorrespondents: [newCorrespondent()] })

    const sami = await prisma.person.findFirstOrThrow({ where: { email: "sami@example.com" } })
    expect(result.ok).toBe(true)
    expect(await correspondentIdsOf(id)).toEqual([jane.id, sami.id].sort())
  })

  it("returns correspondent_exists and writes nothing when a new correspondent is already known", async () => {
    const opportunityId = await seedOpportunity()
    const jane = await seedPerson({ name: "Jane Doe" }, { lead: false, contact: true })
    await seedPerson(
      { name: "Sami Bernard", email: "sami@example.com" },
      { lead: false, contact: true },
    )
    const id = await seedInterview(opportunityId, {
      correspondents: { connect: [{ id: jane.id }] },
    })

    const result = await updateInterview(id, {
      notes: "Ne doit pas être écrit",
      correspondentIds: [],
      newCorrespondents: [newCorrespondent()],
    })

    expect(result).toEqual({
      ok: false,
      error: {
        code: "correspondent_exists",
        conflict: {
          reason: "exists",
          field: "email",
          personName: "Sami Bernard",
          roles: { lead: false, contact: true },
        },
      },
    })
    expect(await correspondentIdsOf(id)).toEqual([jane.id])
    expect(await prisma.interview.findUniqueOrThrow({ where: { id } })).toMatchObject({
      notes: null,
    })
  })
})

describe("updateInterview when the write reports a missing record", () => {
  const P2025 = { code: "P2025" }

  it("rethrows the error when the interview still exists", async () => {
    const id = await seedInterview(await seedOpportunity())
    rejectNextTransactionWrite("interview", P2025, "update")

    const result = updateInterview(id, { notes: "x" })

    await expect(result).rejects.toBe(P2025)
  })

  it("answers not_found when the interview vanished since it was read", async () => {
    const id = await seedInterview(await seedOpportunity())
    rejectNextTransactionWrite("interview", P2025, "update")
    const count = vi.spyOn(prisma.interview, "count").mockResolvedValueOnce(0)
    onTestFinished(() => {
      count.mockRestore()
    })

    const result = await updateInterview(id, { notes: "x" })

    expect(result).toEqual({ ok: false, error: { code: "not_found" } })
  })
})

describe("interview numbering", () => {
  it("numbers interviews over the whole opportunity, before any filter", async () => {
    const opportunityId = await seedOpportunity()
    const at = (day: number) => new Date(`2026-11-${day}T10:00:00Z`)
    await seedInterview(opportunityId, { scheduledAt: at(10) })
    await seedInterview(opportunityId, { scheduledAt: at(12) })
    const third = await seedInterview(opportunityId, { scheduledAt: at(14) })

    const filtered = await findInterviewsPage({
      where: { id: third },
      orderBy: [{ scheduledAt: "asc" }],
      take: 20,
      skip: 0,
    })

    expect(filtered.total).toBe(1)
    expect(filtered.rows.map((row) => [row.id, row.number])).toEqual([[third, 3]])
  })
})
