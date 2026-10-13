import { GetObjectCommand, NoSuchKey } from "@aws-sdk/client-s3"
import { afterEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/assets/[...path]/route"
import { objectMatch } from "@/lib/matchers-test-setup"
import { prisma } from "@/lib/prisma"
import { adminR2, r2 } from "@/lib/r2"

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

function mockObject(client: typeof r2, data: Uint8Array) {
  vi.mocked(client.send).mockResolvedValueOnce({
    Body: { transformToWebStream: () => toReadableStream(data) },
  } as never)
}

async function callRoute(segments: string[]): Promise<Response> {
  const url = `http://localhost:3000/api/assets/${segments.join("/")}`
  const request = new Request(url)
  return GET(request, { params: Promise.resolve({ path: segments }) })
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("GET /api/assets/[...path]", () => {
  it("returns 400 on an invalid path without calling r2.send", async () => {
    const response = await callRoute(["malware.exe"])

    expect(response.status).toBe(400)
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("returns 404 when R2 raises NoSuchKey", async () => {
    vi.mocked(r2.send).mockRejectedValueOnce(
      new NoSuchKey({ message: "The specified key does not exist.", $metadata: {} }),
    )

    const response = await callRoute(["absent.png"])

    expect(response.status).toBe(404)
  })

  it("returns 200 with the Content-Type derived from the extension and the body streamed from R2", async () => {
    mockObject(r2, PNG_1X1)

    const response = await callRoute(["test.png"])

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("image/png")
    const body = Buffer.from(await response.arrayBuffer())
    expect(body.equals(PNG_1X1)).toBe(true)
    const command = vi.mocked(r2.send).mock.calls[0]?.[0] as GetObjectCommand
    expect(command).toBeInstanceOf(GetObjectCommand)
    expect(command.input).toEqual({ Bucket: "test-bucket", Key: "test.png" })
  })

  it("sends Cache-Control no-cache in development for a root PNG", async () => {
    mockObject(r2, PNG_1X1)
    vi.stubEnv("NODE_ENV", "development")

    const response = await callRoute(["test.png"])

    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate")
  })

  it("sends Cache-Control immutable in production", async () => {
    mockObject(r2, PNG_1X1)
    vi.stubEnv("NODE_ENV", "production")

    const response = await callRoute(["test.png"])

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable")
  })

  it("serves the logo of a company with a published project from the admin bucket, uncached", async () => {
    vi.mocked(prisma.company.findFirst).mockResolvedValueOnce({ id: "acme" } as never)
    mockObject(adminR2, PNG_1X1)
    vi.stubEnv("NODE_ENV", "production")

    const response = await callRoute(["freelance", "crm", "entreprises", "acme", "logo.png"])

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-store, must-revalidate")
    expect(prisma.company.findFirst).toHaveBeenCalledWith(
      objectMatch({
        where: {
          logoFilename: "freelance/crm/entreprises/acme/logo.png",
          clientMetas: { some: { project: { status: "PUBLISHED" } } },
        },
      }),
    )
    const command = vi.mocked(adminR2.send).mock.calls[0]?.[0] as GetObjectCommand
    expect(command.input).toEqual({
      Bucket: "test-admin-bucket",
      Key: "freelance/crm/entreprises/acme/logo.png",
    })
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("returns 404 without reading R2 for the logo of a company without a published project", async () => {
    const response = await callRoute(["freelance", "crm", "entreprises", "prospect", "logo.png"])

    expect(response.status).toBe(404)
    expect(adminR2.send).not.toHaveBeenCalled()
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("serves no other freelance/ key from the admin bucket", async () => {
    vi.mocked(r2.send).mockRejectedValueOnce(
      new NoSuchKey({ message: "The specified key does not exist.", $metadata: {} }),
    )

    const response = await callRoute(["freelance", "administration", "contrat.pdf"])

    expect(response.status).toBe(404)
    expect(adminR2.send).not.toHaveBeenCalled()
  })
})
