import { describe, expect, it } from "vitest"

import { personDetailHref } from "./person-links"

describe("personDetailHref", () => {
  it("resolves to the lead detail route when the person has the lead role", () => {
    const href = personDetailHref({ id: "p1", lead: { personId: "p1" }, contact: null })

    expect(href).toBe("/admin/leads?detail=p1")
  })

  it("resolves to the contact detail route when the person has only the contact role", () => {
    const href = personDetailHref({ id: "p2", lead: null, contact: { personId: "p2" } })

    expect(href).toBe("/admin/contacts?detail=p2")
  })

  it("prefers the lead route when the person has both roles", () => {
    const href = personDetailHref({
      id: "p3",
      lead: { personId: "p3" },
      contact: { personId: "p3" },
    })

    expect(href).toBe("/admin/leads?detail=p3")
  })

  it("returns null when the person has neither role", () => {
    const href = personDetailHref({ id: "p4", lead: null, contact: null })

    expect(href).toBeNull()
  })
})
