import { EventEmitter } from "node:events"
import { Readable } from "node:stream"
import { describe, expect, it, vi } from "vitest"

vi.mock("node:dns", () => ({ lookup: vi.fn() }))
vi.mock("node:http", () => ({ default: { get: vi.fn() } }))
vi.mock("node:https", () => ({ default: { get: vi.fn() } }))

import { lookup, type LookupAddress } from "node:dns"
import http from "node:http"
import https from "node:https"

import { BlockedAddressError, guardedLookup, safeFetch } from "./safe-fetch"

const unreachable = (status: number | null) => ({
  ok: false,
  message: "site_unreachable",
  status,
})

function fakeResponse(statusCode: number, headers: Record<string, string>, body?: Buffer) {
  return Object.assign(Readable.from(body ? [body] : []), { statusCode, headers })
}

function httpsRepliesWith(...responses: ReturnType<typeof fakeResponse>[]) {
  for (const response of responses) {
    vi.mocked(https.get).mockImplementationOnce(((
      _url: unknown,
      _options: unknown,
      callback: (res: unknown) => void,
    ) => {
      callback(response)
      return new EventEmitter()
    }) as never)
  }
}

function dnsReplies(err: Error | null, addresses: LookupAddress[]) {
  vi.mocked(lookup).mockImplementation(((
    _hostname: string,
    _options: unknown,
    callback: (err: Error | null, addresses: LookupAddress[]) => void,
  ) => {
    callback(err, addresses)
  }) as never)
}

function dnsAnswers(addresses: LookupAddress[]) {
  dnsReplies(null, addresses)
}

describe("guardedLookup", () => {
  it.each([
    {
      label: "that resolves to a private address",
      host: "intranet.acme.example",
      addresses: [{ address: "10.0.0.5", family: 4 }],
    },
    {
      label: "when any resolved address is private",
      host: "mixed.acme.example",
      addresses: [
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.5", family: 4 },
      ],
    },
    { label: "that resolves to nothing", host: "empty.acme.example", addresses: [] },
  ])("refuses a host name $label", ({ host, addresses }) => {
    dnsAnswers(addresses)
    const callback = vi.fn()

    guardedLookup(host, {}, callback)

    expect(callback.mock.calls[0]?.[0]).toBeInstanceOf(BlockedAddressError)
  })

  it("forwards a resolution error", () => {
    const failure = new Error("ENOTFOUND")
    dnsReplies(failure, [])
    const callback = vi.fn()

    guardedLookup("missing.acme.example", {}, callback)

    expect(callback).toHaveBeenCalledWith(failure, "", 0)
  })

  it("returns the vetted address and family for a single lookup", () => {
    dnsAnswers([{ address: "93.184.216.34", family: 4 }])
    const callback = vi.fn()

    guardedLookup("acme.example", {}, callback)

    expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4)
  })

  it("returns every vetted address when all is requested", () => {
    const addresses: LookupAddress[] = [
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ]
    dnsAnswers(addresses)
    const callback = vi.fn()

    guardedLookup("acme.example", { all: true }, callback)

    expect(callback).toHaveBeenCalledWith(null, addresses)
  })
})

