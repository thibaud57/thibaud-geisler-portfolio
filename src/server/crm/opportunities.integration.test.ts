import { beforeEach, describe, expect, it } from "vitest"

import { companyIdSchema, opportunityIdSchema, personIdSchema } from "@/lib/ids"
import {
  companyIdOf,
  OPTED_OUT_AT,
  prisma,
  resetDatabase,
  seedCompany,
  seedEsn,
  seedOpportunity,
  seedPerson,
} from "@/lib/prisma-test-setup"

import { createOpportunity, updateOpportunity, type OpportunityWriteData } from "./opportunities"

function opportunityData(overrides: Partial<OpportunityWriteData> = {}): OpportunityWriteData {
  return {
    title: "Plateforme data",
    role: null,
    status: "PROPOSEE",
    referrerId: null,
    intermediaryId: null,
    clientId: null,
    dailyRate: null,
    contract: null,
    workMode: null,
    daysPerWeek: null,
    onSiteDays: null,
    zone: null,
    startMonth: null,
    durationMonths: null,
    notes: null,
    details: null,
    ...overrides,
  }
}

const UNKNOWN_COMPANY = companyIdSchema.parse("missing-company")
const UNKNOWN_PERSON = personIdSchema.parse("missing-person")
const UNKNOWN_OPPORTUNITY = opportunityIdSchema.parse("missing-opportunity")

beforeEach(async () => {
  await resetDatabase()
})

describe("createOpportunity", () => {
  it("creates an opportunity and returns its id and title", async () => {
    const esn = await seedEsn()

    const result = await createOpportunity(
      opportunityData({ intermediaryId: companyIdOf(esn), dailyRate: 650 }),
    )

    const stored = await prisma.opportunity.findFirstOrThrow()
    expect(result).toEqual({ ok: true, value: { id: stored.id, title: "Plateforme data" } })
    expect(stored).toMatchObject({ intermediaryId: esn.id, dailyRate: 650 })
  })
})

describe("intermediary rule", () => {
  it("rejects a non-ESN intermediary and rechecks it only when it changes", async () => {
    const acme = await seedCompany({ types: ["CLIENT_FINAL"] })
    const other = await seedCompany({ slug: "globex", name: "Globex", types: ["CLIENT_FINAL"] })
    const id = await seedOpportunity({ intermediaryId: acme.id })

    const created = await createOpportunity(opportunityData({ intermediaryId: companyIdOf(acme) }))
    const unchanged = await updateOpportunity(id, {
      intermediaryId: companyIdOf(acme),
      status: "ACCEPTEE",
    })
    const changed = await updateOpportunity(id, { intermediaryId: companyIdOf(other) })

    expect(created).toEqual({ ok: false, error: { code: "intermediary_not_esn" } })
    expect(unchanged.ok).toBe(true)
    expect(changed).toEqual({ ok: false, error: { code: "intermediary_not_esn" } })
    expect(await prisma.opportunity.findUniqueOrThrow({ where: { id } })).toMatchObject({
      intermediaryId: acme.id,
      status: "ACCEPTEE",
    })
  })
})

describe("missing relations", () => {
  it.each([
    [{ referrerId: UNKNOWN_PERSON }, { code: "referrer_not_found", field: "referrerId" }],
    [{ intermediaryId: UNKNOWN_COMPANY }, { code: "company_not_found", field: "intermediaryId" }],
    [{ clientId: UNKNOWN_COMPANY }, { code: "company_not_found", field: "clientId" }],
  ] as const)(
    "maps a missing referrer and a missing company with the failing field (%j)",
    async (data, error) => {
      const person = await seedPerson()
      const id = await seedOpportunity({ referrerId: person.id })

      const created = await createOpportunity(opportunityData(data))
      const updated = await updateOpportunity(id, data)

      expect(created).toEqual({ ok: false, error })
      expect(updated).toEqual({ ok: false, error })
    },
  )
})

