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

import { fetchCompanyIcon, retrieveCompanyLogo, storeCompanyLogo } from "./fetch-company-logo"
import { normalizeIcon } from "./normalize-icon"
import { safeFetch } from "./safe-fetch"

const SITE = new URL("https://acme.example/")

const NOT_FOUND = { ok: false, message: "site_unreachable", status: 404 } as const

function page(head: string) {
  return {
    ok: true,
    resource: { url: SITE, body: Buffer.from(`<html><head>${head}</head></html>`) },
  } as const
}

function image(path: string) {
  return { ok: true, resource: { url: new URL(path, SITE), body: Buffer.from(path) } } as const
}

function normalizedIcon(size: number) {
  return { ok: true, icon: { png: Buffer.from("png"), width: size, height: size } } as const
}

describe("fetchCompanyIcon", () => {
  it("falls back to the next candidate when one fails", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(
        page(
          '<link rel="apple-touch-icon" href="/apple.png"><link rel="icon" href="/icon.png" sizes="64x64">',
        ),
      )
      .mockResolvedValueOnce(NOT_FOUND)
      .mockResolvedValueOnce(image("/icon.png"))
    vi.mocked(normalizeIcon).mockResolvedValueOnce(normalizedIcon(64))

    const result = await fetchCompanyIcon(SITE)

    expect(result).toMatchObject({ ok: true, source: "icon" })
    expect(normalizeIcon).toHaveBeenCalledTimes(1)
  })

  it("reports the largest too small size when no candidate is large enough", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/a.png"><link rel="icon" href="/b.png">'))
      .mockResolvedValueOnce(image("/a.png"))
      .mockResolvedValueOnce(image("/b.png"))
    vi.mocked(normalizeIcon)
      .mockResolvedValueOnce({ ok: false, message: "icon_too_small", size: 16 })
      .mockResolvedValueOnce({ ok: false, message: "icon_too_small", size: 24 })

    const result = fetchCompanyIcon(SITE)

    await expect(result).resolves.toEqual({ ok: false, message: "icon_too_small", size: 24 })
  })

  it("moves on to the next candidate when an image is too large", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/a.png"><link rel="icon" href="/b.png">'))
      .mockResolvedValueOnce({ ok: false, message: "response_too_large" })
      .mockResolvedValueOnce(image("/b.png"))
    vi.mocked(normalizeIcon).mockResolvedValueOnce(normalizedIcon(64))

    const result = await fetchCompanyIcon(SITE)

    expect(result).toMatchObject({ ok: true, source: "icon" })
    expect(normalizeIcon).toHaveBeenCalledTimes(1)
  })

  it("moves on to the next candidate when an image is unreadable", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/a.png"><link rel="icon" href="/b.png">'))
      .mockResolvedValueOnce(image("/a.png"))
      .mockResolvedValueOnce(image("/b.png"))
    vi.mocked(normalizeIcon)
      .mockResolvedValueOnce({ ok: false, message: "icon_unreadable" })
      .mockResolvedValueOnce(normalizedIcon(64))

    const result = await fetchCompanyIcon(SITE)

    expect(result).toMatchObject({ ok: true, source: "icon" })
    expect(normalizeIcon).toHaveBeenCalledTimes(2)
  })

  it("reports the status of an unreachable site", async () => {
    vi.mocked(safeFetch).mockResolvedValueOnce(NOT_FOUND)

    const result = fetchCompanyIcon(SITE)

    await expect(result).resolves.toEqual(NOT_FOUND)
  })

  it("tries at most eight candidates", async () => {
    const icons = Array.from({ length: 10 }, (_, i) => `<link rel="icon" href="/i${i}.png">`)
    vi.mocked(safeFetch).mockResolvedValueOnce(page(icons.join("")))
    for (let i = 0; i < 8; i++) {
      vi.mocked(safeFetch).mockResolvedValueOnce(NOT_FOUND)
    }

    const result = fetchCompanyIcon(SITE)

    await expect(result).resolves.toEqual({ ok: false, message: "no_icon_found" })
    expect(safeFetch).toHaveBeenCalledTimes(9)
  })

  it("tries /favicon.ico when the page declares no icon", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page("<title>Acme</title>"))
      .mockResolvedValueOnce(image("/favicon.ico"))
    vi.mocked(normalizeIcon).mockResolvedValueOnce(normalizedIcon(48))

    const result = await fetchCompanyIcon(SITE)

    expect(result).toMatchObject({ ok: true, source: "icon" })
    expect(safeFetch).toHaveBeenLastCalledWith(new URL("/favicon.ico", SITE), expect.anything())
  })

  it("reports no icon when every candidate fails", async () => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/a.png"><link rel="icon" href="/b.png">'))
      .mockResolvedValueOnce(NOT_FOUND)
      .mockResolvedValueOnce(NOT_FOUND)

    const result = fetchCompanyIcon(SITE)

    await expect(result).resolves.toEqual({ ok: false, message: "no_icon_found" })
  })

  it.each([
    { label: "a blocked address", failure: { ok: false, message: "address_blocked" } },
    { label: "the deadline", failure: { ok: false, message: "site_too_slow" } },
  ] as const)("stops at $label instead of trying the next candidate", async ({ failure }) => {
    vi.mocked(safeFetch)
      .mockResolvedValueOnce(page('<link rel="icon" href="/a.png"><link rel="icon" href="/b.png">'))
      .mockResolvedValueOnce(failure)

    const result = fetchCompanyIcon(SITE)

    await expect(result).resolves.toEqual(failure)
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

    expect(result).toMatchObject({ ok: true, width: 64, height: 64, source: "icon" })
    expect(result.ok && result.key).toMatch(
      /^freelance\/crm\/entreprises\/acme\/logo-[0-9a-f]{12}\.png$/,
    )
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

describe("retrieveCompanyLogo failure", () => {
  it("passes a fetch failure through without storing", async () => {
    vi.mocked(safeFetch).mockResolvedValueOnce(NOT_FOUND)

    const result = await retrieveCompanyLogo(SITE, "acme")

    expect(result).toEqual(NOT_FOUND)
    expect(adminR2.send).not.toHaveBeenCalled()
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
