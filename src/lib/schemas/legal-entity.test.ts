import { describe, expect, it } from "vitest"
import { z } from "zod"

import { legalEntityFields, refineLegalEntity } from "./legal-entity"

const schema = z.object(legalEntityFields).superRefine(refineLegalEntity)

function parse(overrides: Record<string, string> = {}) {
  return schema.safeParse({
    legalEntityName: "Acme SAS",
    legalEntityStreet: "11 rue Gouvy",
    legalEntityPostalCode: "57000",
    legalEntityCity: "Metz",
    legalEntityCountry: "FR",
    legalEntityVatNumber: "",
    legalEntityVatLiableSince: "",
    legalEntityVatRegime: "",
    ...overrides,
  })
}

describe("refineLegalEntity publisher VAT fields", () => {
  it("accepts a legal entity with neither vat liability date nor regime", () => {
    const result = parse()

    expect(result.success).toBe(true)
  })

  it("requires a vat regime once the liability date is filled", () => {
    const result = parse({ legalEntityVatLiableSince: "2026-01-01" })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.legalEntityVatRegime).toEqual([
        "Choisissez le régime",
      ])
    }
  })

  it("requires a liability date once the vat regime is filled", () => {
    const result = parse({ legalEntityVatRegime: "REEL_SIMPLIFIE" })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.legalEntityVatLiableSince).toEqual([
        "La date d'assujettissement est requise",
      ])
    }
  })

  it("requires a vat number once liable", () => {
    const result = parse({
      legalEntityVatLiableSince: "2026-01-01",
      legalEntityVatRegime: "REEL_SIMPLIFIE",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.legalEntityVatNumber).toEqual([
        "Le numéro de TVA est requis une fois assujetti",
      ])
    }
  })

  it("accepts an entity with liability date, regime and vat number filled together", () => {
    const result = parse({
      legalEntityVatLiableSince: "2026-01-01",
      legalEntityVatRegime: "REEL_SIMPLIFIE",
      legalEntityVatNumber: "FR00000000000",
    })

    expect(result.success).toBe(true)
  })
})

describe("refineLegalEntity filled fields", () => {
  it("treats a capital of zero as a filled entity field", () => {
    const result = parse({
      legalEntityName: "",
      legalEntityStreet: "",
      legalEntityPostalCode: "",
      legalEntityCity: "",
      legalEntityCountry: "",
      legalEntityCapitalAmount: "0",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(Object.keys(z.flattenError(result.error).fieldErrors).sort()).toEqual([
        "legalEntityCity",
        "legalEntityCountry",
        "legalEntityName",
        "legalEntityPostalCode",
        "legalEntityStreet",
      ])
    }
  })
})
