"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import { ADMIN_ASSETS_PATH } from "@/lib/admin/routes"
import { getCurrentUser } from "@/lib/get-current-user"
import { isValidWebsiteUrl } from "@/lib/schemas/company"
import { SLUG_PATTERN } from "@/lib/schemas/slug"
import { createActionLogger } from "@/lib/server-utils"
import { NoIconFoundError, retrieveCompanyLogo } from "@/server/company-logo/fetch-company-logo"
import { IconTooSmallError } from "@/server/company-logo/normalize-icon"
import {
  BlockedAddressError,
  DeadlineExceededError,
  FetchFailedError,
} from "@/server/company-logo/safe-fetch"

import type { CompanyLogoFailure, CompanyLogoResult } from "./company-logo.types"

function toFailure(err: unknown): CompanyLogoFailure | null {
  if (err instanceof BlockedAddressError) return { ok: false, message: "address_blocked" }
  if (err instanceof DeadlineExceededError) return { ok: false, message: "site_too_slow" }
  if (err instanceof FetchFailedError)
    return { ok: false, message: "site_unreachable", status: err.status }
  if (err instanceof NoIconFoundError) return { ok: false, message: "no_icon_found" }
  if (err instanceof IconTooSmallError)
    return { ok: false, message: "icon_too_small", size: err.size }
  return null
}

export async function fetchCompanyLogo(
  websiteUrl: string,
  slug: string,
): Promise<CompanyLogoResult> {
  await getCurrentUser()

  return createActionLogger("fetchCompanyLogo", async ({ log }): Promise<CompanyLogoResult> => {
    // Le formulaire met le slug en minuscules à l'enregistrement : le logo doit tomber dans ce dossier-là.
    const url = websiteUrl.trim()
    const normalizedSlug = slug.trim().toLowerCase()
    if (!isValidWebsiteUrl(url) || !SLUG_PATTERN.test(normalizedSlug)) {
      return { ok: false, message: "invalid_input" }
    }

    const host = new URL(url).host
    try {
      const logo = await retrieveCompanyLogo(url, normalizedSlug)
      revalidatePath(ADMIN_ASSETS_PATH)
      log.info({
        event: "company_logo:fetched",
        host,
        source: logo.source,
        width: logo.width,
        height: logo.height,
      })
      return { ok: true, ...logo }
    } catch (err) {
      const failure = toFailure(err)
      if (failure) {
        log.warn({ event: "company_logo:not_fetched", host, reason: failure.message })
        return failure
      }
      log.error({ err, event: "company_logo:fetch_failed", host })
      return { ok: false, message: "unknown_error" }
    }
  })
}
