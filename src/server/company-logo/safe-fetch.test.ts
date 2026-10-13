import { EventEmitter } from "node:events"
import { Readable } from "node:stream"
import { describe, expect, it, vi } from "vitest"

vi.mock("node:dns", () => ({ lookup: vi.fn() }))
vi.mock("node:http", () => ({ default: { get: vi.fn() } }))
vi.mock("node:https", () => ({ default: { get: vi.fn() } }))

import { lookup, type LookupAddress } from "node:dns"
import http from "node:http"
import https from "node:https"

import {
  BlockedAddressError,
  FetchFailedError,
  guardedLookup,
  ResponseTooLargeError,
  safeFetch,
} from "./safe-fetch"

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
  it("refuses a host name that resolves to a private address", () => {
    dnsAnswers([{ address: "10.0.0.5", family: 4 }])
    const callback = vi.fn()

    guardedLookup("intranet.acme.example", {}, callback)

    expect(callback.mock.calls[0]?.[0]).toBeInstanceOf(BlockedAddressError)
  })

  it("refuses a host name when any resolved address is private", () => {
    dnsAnswers([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ])
    const callback = vi.fn()

    guardedLookup("mixed.acme.example", {}, callback)

    expect(callback.mock.calls[0]?.[0]).toBeInstanceOf(BlockedAddressError)
  })

  it("refuses a host name that resolves to nothing", () => {
    dnsAnswers([])
    const callback = vi.fn()

    guardedLookup("empty.acme.example", {}, callback)

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
      const result = safeFetch(target, { maxBytes: 1024 })

      await expect(result).rejects.toBeInstanceOf(BlockedAddressError)
      expect(http.get).not.toHaveBeenCalled()
    },
  )

  it.each(["ftp://acme.example/", "http://acme.example:8080/", "http://user:secret@acme.example/"])(
    "reports a non-http scheme, a port or credentials as unreachable (%s)",
    async (target) => {
      const result = safeFetch(target, { maxBytes: 1024 })

      await expect(result).rejects.toBeInstanceOf(FetchFailedError)
      expect(http.get).not.toHaveBeenCalled()
    },
  )

  it("re-checks the target of a redirect", async () => {
    httpsRepliesWith(fakeResponse(302, { location: "http://192.168.1.1/admin" }))

    const result = safeFetch("https://acme.example/", { maxBytes: 1024 })

    await expect(result).rejects.toBeInstanceOf(BlockedAddressError)
    expect(http.get).not.toHaveBeenCalled()
  })

  it("reports a redirect to a custom port as unreachable, not blocked", async () => {
    httpsRepliesWith(fakeResponse(302, { location: "https://acme.example:8443/" }))

    const result = safeFetch("https://acme.example/", { maxBytes: 1024 })

    await expect(result).rejects.toBeInstanceOf(FetchFailedError)
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

    const page = await safeFetch("https://acme.example/", { maxBytes: 1024 })

    expect(page.body.toString()).toBe("ok")
    expect(https.get).toHaveBeenCalledTimes(6)
  })

  it("gives up on a sixth redirect", async () => {
    httpsRepliesWith(
      ...Array.from({ length: 6 }, (_, i) =>
        fakeResponse(302, { location: `https://acme.example/${i + 1}` }),
      ),
    )

    const result = safeFetch("https://acme.example/", { maxBytes: 1024 })

    await expect(result).rejects.toBeInstanceOf(FetchFailedError)
    expect(https.get).toHaveBeenCalledTimes(6)
  })

  it("connects through the guarded lookup", async () => {
    httpsRepliesWith(fakeResponse(200, {}, Buffer.from("ok")))

    await safeFetch("https://acme.example/", { maxBytes: 1024 })

    expect(vi.mocked(https.get).mock.calls[0]?.[1]).toMatchObject({ lookup: guardedLookup })
  })

  it("truncates a page past its size limit", async () => {
    httpsRepliesWith(fakeResponse(200, {}, Buffer.alloc(2048, "a")))

    const page = await safeFetch("https://acme.example/", { maxBytes: 1024, truncate: true })

    expect(page.body.length).toBe(1024)
  })

  it("rejects an image past its size limit", async () => {
    httpsRepliesWith(fakeResponse(200, {}, Buffer.alloc(2048, "a")))

    const result = safeFetch("https://acme.example/logo.png", { maxBytes: 1024 })

    await expect(result).rejects.toBeInstanceOf(ResponseTooLargeError)
  })

  it("reports the status of a failed response", async () => {
    httpsRepliesWith(fakeResponse(404, {}))

    const result = safeFetch("https://acme.example/", { maxBytes: 1024 })

    await expect(result).rejects.toBeInstanceOf(FetchFailedError)
    await expect(result).rejects.toMatchObject({ status: 404 })
  })
})
