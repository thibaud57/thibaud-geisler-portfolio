import { GET } from "./route"

vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  connection: vi.fn(),
}))

describe("GET /api/health", () => {
  it('returns 200 with {status:"ok"} and no-cache headers', async () => {
    const res = await GET()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: "ok" })
    expect(res.headers.get("cache-control")).toBe("no-cache, no-store, must-revalidate")
  })
})
