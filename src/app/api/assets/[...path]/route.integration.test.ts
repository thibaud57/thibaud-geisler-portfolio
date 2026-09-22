// @vitest-environment node
import { GetObjectCommand, NoSuchKey } from "@aws-sdk/client-s3"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/r2", () => ({
  r2: { send: vi.fn() },
  R2_BUCKET: "test-bucket",
  adminR2: { send: vi.fn() },
  R2_ADMIN_BUCKET: "test-admin-bucket",
}))
vi.mock("@/lib/prisma", () => ({
  prisma: { company: { findFirst: vi.fn(() => null) } },
}))

const PNG_1X1 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
])

function toReadableStream(data: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(data)
      controller.close()
    },
  })
}

async function mockR2Object(data: Uint8Array) {
  const { r2 } = await import("@/lib/r2")
  vi.mocked(r2.send).mockResolvedValueOnce({
    Body: { transformToWebStream: () => toReadableStream(data) },
  } as never)
  return r2
}

async function callRoute(segments: string[]): Promise<Response> {
  const { GET } = await import("@/app/api/assets/[...path]/route")
  const url = `http://localhost:3000/api/assets/${segments.join("/")}`
  const request = new Request(url)
  return GET(request, { params: Promise.resolve({ path: segments }) })
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe("GET /api/assets/[...path]", () => {
  it("retourne 400 sur chemin invalide sans appeler r2.send", async () => {
    const { r2 } = await import("@/lib/r2")

    const response = await callRoute(["malware.exe"])

    expect(response.status).toBe(400)
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("retourne 404 quand R2 renvoie une erreur NoSuchKey", async () => {
    const { r2 } = await import("@/lib/r2")
    vi.mocked(r2.send).mockRejectedValueOnce(
      new NoSuchKey({ message: "The specified key does not exist.", $metadata: {} }),
    )

    const response = await callRoute(["absent.png"])

    expect(response.status).toBe(404)
  })

  it("retourne 200 avec le Content-Type dérivé de l extension et le body streamé depuis R2", async () => {
    const r2 = await mockR2Object(PNG_1X1)

    const response = await callRoute(["test.png"])

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("image/png")
    const body = Buffer.from(await response.arrayBuffer())
    expect(body.equals(PNG_1X1)).toBe(true)
    const command = vi.mocked(r2.send).mock.calls[0]?.[0] as GetObjectCommand
    expect(command).toBeInstanceOf(GetObjectCommand)
    expect(command.input).toEqual({ Bucket: "test-bucket", Key: "test.png" })
  })

  it("retourne Cache-Control no-cache en dev pour un PNG au root", async () => {
    await mockR2Object(PNG_1X1)
    vi.stubEnv("NODE_ENV", "development")

    const response = await callRoute(["test.png"])

    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate")
  })

  it("retourne Cache-Control immutable en production", async () => {
    await mockR2Object(PNG_1X1)
    vi.stubEnv("NODE_ENV", "production")

    const response = await callRoute(["test.png"])

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable")
  })

  it("sert le logo d'une entreprise dont un projet est publié, depuis le bucket admin, sans cache", async () => {
    const { adminR2, r2 } = await import("@/lib/r2")
    const { prisma } = await import("@/lib/prisma")
    vi.mocked(prisma.company.findFirst).mockResolvedValueOnce({ id: "foyer" } as never)
    vi.mocked(adminR2.send).mockResolvedValueOnce({
      Body: { transformToWebStream: () => toReadableStream(PNG_1X1) },
    } as never)
    vi.stubEnv("NODE_ENV", "production")

    const response = await callRoute(["freelance", "crm", "entreprises", "foyer", "logo.png"])

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate")
    expect(prisma.company.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          logoFilename: "freelance/crm/entreprises/foyer/logo.png",
          clientMetas: { some: { project: { status: "PUBLISHED" } } },
        },
      }),
    )
    const command = vi.mocked(adminR2.send).mock.calls[0]?.[0] as GetObjectCommand
    expect(command.input).toEqual({
      Bucket: "test-admin-bucket",
      Key: "freelance/crm/entreprises/foyer/logo.png",
    })
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("répond 404 sans lire R2 pour le logo d'une entreprise sans projet publié", async () => {
    const { adminR2, r2 } = await import("@/lib/r2")

    const response = await callRoute(["freelance", "crm", "entreprises", "prospect", "logo.png"])

    expect(response.status).toBe(404)
    expect(adminR2.send).not.toHaveBeenCalled()
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("ne sert aucune autre clé freelance/ depuis le bucket admin", async () => {
    const { adminR2, r2 } = await import("@/lib/r2")
    vi.mocked(r2.send).mockRejectedValueOnce(
      new NoSuchKey({ message: "The specified key does not exist.", $metadata: {} }),
    )

    const response = await callRoute(["freelance", "administration", "contrat.pdf"])

    expect(response.status).toBe(404)
    expect(adminR2.send).not.toHaveBeenCalled()
  })
})
