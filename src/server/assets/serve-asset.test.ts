import { describe, expect, it } from "vitest"
import { getContentType, validateAssetPath } from "./serve-asset"

describe("AssetPathSchema + validateAssetPath", () => {
  it("returns the segments and the joined key of a simple path", () => {
    const result = validateAssetPath(["test.png"])

    expect(result).toEqual({
      ok: true,
      segments: ["test.png"],
      joined: "test.png",
    })
  })

  it.each([
    ["a nested path", ["projets", "client", "projet-exemple", "logo.png"]],
    ["a hyphenated file name", ["projets", "client", "projet-exemple", "webapp-gestion-1.webp"]],
    ["five segments", ["a", "b", "c", "d", "e.svg"]],
    ["uppercase letters", ["Projets", "Client", "Photo.JPEG"]],
    ["a PDF under documents/cv", ["documents", "cv", "cv-thibaud-geisler-fr.pdf"]],
    ["an uppercase PDF extension", ["documents", "cv", "CV-TEST.PDF"]],
  ])("accepts %s", (_label, segments) => {
    const result = validateAssetPath(segments)

    expect(result.ok).toBe(true)
  })

  it.each([
    ["a parent directory segment", ["..", "etc", "passwd.png"]],
    ["a current directory segment", [".", "image.png"]],
    ["a parent directory segment in the middle", ["projets", "..", "secret.png"]],
    ["a slash inside a segment", ["sub/folder", "image.png"]],
    ["a backslash inside a segment", ["..\\file.png"]],
    ["a space", ["foo .png"]],
    ["an emoji", ["📷.png"]],
    ["an empty segment", [""]],
    ["no segment at all", []],
    ["an extension outside the allow-list", ["malware.exe"]],
    ["another extension outside the allow-list", ["doc.docx"]],
    ["a segment starting with a dot", [".htaccess"]],
    ["more than 5 segments", ["a", "b", "c", "d", "e", "f.png"]],
    ["an extension on a folder instead of the last segment", ["projets.png", "client", "logo"]],
  ])("rejects %s", (_label, segments) => {
    const result = validateAssetPath(segments)

    expect(result.ok).toBe(false)
  })

  it("rejects a key longer than the 1024 characters R2 accepts", () => {
    const result = validateAssetPath(["documents", `${"a".repeat(1100)}.pdf`])

    expect(result).toEqual({ ok: false, error: "Chemin trop long" })
  })
})

describe("getContentType", () => {
  it.each([
    ["a.png", "image/png"],
    ["a.jpg", "image/jpeg"],
    ["a.jpeg", "image/jpeg"],
    ["a.webp", "image/webp"],
    ["a.svg", "image/svg+xml"],
    ["a.pdf", "application/pdf"],
    ["Test.PNG", "image/png"],
    ["CV.PDF", "application/pdf"],
    ["a.xyz", "application/octet-stream"],
    ["noext", "application/octet-stream"],
  ])("maps %s to %s", (filename, expected) => {
    const result = getContentType(filename)

    expect(result).toBe(expected)
  })
})
