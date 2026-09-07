import type { Locale } from "next-intl"

import { getPathname } from "@/i18n/navigation"

interface LegalLinks {
  privacyPolicy: { href: string; target: "_self" }
}

export function buildLegalLinks(locale: Locale): LegalLinks {
  return {
    privacyPolicy: {
      href: getPathname({ href: "/confidentialite", locale }),
      target: "_self",
    },
  }
}
