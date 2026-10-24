import { describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
const log = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }))
vi.mock("@/lib/logger", () => ({ logger: { child: vi.fn(() => log) } }))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("@/lib/r2", () => ({ adminR2: { send: vi.fn() }, R2_ADMIN_BUCKET: "test-admin-bucket" }))
vi.mock("@/server/company-logo/fetch-company-logo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/company-logo/fetch-company-logo")>()),
  retrieveCompanyLogo: vi.fn(),
}))

import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/get-current-user"
import { retrieveCompanyLogo } from "@/server/company-logo/fetch-company-logo"

import { fetchCompanyLogo } from "./company-logo"

const LOGO = {
  ok: true as const,
  key: "freelance/crm/entreprises/acme/logo-0123456789ab.png",
  width: 180,
  height: 180,
  source: "apple-touch-icon" as const,
}

describe("fetchCompanyLogo", () => {
  it("rejects a call without a session before any network access", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = fetchCompanyLogo("https://acme.example/", "acme")

    await expect(result).rejects.toThrow()
    expect(retrieveCompanyLogo).not.toHaveBeenCalled()
  })

  it.each([
    ["javascript:alert(1)", "acme"],
    ["https://acme.example/", "acme corp"],
  ])(
    "rejects an invalid website URL or slug without fetching (%s, %s)",
    async (websiteUrl, slug) => {
      const result = await fetchCompanyLogo(websiteUrl, slug)

      expect(result).toEqual({ ok: false, message: "invalid_input" })
      expect(retrieveCompanyLogo).not.toHaveBeenCalled()
    },
  )

  it("lowercases the slug before storing", async () => {
    vi.mocked(retrieveCompanyLogo).mockResolvedValueOnce(LOGO)

    await fetchCompanyLogo(" https://acme.example/ ", " ACME ")

    expect(retrieveCompanyLogo).toHaveBeenCalledWith(new URL("https://acme.example/"), "acme")
  })

  it("returns the stored key, size and source", async () => {
    vi.mocked(retrieveCompanyLogo).mockResolvedValueOnce(LOGO)

    const result = await fetchCompanyLogo("https://acme.example/", "acme")

    expect(result).toEqual(LOGO)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/assets")
  })

  it.each([
    { label: "a blocked address", failure: { ok: false, message: "address_blocked" } },
    {
      label: "an unreachable site",
      failure: { ok: false, message: "site_unreachable", status: 403 },
    },
    { label: "a site too slow for the deadline", failure: { ok: false, message: "site_too_slow" } },
    { label: "a missing icon", failure: { ok: false, message: "no_icon_found" } },
    { label: "a too small icon", failure: { ok: false, message: "icon_too_small", size: 16 } },
  ] as const)("returns $label as is and logs it", async ({ failure }) => {
    vi.mocked(retrieveCompanyLogo).mockResolvedValueOnce(failure)

    const result = await fetchCompanyLogo("https://acme.example/", "acme")

    expect(result).toEqual(failure)
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: "company_logo:not_fetched", reason: failure.message }),
    )
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("maps an unexpected error to unknown_error", async () => {
    vi.mocked(retrieveCompanyLogo).mockRejectedValueOnce(new Error("boom"))

    const result = await fetchCompanyLogo("https://acme.example/", "acme")

    expect(result).toEqual({ ok: false, message: "unknown_error" })
    expect(log.error).toHaveBeenCalledTimes(1)
  })
})
