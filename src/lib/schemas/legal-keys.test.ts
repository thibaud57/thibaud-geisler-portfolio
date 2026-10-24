import { describe, expect, it } from "vitest"

import enMessages from "../../../messages/en.json"
import frMessages from "../../../messages/fr.json"
import { ApeCode, RetentionPolicyKey } from "./legal-keys"

const LOCALES = [
  ["fr", frMessages],
  ["en", enMessages],
] as const

const KEYS_BY_NAMESPACE = [
  ["ape", ApeCode.options],
  ["retention", RetentionPolicyKey.options],
] as const

describe("legal keys", () => {
  describe.each(LOCALES)("%s messages", (_locale, messages) => {
    it.each(KEYS_BY_NAMESPACE)("translates every %s key", (namespace, keys) => {
      const translations: Readonly<Record<string, string>> = messages.Legal[namespace]

      const missing = keys.filter((key) => (translations[key] ?? "").trim() === "")

      expect(missing).toEqual([])
    })
  })
})
