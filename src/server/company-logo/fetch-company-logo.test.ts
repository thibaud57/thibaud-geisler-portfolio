import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/r2", () => ({ adminR2: { send: vi.fn() }, R2_ADMIN_BUCKET: "test-admin-bucket" }))
vi.mock("./safe-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./safe-fetch")>()),
  safeFetch: vi.fn(),
}))
vi.mock("./normalize-icon", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./normalize-icon")>()),
  normalizeIcon: vi.fn(),
}))

import { objectMatch } from "@/lib/matchers-test-setup"
import { adminR2 } from "@/lib/r2"

import {
  fetchCompanyIcon,
  NoIconFoundError,
  retrieveCompanyLogo,
  storeCompanyLogo,
} from "./fetch-company-logo"
import { IconTooSmallError, normalizeIcon } from "./normalize-icon"
import {
  BlockedAddressError,
  DeadlineExceededError,
  FetchFailedError,
  safeFetch,
} from "./safe-fetch"

const SITE = "https://acme.example/"

function page(head: string) {
  return { url: new URL(SITE), body: Buffer.from(`<html><head>${head}</head></html>`) }
}

function image(path: string) {
  return { url: new URL(path, SITE), body: Buffer.from(path) }
}

function normalizedIcon(size: number) {
  return { png: Buffer.from("png"), width: size, height: size }
}

describe("fetchCompanyIcon", () => {
  it("falls back to the next candidate when one fails", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(
        page(
          '<link rel="apple-touch-icon" href="/apple.png"><link rel="icon" href="/icon.png" sizes="64x64">',
        ),
      )
      .mockRejectedValueOnce(new FetchFailedError(404))
      .mockResolvedValueOnce(image("/icon.png"))
    vi.mocked(normalizeIcon).mockResolvedValueOnce(normalizedIcon(64))

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

  it("tries /favicon.ico when the page declares no icon", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page("<title>Acme</title>"))
      .mockResolvedValueOnce(image("/favicon.ico"))
    vi.mocked(normalizeIcon).mockResolvedValueOnce(normalizedIcon(48))

    const result = await fetchCompanyIcon(SITE)

    expect(result.source).toBe("icon")
    expect(safeFetch).toHaveBeenLastCalledWith(new URL("/favicon.ico", SITE), expect.anything())
  })

  it("reports no icon when every candidate fails", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/a.png"><link rel="icon" href="/b.png">'))
      .mockRejectedValueOnce(new FetchFailedError(404))
      .mockRejectedValueOnce(new FetchFailedError(404))

    const result = fetchCompanyIcon(SITE)

    await expect(result).rejects.toBeInstanceOf(NoIconFoundError)
  })

  it.each([
    { label: "a blocked address", error: new BlockedAddressError("intranet") },
    { label: "the deadline", error: new DeadlineExceededError() },
  ])("stops at $label instead of trying the next candidate", async ({ error }) => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/a.png"><link rel="icon" href="/b.png">'))
      .mockRejectedValueOnce(error)

    const result = fetchCompanyIcon(SITE)

    await expect(result).rejects.toBe(error)
    expect(safeFetch).toHaveBeenCalledTimes(2)
  })

  it("shares one deadline between the page and every candidate", async () => {
    const deadline = new AbortController().signal
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/icon.png">'))
      .mockResolvedValueOnce(image("/icon.png"))
    vi.mocked(normalizeIcon).mockResolvedValueOnce(normalizedIcon(64))

    await fetchCompanyIcon(SITE, deadline)

    expect(vi.mocked(safeFetch).mock.calls.map(([, options]) => options.deadline)).toEqual([
      deadline,
      deadline,
    ])
  })
})

describe("retrieveCompanyLogo", () => {
  it("retrieves, stores and reports the logo", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/icon.png">'))
      .mockResolvedValueOnce(image("/icon.png"))
    vi.mocked(normalizeIcon).mockResolvedValueOnce(normalizedIcon(64))

    const result = await retrieveCompanyLogo(SITE, "acme")

    expect(result.key).toMatch(/^freelance\/crm\/entreprises\/acme\/logo-[0-9a-f]{12}\.png$/)
    expect(result).toMatchObject({ width: 64, height: 64, source: "icon" })
    expect(adminR2.send).toHaveBeenCalledTimes(1)
  })

  it("bounds the whole retrieval with a deadline by default", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/icon.png">'))
      .mockResolvedValueOnce(image("/icon.png"))
    vi.mocked(normalizeIcon).mockResolvedValueOnce(normalizedIcon(64))

    await retrieveCompanyLogo(SITE, "acme")

    const [pageDeadline, iconDeadline] = vi
      .mocked(safeFetch)
      .mock.calls.map(([, options]) => options.deadline)
    expect(pageDeadline).toBeInstanceOf(AbortSignal)
    expect(iconDeadline).toBe(pageDeadline)
  })
})

describe("storeCompanyLogo", () => {
  it("stores the icon under the company folder with a content-derived name", async () => {
    const png = Buffer.from("same-png")

    const key = await storeCompanyLogo("acme", png)

    expect(key).toMatch(/^freelance\/crm\/entreprises\/acme\/logo-[0-9a-f]{12}\.png$/)
    expect(adminR2.send).toHaveBeenCalledWith(
      objectMatch({
        input: objectMatch({ Bucket: "test-admin-bucket", Key: key, ContentType: "image/png" }),
      }),
    )
  })

  it("derives the same name from the same icon", async () => {
    const png = Buffer.from("same-png")
    const first = await storeCompanyLogo("acme", png)

    const second = await storeCompanyLogo("acme", png)

    expect(second).toBe(first)
  })
})
