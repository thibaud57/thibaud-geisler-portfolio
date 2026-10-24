import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"

import { extractClientIp, hashIp, violatedConstraint } from "./server-utils"

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
  const SALT = "test-salt"

  it("returns 8 hexadecimal characters", () => {
    const hash = hashIp("203.0.113.7", SALT)

    expect(hash).toMatch(/^[0-9a-f]{8}$/)
  })

  it("returns the same hash for the same address", () => {
    const hash = hashIp("203.0.113.7", SALT)

    const repeated = hashIp("203.0.113.7", SALT)

    expect(repeated).toBe(hash)
  })

  it("returns a different hash for another address", () => {
    const hash = hashIp("203.0.113.7", SALT)

    const other = hashIp("203.0.113.8", SALT)

    expect(other).not.toBe(hash)
  })

  it("returns a different hash for another salt", () => {
    const hash = hashIp("203.0.113.7", SALT)

    const other = hashIp("203.0.113.7", "other-salt")

    expect(other).not.toBe(hash)
  })

  it("salts the hash, so it is not the bare SHA-256 of the address", () => {
    const bare = createHash("sha256").update("203.0.113.7").digest("hex").slice(0, 8)

    const hash = hashIp("203.0.113.7", SALT)

    expect(hash).not.toBe(bare)
  })
})

describe("violatedConstraint", () => {
  it.each([
    [
      "the driver adapter index",
      { meta: { driverAdapterError: { cause: { constraint: { index: "Lead_email_key" } } } } },
      "Lead_email_key",
    ],
    ["a string target", { meta: { target: "Lead_email_key" } }, "Lead_email_key"],
    ["an array target", { meta: { target: ["slug", "companyId"] } }, "slug,companyId"],
  ])("reads %s", (_label, err, expected) => {
    const constraint = violatedConstraint(err)

    expect(constraint).toBe(expected)
  })

  it.each([
    ["a non-object error", "boom"],
    ["an error without meta", { code: "P2002" }],
    ["a meta without any constraint", { meta: { modelName: "Lead" } }],
  ])("returns undefined for %s", (_label, err) => {
    const constraint = violatedConstraint(err)

    expect(constraint).toBeUndefined()
  })
})
