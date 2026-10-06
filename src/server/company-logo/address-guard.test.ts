// @vitest-environment node
import { describe, expect, it } from "vitest"

import { isBlockedAddress } from "./address-guard"

describe("isBlockedAddress", () => {
  it.each([
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.5.4",
    "192.168.1.1",
  ])("blocks loopback, private, link-local, shared and unspecified IPv4 ranges (%s)", (address) => {
    const blocked = isBlockedAddress(address)

    expect(blocked).toBe(true)
  })

  it.each(["::", "::1", "fd12:3456::1", "fe80::1"])(
    "blocks IPv6 loopback, unique local and link-local addresses (%s)",
    (address) => {
      const blocked = isBlockedAddress(address)

      expect(blocked).toBe(true)
    },
  )

  it.each([
    "::ffff:127.0.0.1",
    "::ffff:c0a8:101",
    "::7f00:1",
    "64:ff9b::a00:1",
    "64:ff9b:1::a00:1",
    "2001::1",
    "2002:a00:1::1",
    "fec0::1",
  ])("blocks a private IPv4 address embedded in an IPv6 address (%s)", (address) => {
    const blocked = isBlockedAddress(address)

    expect(blocked).toBe(true)
  })

  it.each(["93.184.215.14", "2606:4700:4700::1111"])(
    "allows a public IPv4 and IPv6 address (%s)",
    (address) => {
      const blocked = isBlockedAddress(address)

      expect(blocked).toBe(false)
    },
  )
})