describe("safeFetch", () => {
  it.each([
    "http://127.0.0.1/",
    "http://127.0.0.1:3000/",
    "http://[::1]/",
    "http://2130706433/",
    "http://0x7f.1/",
  ])(
    "refuses an internal IP literal before any request, whatever its notation (%s)",
    async (target) => {
      const result = safeFetch(new URL(target), { maxBytes: 1024 })

      await expect(result).resolves.toEqual({ ok: false, message: "address_blocked" })
      expect(http.get).not.toHaveBeenCalled()
    },
  )

  it.each(["ftp://acme.example/", "http://acme.example:8080/", "http://user:secret@acme.example/"])(
    "reports a non-http scheme, a port or credentials as unreachable (%s)",
    async (target) => {
      const result = safeFetch(new URL(target), { maxBytes: 1024 })

      await expect(result).resolves.toEqual(unreachable(null))
      expect(http.get).not.toHaveBeenCalled()
    },
  )

  it("re-checks the target of a redirect", async () => {
    httpsRepliesWith(fakeResponse(302, { location: "http://192.168.1.1/admin" }))

    const result = safeFetch(new URL("https://acme.example/"), { maxBytes: 1024 })

    await expect(result).resolves.toEqual({ ok: false, message: "address_blocked" })
    expect(http.get).not.toHaveBeenCalled()
  })

  it("reports a redirect to a custom port as unreachable, not blocked", async () => {
    httpsRepliesWith(fakeResponse(302, { location: "https://acme.example:8443/" }))

    const result = safeFetch(new URL("https://acme.example/"), { maxBytes: 1024 })

    await expect(result).resolves.toEqual(unreachable(null))
    expect(https.get).toHaveBeenCalledTimes(1)
    expect(http.get).not.toHaveBeenCalled()
  })

  it("follows five redirects", async () => {
    httpsRepliesWith(
      ...Array.from({ length: 5 }, (_, i) =>
        fakeResponse(302, { location: `https://acme.example/${i + 1}` }),
      ),
      fakeResponse(200, {}, Buffer.from("ok")),
    )

    const result = await safeFetch(new URL("https://acme.example/"), { maxBytes: 1024 })

    expect(result.ok && result.resource.body.toString()).toBe("ok")
    expect(https.get).toHaveBeenCalledTimes(6)
  })

  it("gives up on a sixth redirect", async () => {
    httpsRepliesWith(
      ...Array.from({ length: 6 }, (_, i) =>
        fakeResponse(302, { location: `https://acme.example/${i + 1}` }),
      ),
    )

    const result = safeFetch(new URL("https://acme.example/"), { maxBytes: 1024 })

    await expect(result).resolves.toEqual(unreachable(null))
    expect(https.get).toHaveBeenCalledTimes(6)
  })

  it("connects through the guarded lookup", async () => {
    httpsRepliesWith(fakeResponse(200, {}, Buffer.from("ok")))

    await safeFetch(new URL("https://acme.example/"), { maxBytes: 1024 })

    expect(vi.mocked(https.get).mock.calls[0]?.[1]).toMatchObject({ lookup: guardedLookup })
  })

  it("truncates a page past its size limit", async () => {
    httpsRepliesWith(fakeResponse(200, {}, Buffer.alloc(2048, "a")))

    const result = await safeFetch(new URL("https://acme.example/"), {
      maxBytes: 1024,
      truncate: true,
    })

    expect(result.ok && result.resource.body.length).toBe(1024)
  })

  it("reports an image past its size limit as too large", async () => {
    httpsRepliesWith(fakeResponse(200, {}, Buffer.alloc(2048, "a")))

    const result = safeFetch(new URL("https://acme.example/logo.png"), { maxBytes: 1024 })

    await expect(result).resolves.toEqual({ ok: false, message: "response_too_large" })
  })

  it("reports the status of a failed response", async () => {
    httpsRepliesWith(fakeResponse(404, {}))

    const result = safeFetch(new URL("https://acme.example/"), { maxBytes: 1024 })

    await expect(result).resolves.toEqual(unreachable(404))
  })

  it("fails a response whose body is cut without an error event", async () => {
    const body = Object.assign(new Readable({ read() {} }), { statusCode: 200, headers: {} })
    httpsRepliesWith(body)
    queueMicrotask(() => body.destroy())

    const result = safeFetch(new URL("https://acme.example/"), { maxBytes: 1024 })

    await expect(result).resolves.toEqual(unreachable(null))
  })

  it("sends no request once the deadline has passed", async () => {
    const deadline = AbortSignal.abort()

    const result = safeFetch(new URL("https://acme.example/"), { maxBytes: 1024, deadline })

    await expect(result).resolves.toEqual({ ok: false, message: "site_too_slow" })
    expect(https.get).not.toHaveBeenCalled()
  })

  it("reports a request cut by the deadline as too slow, not as unreachable", async () => {
    const controller = new AbortController()
    vi.mocked(https.get).mockImplementationOnce((() => {
      const req = new EventEmitter()
      queueMicrotask(() => {
        controller.abort()
        req.emit("error", new Error("aborted"))
      })
      return req
    }) as never)

    const result = safeFetch(new URL("https://acme.example/"), {
      maxBytes: 1024,
      deadline: controller.signal,
    })

    await expect(result).resolves.toEqual({ ok: false, message: "site_too_slow" })
  })

  it("reports a response cut by the deadline as too slow", async () => {
    const controller = new AbortController()
    const body = Object.assign(new Readable({ read() {} }), { statusCode: 200, headers: {} })
    httpsRepliesWith(body)
    queueMicrotask(() => {
      controller.abort()
      body.destroy()
    })

    const result = safeFetch(new URL("https://acme.example/"), {
      maxBytes: 1024,
      deadline: controller.signal,
    })

    await expect(result).resolves.toEqual({ ok: false, message: "site_too_slow" })
  })

  it("reports a blocked address as such even when the deadline has passed", async () => {
    const controller = new AbortController()
    vi.mocked(https.get).mockImplementationOnce((() => {
      const req = new EventEmitter()
      queueMicrotask(() => {
        controller.abort()
        req.emit("error", new BlockedAddressError("intranet"))
      })
      return req
    }) as never)

    const result = safeFetch(new URL("https://acme.example/"), {
      maxBytes: 1024,
      deadline: controller.signal,
    })

    await expect(result).resolves.toEqual({ ok: false, message: "address_blocked" })
  })
})
