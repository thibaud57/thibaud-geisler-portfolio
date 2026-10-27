"use client"

import { useMemo, type ReactNode } from "react"
import { useLocale } from "next-intl"
import dynamic from "next/dynamic"
import { policyRulePresets } from "c15t"
import { ConsentProvider, type ConsentProviderOptions } from "c15t/next"
import { offline } from "c15t/react"
import { baseTranslations } from "@c15t/translations/all"

import frMessages from "../../messages/fr.json"
import enMessages from "../../messages/en.json"

import { Toaster } from "@/components/ui/sonner"
import { ConsentLanguageSync } from "@/components/cookies/consent-language-sync"
import { consentTheme } from "@/components/cookies/consent-theme"
import { buildLegalLinks } from "@/lib/cookies/build-legal-links"

// Surfaces chargées par le seul module consent-ui : c'est cette frontière de chunk qui garde
// leur code et leur CSS hors du bundle synchrone.
// ssr: false assumé : overlays purement interactifs, aucun contenu indexable.
const ConsentBanner = dynamic(
  () => import("@/components/cookies/consent-ui").then((m) => m.ConsentBanner),
  { ssr: false },
)
const ConsentDialog = dynamic(
  () => import("@/components/cookies/consent-ui").then((m) => m.ConsentDialog),
  { ssr: false },
)

// Override des descriptions par défaut de c15t : sa copie générique mentionne mesure
// d'audience et contenu personnalisé, deux traitements que ce site ne fait pas.
// Clone obligatoire : ne pas muter l'objet exporté par la lib.
const consentMessages = structuredClone(baseTranslations)
consentMessages.fr.cookieBanner.description = frMessages.Cookies.bannerDescription
consentMessages.en.cookieBanner.description = enMessages.Cookies.bannerDescription

const offlineMode = offline({ policyRules: [policyRulePresets.europeOptIn()] })

export function Providers({ children }: { children: ReactNode }) {
  const locale = useLocale()
  const consentOptions = useMemo<ConsentProviderOptions>(
    () => ({
      mode: offlineMode,
      overrides: { country: "FR" },
      consentCategories: ["necessary", "marketing"],
      i18n: {
        locale,
        detectBrowserLanguage: false,
        messages: consentMessages,
      },
      legalLinks: buildLegalLinks(locale),
      theme: consentTheme,
    }),
    [locale],
  )

  return (
    <ConsentProvider options={consentOptions}>
      <ConsentLanguageSync />
      {children}
      <ConsentBanner hideBranding legalLinks={["privacyPolicy"]} />
      <ConsentDialog hideBranding legalLinks={["privacyPolicy"]} />
      <Toaster />
    </ConsentProvider>
  )
}
