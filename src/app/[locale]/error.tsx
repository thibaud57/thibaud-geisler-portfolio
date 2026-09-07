"use client"

import { AlertCircle } from "lucide-react"
import { useTranslations } from "next-intl"

import { PageShell } from "@/components/layout/PageShell"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

// TODO post-MVP : envoyer `error` à Sentry (cf. PRODUCTION.md > Monitoring). Tant que rien
// ne le consomme, il n'est pas déstructuré : le lire pour rien serait une expression morte.
export default function Error({ reset }: Props) {
  const t = useTranslations("ErrorPage")
  const tCommon = useTranslations("Common")

  return (
    <PageShell title={t("title")} subtitle={t("message")}>
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <AlertCircle aria-hidden className="size-16 text-destructive" strokeWidth={1.5} />
        <p className="text-base text-muted-foreground">{t("description")}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button type="button" size="lg" onClick={reset}>
            {tCommon("retry")}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">{t("ctaLabel")}</Link>
          </Button>
        </div>
      </section>
    </PageShell>
  )
}
