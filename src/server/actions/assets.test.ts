import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
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
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { prisma } from "@/lib/prisma"
import { adminR2, r2 } from "@/lib/r2"
import { getCurrentUser } from "@/lib/get-current-user"
import { deleteAsset, uploadAsset } from "./assets"
import { initialAssetFormState } from "./assets.types"

function buildUpload(overrides: Record<string, string> = {}, fileBytes = 1024): FormData {
  const data = new FormData()
  const base = { folder: "projets/client", slug: "acme", filename: "cover.webp" }
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    data.set(key, value)
  }
  data.set("file", new File([new Uint8Array(fileBytes)], "cover.webp"))
  return data
}

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie ici.
function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

describe("uploadAsset", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  beforeEach(() => {
    vi.mocked(r2.send).mockResolvedValue({} as never)
    vi.mocked(adminR2.send).mockResolvedValue({} as never)
  })

  it("rejects an extension outside the allow-list without calling R2", async () => {
    const state = await uploadAsset(initialAssetFormState, buildUpload({ filename: "virus.exe" }))

    expect(state.errors.filename).toBeDefined()
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("rejects a filename containing spaces", async () => {
    const state = await uploadAsset(
      initialAssetFormState,
      buildUpload({ filename: "ma capture.png" }),
    )

    expect(state.errors.filename).toBeDefined()
  })

  it("normalizes the filename to lowercase", async () => {
    await uploadAsset(initialAssetFormState, buildUpload({ filename: "COVER.WEBP" }))

    expect(r2.send).toHaveBeenCalledWith(
      objectMatch({ input: objectMatch({ Key: "projets/client/acme/cover.webp" }) }),
    )
  })

  it("rejects a destination folder outside the allow-list", async () => {
    const state = await uploadAsset(initialAssetFormState, buildUpload({ folder: "etc/passwd" }))

    expect(state.errors.folder).toBeDefined()
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("accepts an upload into branding without a sub-folder", async () => {
    const data = new FormData()
    data.set("folder", "branding")
    data.set("filename", "logo-horizontal-light.png")
    data.set("file", new File([new Uint8Array(1024)], "logo.png"))

    await uploadAsset(initialAssetFormState, data)

    expect(r2.send).toHaveBeenCalledWith(
      objectMatch({ input: objectMatch({ Key: "branding/logo-horizontal-light.png" }) }),
    )
  })

  it("rejects a sub-folder on a folder that does not expect one", async () => {
    const state = await uploadAsset(
      initialAssetFormState,
      buildUpload({ folder: "branding", slug: "quelque-chose" }),
    )

    expect(state.errors.slug).toBeDefined()
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("rejects an upload missing the sub-folder on a folder that expects one", async () => {
    const data = new FormData()
    data.set("folder", "projets/client")
    data.set("filename", "cover.webp")
    data.set("file", new File([new Uint8Array(1024)], "cover.webp"))

    const state = await uploadAsset(initialAssetFormState, data)

    expect(state.errors.slug).toBeDefined()
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("rejects a file exceeding the maximum size", async () => {
    const state = await uploadAsset(initialAssetFormState, buildUpload({}, 9 * 1024 * 1024))

    expect(state.message).toBe("file_too_large")
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("rejects an empty file", async () => {
    const state = await uploadAsset(initialAssetFormState, buildUpload({}, 0))

    expect(state.message).toBe("file_empty")
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("rejects a file whose MIME type contradicts its extension", async () => {
    const data = new FormData()
    data.set("folder", "projets/client")
    data.set("slug", "acme")
    data.set("filename", "cover.webp")
    data.set("file", new File([new Uint8Array(1024)], "cover.webp", { type: "application/pdf" }))

    const state = await uploadAsset(initialAssetFormState, data)

    expect(state.message).toBe("file_type_mismatch")
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("accepts a file with an empty MIME type", async () => {
    const data = new FormData()
    data.set("folder", "projets/client")
    data.set("slug", "acme")
    data.set("filename", "cover.webp")
    data.set("file", new File([new Uint8Array(1024)], "cover.webp", { type: "" }))

    const state = await uploadAsset(initialAssetFormState, data)

    expect(state.ok).toBe(true)
    expect(r2.send).toHaveBeenCalled()
  })

  it("builds the key from the folder, the slug and the filename", async () => {
    await uploadAsset(
      initialAssetFormState,
      buildUpload({ slug: "foyer", filename: "cover-2.webp" }),
    )

    expect(r2.send).toHaveBeenCalledWith(
      objectMatch({ input: objectMatch({ Key: "projets/client/foyer/cover-2.webp" }) }),
    )
  })

  it("writes a company logo to portfolio-admin, not portfolio-assets", async () => {
    await uploadAsset(
      initialAssetFormState,
      buildUpload({ folder: "freelance/crm/entreprises", slug: "foyer", filename: "logo.png" }),
    )

    expect(adminR2.send).toHaveBeenCalledWith(
      objectMatch({
        input: objectMatch({
          Bucket: "test-admin-bucket",
          Key: "freelance/crm/entreprises/foyer/logo.png",
        }),
      }),
    )
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("rejects a call without a session, before any validation", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(uploadAsset(initialAssetFormState, buildUpload())).rejects.toThrow()

    expect(r2.send).not.toHaveBeenCalled()
  })
})

describe("deleteAsset", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  beforeEach(() => {
    vi.mocked(r2.send).mockResolvedValue({} as never)
    vi.mocked(adminR2.send).mockResolvedValue({} as never)
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.company.findMany).mockResolvedValue([] as never)
  })

  it("deletes an unreferenced asset", async () => {
    const state = await deleteAsset("projets/client/acme/cover.webp")

    expect(state.ok).toBe(true)
    expect(r2.send).toHaveBeenCalled()
  })

  it("deletes a company logo via adminR2, on portfolio-admin", async () => {
    const state = await deleteAsset("freelance/crm/entreprises/foyer/logo.png")

    expect(state.ok).toBe(true)
    expect(adminR2.send).toHaveBeenCalledWith(
      objectMatch({ input: objectMatch({ Bucket: "test-admin-bucket" }) }),
    )
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("rejects the deletion and names the project using the cover", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ slug: "foyer" }] as never)

    const state = await deleteAsset("projets/client/foyer/cover.webp")

    expect(state.ok).toBe(false)
    expect(state.message).toBe("asset_in_use")
    expect(state.usedBy).toContain("foyer")
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("rejects the deletion and names the project citing the asset in its case study markdown", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ slug: "foyer" }] as never)

    const state = await deleteAsset("projets/client/foyer/screenshot-1.webp")

    expect(state.message).toBe("asset_in_use")
    expect(state.usedBy).toContain("foyer")
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      objectMatch({
        where: objectMatch({
          OR: [
            { coverFilename: "projets/client/foyer/screenshot-1.webp" },
            { caseStudyMarkdownFr: { contains: "projets/client/foyer/screenshot-1.webp" } },
            { caseStudyMarkdownEn: { contains: "projets/client/foyer/screenshot-1.webp" } },
          ],
        }),
      }),
    )
  })

  it("rejects the deletion and names the company using the logo", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([{ slug: "dentsu" }] as never)

    const state = await deleteAsset("freelance/crm/entreprises/dentsu/logo.png")

    expect(state.message).toBe("asset_in_use")
    expect(state.usedBy).toContain("dentsu")
    expect(adminR2.send).not.toHaveBeenCalled()
  })

  it("rejects the deletion of a branding key without calling R2 or Prisma", async () => {
    const state = await deleteAsset("branding/logo-horizontal-light.png")

    expect(state.ok).toBe(false)
    expect(state.message).toBe("asset_hardcoded")
    expect(prisma.project.findMany).not.toHaveBeenCalled()
    expect(prisma.company.findMany).not.toHaveBeenCalled()
    expect(r2.send).not.toHaveBeenCalled()
    expect(adminR2.send).not.toHaveBeenCalled()
  })

  it("rejects the deletion of a documents/cv key without calling R2 or Prisma", async () => {
    const state = await deleteAsset("documents/cv/cv-thibaud-geisler-fr.pdf")

    expect(state.ok).toBe(false)
    expect(state.message).toBe("asset_hardcoded")
    expect(prisma.project.findMany).not.toHaveBeenCalled()
    expect(prisma.company.findMany).not.toHaveBeenCalled()
    expect(r2.send).not.toHaveBeenCalled()
    expect(adminR2.send).not.toHaveBeenCalled()
  })

  it("rejects a call without a session, before any database query", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(deleteAsset("projets/client/acme/cover.webp")).rejects.toThrow()

    expect(prisma.project.findMany).not.toHaveBeenCalled()
    expect(prisma.company.findMany).not.toHaveBeenCalled()
    expect(r2.send).not.toHaveBeenCalled()
  })
})
