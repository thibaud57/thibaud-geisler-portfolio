"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import { ADMIN_ASSETS_PATH } from "@/lib/admin/routes"
import { getCurrentUser } from "@/lib/get-current-user"
import { companyLogoRequestSchema } from "@/lib/schemas/company-logo"
import { createActionLogger } from "@/lib/server-utils"
import { retrieveCompanyLogo } from "@/server/company-logo/fetch-company-logo"

import type { CompanyLogoResult } from "./company-logo.types"

export async function fetchCompanyLogo(
  websiteUrl: string,
  slug: string,
): Promise<CompanyLogoResult> {
  await getCurrentUser()

  return createActionLogger("fetchCompanyLogo", async ({ log }): Promise<CompanyLogoResult> => {
    const parsed = companyLogoRequestSchema.safeParse({ websiteUrl, slug })
    if (!parsed.success) return { ok: false, message: "invalid_input" }
    const { websiteUrl: url, slug: normalizedSlug } = parsed.data
    const host = url.host

    try {
      const outcome = await retrieveCompanyLogo(url, normalizedSlug)
      if (!outcome.ok) {
        log.warn({ event: "company_logo:not_fetched", host, reason: outcome.message })
        return outcome
      }
      revalidatePath(ADMIN_ASSETS_PATH)
      log.info({
        event: "company_logo:fetched",
        host,
        source: outcome.source,
        width: outcome.width,
        height: outcome.height,
      })
      return outcome
    } catch (err) {
      log.error({ err, event: "company_logo:fetch_failed", host })
      return { ok: false, message: "unknown_error" }
    }
  })
}
