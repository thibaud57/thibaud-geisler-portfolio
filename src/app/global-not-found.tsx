import type { Metadata } from "next"
import type { Locale } from "next-intl"
import { getTranslations } from "next-intl/server"

import {
  GlobalNotFoundContent,
  type NotFoundMessages,
} from "@/components/layout/GlobalNotFoundContent"
import { fontVariables } from "@/lib/fonts"
import { routing } from "@/i18n/routing"
import { themeInitScript } from "@/lib/theme-script"
import "@/app/globals.css"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({
    locale: routing.defaultLocale,
    namespace: "NotFound",
  })
  return {
    title: t("message"),
    robots: { index: false, follow: false },
  }
}

async function loadMessages(locale: Locale): Promise<NotFoundMessages> {
  const t = await getTranslations({ locale, namespace: "NotFound" })
  return { title: t("title"), description: t("description"), ctaLabel: t("ctaLabel") }
}

// 404 de toute URL sans route, y compris un slug de projet inconnu que le proxy réécrit ici
// (experimental.globalNotFound). Pas de [locale]/[...rest] vers [locale]/not-found.tsx : le
// loading.tsx de [locale] ouvre le stream avant le notFound(), le statut resterait à 200.
// Ce fichier rend son propre document, hors du root layout [locale] et de ses providers : la
// page est prérendue une seule fois, les deux locales partent donc au client, qui choisit
// d'après l'URL comme global-error.
export default async function GlobalNotFound() {
  const [fr, en] = await Promise.all([loadMessages("fr"), loadMessages("en")])
  const messages: Record<Locale, NotFoundMessages> = { fr, en }

  return (
    <html lang={routing.defaultLocale} className={fontVariables} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <GlobalNotFoundContent messages={messages} />
      </body>
    </html>
  )
}
