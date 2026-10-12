import { describe, expect, it } from "vitest"

import { isFrenchLayout, registrationLabel } from "@/lib/crm/legal-entities"

const SIRET = "12345678901234"

function entity(overrides: Partial<Parameters<typeof registrationLabel>[0]> = {}) {
  return {
    siret: SIRET,
    rcsCity: "Paris",
    rcsNumber: null,
    address: { country: "FR" },
    ...overrides,
  }
}

describe("isFrenchLayout", () => {
  it.each([[undefined], [null], ["FR"]])("treats %j as France", (country) => {
    expect(isFrenchLayout(country)).toBe(true)
  })

  it.each([["LU"], [""]])("keeps %j apart", (country) => {
    expect(isFrenchLayout(country)).toBe(false)
  })
})

describe("registrationLabel", () => {
  it("joins the RCS city and the SIREN in France", () => {
    expect(registrationLabel(entity())).toBe("RCS Paris 123456789")
  })

  it("falls back to the RCS city when the SIREN is missing in France", () => {
    expect(registrationLabel(entity({ siret: null }))).toBe("RCS Paris")
  })

  it("stays empty in France without a RCS city", () => {
    expect(registrationLabel(entity({ rcsCity: null }))).toBeNull()
  })

  it("treats a missing address as France", () => {
    expect(registrationLabel(entity({ address: null }))).toBe("RCS Paris 123456789")
  })

  it("joins the RCS city and number outside France", () => {
    expect(
      registrationLabel(
        entity({ address: { country: "LU" }, rcsNumber: "B123456", rcsCity: "Luxembourg" }),
      ),
    ).toBe("Luxembourg B123456")
  })
})
