import { describe, expect, it } from "vitest"

import { assetUploadSchema } from "./asset"

function slugMessage(input: unknown) {
  const result = assetUploadSchema.safeParse(input)
  return result.success ? null : result.error.issues.find((i) => i.path[0] === "slug")?.message
}

describe("assetUploadSchema", () => {
  it("requires a slug for a folder that nests by slug", () => {
    const message = slugMessage({ folder: "projets/client", slug: "", filename: "cover.png" })

    expect(message).toBe("Ce dossier attend un sous-dossier de destination")
  })

  it("rejects a malformed slug", () => {
    const message = slugMessage({
      folder: "projets/client",
      slug: "Mon Projet!",
      filename: "a.png",
    })

    expect(message).toBe("Slug invalide : minuscules, chiffres et tirets uniquement")
  })

  it("rejects a slug on a folder without sub-folders", () => {
    const message = slugMessage({ folder: "branding", slug: "extra", filename: "logo.png" })

    expect(message).toBe("Ce dossier n'accepte pas de sous-dossier")
  })

  it("accepts an empty slug on a folder without sub-folders", () => {
    const result = assetUploadSchema.safeParse({
      folder: "branding",
      slug: "",
      filename: "logo.png",
    })

    expect(result.success && result.data.slug).toBeUndefined()
  })

  it("rejects an unknown folder", () => {
    const result = assetUploadSchema.safeParse({ folder: "elsewhere", slug: "", filename: "a.png" })

    expect(result.success).toBe(false)
  })
})
