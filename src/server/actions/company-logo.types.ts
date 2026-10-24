import type { CompanyIconFailure, CompanyLogo } from "@/server/company-logo/fetch-company-logo"

export type CompanyLogoFailure =
  CompanyIconFailure | { ok: false; message: "invalid_input" | "unknown_error" }

export type CompanyLogoResult = ({ ok: true } & CompanyLogo) | CompanyLogoFailure
