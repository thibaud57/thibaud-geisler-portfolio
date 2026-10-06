import type { CompanyLogo } from "@/server/company-logo/fetch-company-logo"

export type CompanyLogoFailure =
  | { ok: false; message: "invalid_input" | "address_blocked" | "no_icon_found" | "unknown_error" }
  | { ok: false; message: "site_unreachable"; status: number | null }
  | { ok: false; message: "icon_too_small"; size: number }

export type CompanyLogoResult = ({ ok: true } & CompanyLogo) | CompanyLogoFailure