describe("opted-out referrer", () => {
  it("rejects an opted-out person as a new referrer and keeps the one already stored", async () => {
    const opposed = await seedPerson({ optedOutAt: OPTED_OUT_AT })
    const id = await seedOpportunity({ referrerId: opposed.id })
    const other = await seedOpportunity({})
    const referrerId = personIdSchema.parse(opposed.id)

    const created = await createOpportunity(opportunityData({ referrerId }))
    const changed = await updateOpportunity(other, { referrerId })
    const unchanged = await updateOpportunity(id, { referrerId, status: "ACCEPTEE" })

    const error = { code: "referrer_not_found", field: "referrerId" }
    expect(created).toEqual({ ok: false, error })
    expect(changed).toEqual({ ok: false, error })
    expect(unchanged.ok).toBe(true)
    expect(await prisma.opportunity.findUniqueOrThrow({ where: { id: other } })).toMatchObject({
      referrerId: null,
    })
  })
})

describe("updateOpportunity", () => {
  it.each([
    ["clientId", "intermediaryId"],
    ["intermediaryId", "clientId"],
  ] as const)("rejects a patch of %s alone that equals the stored %s", async (patched, stored) => {
    const acme = await seedCompany({ types: ["CLIENT_FINAL", "ESN_RECRUTEMENT"] })
    const other = await seedCompany({ slug: "globex", name: "Globex", types: ["ESN_RECRUTEMENT"] })
    const id = await seedOpportunity({ [stored]: acme.id, [patched]: other.id })

    const result = await updateOpportunity(id, { [patched]: companyIdOf(acme) })

    expect(result).toEqual({ ok: false, error: { code: "client_is_intermediary" } })
    expect(await prisma.opportunity.findUniqueOrThrow({ where: { id } })).toMatchObject({
      [patched]: other.id,
    })
  })

  it("rejects onSiteDays above daysPerWeek against the stored value in a patch", async () => {
    const id = await seedOpportunity({ daysPerWeek: 4, onSiteDays: 3 })

    const raisedOnSite = await updateOpportunity(id, { onSiteDays: 5 })
    const loweredDays = await updateOpportunity(id, { daysPerWeek: 2 })
    const consistent = await updateOpportunity(id, { onSiteDays: 4 })

    expect(raisedOnSite).toEqual({ ok: false, error: { code: "days_out_of_range" } })
    expect(loweredDays).toEqual({ ok: false, error: { code: "days_out_of_range" } })
    expect(consistent.ok).toBe(true)
    expect(await prisma.opportunity.findUniqueOrThrow({ where: { id } })).toMatchObject({
      daysPerWeek: 4,
      onSiteDays: 4,
    })
  })

  it("patches partially and replaces a details section", async () => {
    const id = await seedOpportunity({
      role: "Lead data",
      dailyRate: 600,
      details: "# 🎯 Contexte\n\nAncien\n\n# 👤 Profil recherché\n\nSenior\n",
    })

    const fields = await updateOpportunity(id, { dailyRate: 700 })
    const section = await updateOpportunity(id, {
      detailsSection: { heading: "Contexte", content: "Nouveau" },
    })

    expect(fields).toEqual({ ok: true, value: { id, title: "Plateforme data" } })
    expect(section.ok).toBe(true)
    expect(await prisma.opportunity.findUniqueOrThrow({ where: { id } })).toMatchObject({
      role: "Lead data",
      dailyRate: 700,
      details: "# 🎯 Contexte\n\nNouveau\n\n# 👤 Profil recherché\n\nSenior\n",
    })
  })

  it("reports an unknown opportunity, missing Details and an unknown section", async () => {
    const withoutDetails = await seedOpportunity({})
    const withDetails = await seedOpportunity({ details: "# 🎯 Contexte\n\nx\n" })
    const section = { heading: "Absente", content: "x" }

    const unknown = await updateOpportunity(UNKNOWN_OPPORTUNITY, { dailyRate: 700 })
    const noDetails = await updateOpportunity(withoutDetails, { detailsSection: section })
    const noSection = await updateOpportunity(withDetails, { detailsSection: section })

    expect(unknown).toEqual({ ok: false, error: { code: "not_found" } })
    expect(noDetails).toEqual({ ok: false, error: { code: "no_details" } })
    expect(noSection).toEqual({
      ok: false,
      error: { code: "section_not_found", headings: ["🎯 Contexte"] },
    })
  })
})
