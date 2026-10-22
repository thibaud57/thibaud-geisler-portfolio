import { describe, expect, it } from "vitest"
import { resolveTagIcon } from "./icons"

describe("resolveTagIcon", () => {
  it.each([
    ["a Simple Icons slug", "simple-icons:react"],
    ["a Lucide kebab-case slug", "lucide:brain-circuit"],
    ["a custom logo slug", "custom:remotion"],
  ])("resolves %s", (_label, key) => {
    const icon = resolveTagIcon(key)

    expect(icon).not.toBeNull()
  })

  it.each([
    ["a null key", null],
    ["an unknown Simple Icons slug", "simple-icons:ceci-nexiste-pas"],
    ["an unknown library", "heroicons:react"],
    ["a key without a colon", "reactsimpleicons"],
    ["a key with an empty slug", "simple-icons:"],
    ["a library prefix in another case", "Simple-Icons:react"],
  ])("returns null for %s", (_label, key) => {
    const icon = resolveTagIcon(key)

    expect(icon).toBeNull()
  })
})
