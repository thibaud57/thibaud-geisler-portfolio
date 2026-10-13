import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"

import { extractClientIp, hashIp } from "./server-utils"

describe("extractClientIp", () => {
  it.each([
    ["a single address", "203.0.113.7", "203.0.113.7"],
    ["a proxy chain, keeping the first address", "203.0.113.7, 10.0.0.1, 10.0.0.2", "203.0.113.7"],
    ["surrounding spaces", "  203.0.113.7  , 10.0.0.1", "203.0.113.7"],
    ["a missing header", null, "unknown"],
    ["an empty header", "", "unknown"],
    ["a blank first address", " , 10.0.0.1", "unknown"],
  ])("reads %s", (_label, forwardedFor, expected) => {
    const ip = extractClientIp(forwardedFor)

    expect(ip).toBe(expected)
  })
})

describe("hashIp", () => {
  it("returns 8 hexadecimal characters", () => {
    const hash = hashIp("203.0.113.7")

    expect(hash).toMatch(/^[0-9a-f]{8}$/)
  })

  it("returns the same hash for the same address", () => {
    const hash = hashIp("203.0.113.7")

    const repeated = hashIp("203.0.113.7")

    expect(repeated).toBe(hash)
  })

  it("returns a different hash for another address", () => {
    const hash = hashIp("203.0.113.7")

    const other = hashIp("203.0.113.8")

    expect(other).not.toBe(hash)
  })

  it("salts the hash, so it is not the bare SHA-256 of the address", () => {
    const bare = createHash("sha256").update("203.0.113.7").digest("hex").slice(0, 8)

    const hash = hashIp("203.0.113.7")

    expect(hash).not.toBe(bare)
  })
})
