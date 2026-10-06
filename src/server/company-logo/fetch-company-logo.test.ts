// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/r2", () => ({ adminR2: { send: vi.fn() }, R2_ADMIN_BUCKET: "test-admin-bucket" }))
vi.mock("./safe-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./safe-fetch")>()),
  safeFetch: vi.fn(),
}))
vi.mock("./normalize-icon", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./normalize-icon")>()),
  normalizeIcon: vi.fn(),
}))

import { adminR2 } from "@/lib/r2"

import {
  fetchCompanyIcon,
  NoIconFoundError,
  retrieveCompanyLogo,
  storeCompanyLogo,
} from "./fetch-company-logo"
import { IconTooSmallError, normalizeIcon } from "./normalize-icon"
import { BlockedAddressError, FetchFailedError, safeFetch } from "./safe-fetch"

const SITE = "https://acme.example/"

function page(head: string) {
  return { url: new URL(SITE), body: Buffer.from(`<html><head>${head}</head></html>`) }
}

function image(path: string) {
  return { url: new URL(path, SITE), body: Buffer.from(path) }
}

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie ici.
function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

describe("fetchCompanyIcon", () => {
  afterEach(() => vi.clearAllMocks())

  it("falls back to the next candidate when one fails", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(
        page(
          '<link rel="apple-touch-icon" href="/apple.png"><link rel="icon" href="/icon.png" sizes="64x64">',
        ),
      )
      .mockRejectedValueOnce(new FetchFailedError(404))
      .mockResolvedValueOnce(image("/icon.png"))
    vi.mocked(normalizeIcon).mockResolvedValueOnce({
      png: Buffer.from("png"),
      width: 64,
      height: 64,
    })

    const result = await fetchCompanyIcon(SITE)

    expect(result.source).toBe("icon")
    expect(normalizeIcon).toHaveBeenCalledTimes(1)
  })

  it("reports the largest too small size when no candidate is large enough", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/a.png"><link rel="icon" href="/b.png">'))
      .mockResolvedValueOnce(image("/a.png"))
      .mockResolvedValueOnce(image("/b.png"))
    vi.mocked(normalizeIcon)
      .mockRejectedValueOnce(new IconTooSmallError(16))
      .mockRejectedValueOnce(new IconTooSmallError(24))

    const result = fetchCompanyIcon(SITE)

    await expect(result).rejects.toBeInstanceOf(IconTooSmallError)
    await expect(result).rejects.toMatchObject({ size: 24 })
  })

  it("tries at most eight candidates", async () => {
    const icons = Array.from({ length: 10 }, (_, i) => `<link rel="icon" href="/i${i}.png">`)
    vi.mocked(safeFetch).mockResolvedValueOnce(page(icons.join("")))
    for (let i = 0; i < 8; i++) {
      vi.mocked(safeFetch).mockRejectedValueOnce(new FetchFailedError(404))
    }

    const result = fetchCompanyIcon(SITE)

    await expect(result).rejects.toBeInstanceOf(NoIconFoundError)
    expect(safeFetch).toHaveBeenCalledTimes(9)
  })

  it("reports no icon when every candidate fails", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/a.png"><link rel="icon" href="/b.png">'))
      .mockRejectedValueOnce(new FetchFailedError(404))
      .mockRejectedValueOnce(new FetchFailedError(404))

    const result = fetchCompanyIcon(SITE)

    await expect(result).rejects.toBeInstanceOf(NoIconFoundError)
  })

  it("stops at a blocked address", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/a.png"><link rel="icon" href="/b.png">'))
      .mockRejectedValueOnce(new BlockedAddressError("intranet"))

    const result = fetchCompanyIcon(SITE)

    await expect(result).rejects.toBeInstanceOf(BlockedAddressError)
    expect(safeFetch).toHaveBeenCalledTimes(2)
  })
})

describe("retrieveCompanyLogo", () => {
  afterEach(() => vi.clearAllMocks())

  it("retrieves, stores and reports the logo", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/icon.png">'))
      .mockResolvedValueOnce(image("/icon.png"))
    vi.mocked(normalizeIcon).mockResolvedValueOnce({
      png: Buffer.from("png"),
      width: 64,
      height: 64,
    })

    const result = await retrieveCompanyLogo(SITE, "acme")

    expect(result.key).toMatch(/^freelance\/crm\/entreprises\/acme\/logo-[0-9a-f]{12}\.png$/)
    expect(result).toMatchObject({ width: 64, height: 64, source: "icon" })
    expect(adminR2.send).toHaveBeenCalledTimes(1)
  })
})

describe("storeCompanyLogo", () => {
  afterEach(() => vi.clearAllMocks())

  it("stores the icon under the company folder with a content-derived name", async () => {
    const png = Buffer.from("same-png")

    const first = await storeCompanyLogo("acme", png)
    const second = await storeCompanyLogo("acme", png)

    expect(first).toMatch(/^freelance\/crm\/entreprises\/acme\/logo-[0-9a-f]{12}\.png$/)
    expect(second).toBe(first)
    expect(adminR2.send).toHaveBeenCalledWith(
      objectMatch({
        input: objectMatch({ Bucket: "test-admin-bucket", Key: first, ContentType: "image/png" }),
      }),
    )
  })
})
