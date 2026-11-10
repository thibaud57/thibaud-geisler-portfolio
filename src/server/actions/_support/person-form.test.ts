import { describe, expect, it } from "vitest"

import type { ConflictField, PersonConflict, PersonRole } from "@/server/crm/person-guards"

import {
  conflictErrors,
  CONTACT_CREATE_WORDING,
  CONTACT_WORDING,
  CORRESPONDENT_WORDING,
  LEAD_WORDING,
  personConflictMessage,
} from "./person-form"

const exists = (field: ConflictField, roles: Record<PersonRole, boolean>): PersonConflict => ({
  reason: "exists",
  field,
  personName: "Jane Doe",
  roles,
})

describe("personConflictMessage", () => {
  it.each([
    [
      "a lead duplicating a lead",
      LEAD_WORDING,
      exists("email", { lead: true, contact: false }),
      "Ce lead existe déjà : Jane Doe",
    ],
    [
      "a lead form hitting a contact",
      LEAD_WORDING,
      exists("email", { lead: false, contact: true }),
      "Cette personne est déjà un contact : Jane Doe",
    ],
    [
      "a contact form hitting a lead",
      CONTACT_WORDING,
      exists("email", { lead: true, contact: false }),
      "Cette personne est déjà un lead : Jane Doe",
    ],
    [
      "a contact creation hitting a lead",
      CONTACT_CREATE_WORDING,
      exists("email", { lead: true, contact: false }),
      "Cette personne est déjà un lead : Jane Doe, choisissez-la « Depuis un lead »",
    ],
    [
      "a correspondent hitting a lead",
      CORRESPONDENT_WORDING,
      exists("linkedinUrl", { lead: true, contact: false }),
      "Cette personne est déjà un lead : Jane Doe, choisissez-la parmi les correspondants existants",
    ],
    [
      "an already attached contact",
      CONTACT_WORDING,
      exists("personId", { lead: true, contact: true }),
      "Ce contact existe déjà : Jane Doe",
    ],
    [
      "a person without known role",
      undefined,
      exists("email", { lead: false, contact: false }),
      "Cette personne existe déjà : Jane Doe",
    ],
    [
      "an opted-out person",
      LEAD_WORDING,
      { reason: "opted_out", field: "email", optedOutAt: new Date("2026-02-02T10:00:00Z") },
      "Cette personne s'est opposée à la prospection le 02/02/2026",
    ],
    [
      "a missing person",
      undefined,
      { reason: "person_missing", field: "personId" },
      "Cette personne n'existe plus, recharge la page",
    ],
    [
      "a person who is not a lead",
      undefined,
      { reason: "not_a_lead", field: "personId" },
      "Cette personne n'est pas un lead",
    ],
    [
      "a person without lead role",
      undefined,
      { reason: "no_lead_role", field: "personId" },
      "Cette personne n'a pas de fiche lead",
    ],
  ] satisfies [string, Parameters<typeof personConflictMessage>[1], PersonConflict, string][])(
    "renders %s",
    (_label, wording, conflict, expected) => {
      expect(personConflictMessage(conflict, wording)).toBe(expected)
    },
  )
})

describe("conflictErrors", () => {
  it("files the message under the field of the conflict", () => {
    const conflict = exists("linkedinUrl", { lead: true, contact: false })

    expect(conflictErrors(conflict, LEAD_WORDING)).toEqual({
      linkedinUrl: ["Ce lead existe déjà : Jane Doe"],
    })
  })
})
