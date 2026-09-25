import { ListObjectsV2Command } from "@aws-sdk/client-s3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/r2", () => ({
  r2: { send: vi.fn() },
  R2_BUCKET: "test-bucket",
  adminR2: { send: vi.fn() },
  R2_ADMIN_BUCKET: "test-admin-bucket",
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findMany: vi.fn(() => []) },
    company: { findMany: vi.fn(() => []) },
  },
}))

import { prisma } from "@/lib/prisma"
import { r2 } from "@/lib/r2"
import { listAssets, loadAssetReferences, matchAssetUsage } from "./assets"

describe("listAssets", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("follows the continuation token until the listing is exhausted", async () => {
    vi.mocked(r2.send)
      .mockResolvedValueOnce({
        Contents: [{ Key: "a" }],
        IsTruncated: true,
        NextContinuationToken: "t",
      } as never)
      .mockResolvedValueOnce({
        Contents: [{ Key: "b" }],
        IsTruncated: false,
      } as never)

    const entries = await listAssets()

    expect(entries).toHaveLength(2)
    expect(r2.send).toHaveBeenCalledTimes(2)
    const secondCall = vi.mocked(r2.send).mock.calls[1]?.[0] as ListObjectsV2Command
    expect(secondCall.input.ContinuationToken).toBe("t")
  })
})

describe("matchAssetUsage", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  beforeEach(() => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.company.findMany).mockResolvedValue([] as never)
  })

  it("resolves a key cited in a project's case study markdown to that project's slug", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      {
        slug: "foyer",
        coverFilename: "projets/client/foyer/cover.webp",
        caseStudyMarkdownFr: "![screenshot](projets/client/foyer/screenshot-1.webp)",
        caseStudyMarkdownEn: null,
      },
    ] as never)

    const usage = matchAssetUsage(await loadAssetReferences(), [
      "projets/client/foyer/screenshot-1.webp",
    ])

    expect(usage.get("projets/client/foyer/screenshot-1.webp")).toEqual(["foyer"])
  })

  it("resolves a key referenced nowhere to an empty list", async () => {
    const usage = matchAssetUsage(await loadAssetReferences(), [
      "branding/logo-horizontal-light.png",
    ])

    expect(usage.get("branding/logo-horizontal-light.png")).toEqual([])
  })
})
