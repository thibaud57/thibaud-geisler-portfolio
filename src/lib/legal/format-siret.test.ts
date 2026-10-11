import { describe, expect, it } from "vitest"

import { formatSiret } from "./format-siret"

describe("formatSiret", () => {
  it("formate un SIRET valide 14 chiffres avec espaces aux bons emplacements", () => {
    expect(formatSiret("11122233300044")).toBe("111 222 333 00044")
  })

  it("retourne un SIREN 9 chiffres tel quel (pas de match du regex 14 chiffres)", () => {
    expect(formatSiret("111222333")).toBe("111222333")
  })

  it("retourne une chaîne vide telle quelle", () => {
    expect(formatSiret("")).toBe("")
  })

  it("retourne une chaîne non numérique telle quelle (graceful fallback)", () => {
    expect(formatSiret("abc")).toBe("abc")
  })

  it("retourne un SIRET déjà formatté tel quel (idempotence regex stricte sur 14 chiffres consécutifs)", () => {
    expect(formatSiret("111 222 333 00044")).toBe("111 222 333 00044")
  })
})
