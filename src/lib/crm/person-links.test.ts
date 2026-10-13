import { describe, expect, it } from "vitest"

import { personDetailHref } from "./person-links"

describe("personDetailHref", () => {
  it.each([
    {
      label: "resolves to the lead detail route when the person has the lead role",
      person: { id: "p1", lead: { personId: "p1" }, contact: null },
      expected: "/admin/leads?detail=p1",
    },
    {
      label: "resolves to the contact detail route when the person has only the contact role",
      person: { id: "p2", lead: null, contact: { personId: "p2" } },
      expected: "/admin/contacts?detail=p2",
    },
    {
      label: "prefers the lead route when the person has both roles",
      person: { id: "p3", lead: { personId: "p3" }, contact: { personId: "p3" } },
      expected: "/admin/leads?detail=p3",
    },
    {
      label: "returns null when the person has neither role",
      person: { id: "p4", lead: null, contact: null },
      expected: null,
    },
  ])("$label", ({ person, expected }) => {
    const href = personDetailHref(person)

    expect(href).toBe(expected)
  })
})
