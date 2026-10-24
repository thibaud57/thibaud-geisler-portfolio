import type { Metadata, ResolvingMetadata } from "next"
import { io } from "next/cache"
import type { Locale } from "next-intl"
import { getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { PageShell } from "@/components/layout/public/PageShell"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { setupLocalePage } from "@/i18n/locale-guard"
import { countryName, sirenFromSiret } from "@/lib/crm/legal-entities"
import { formatSiret } from "@/lib/legal/format-siret"
import { loadLegalContent } from "@/lib/legal/load-legal-content"
import { isVatLiable } from "@/lib/legal/vat-status"
import { ApeCode } from "@/lib/schemas/legal-keys"
import { LINK_CLASS } from "@/lib/typography"
import { indexable } from "@/config/indexing"
import { buildPageMetadata, resolveParentOgImages, setupLocaleMetadata } from "@/lib/seo"
import { getHostingProvider, getPublisher } from "@/server/queries/legal"

export async function generateMetadata(
  { params }: PageProps<"/[locale]/mentions-legales">,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const [{ locale, t }, parentImages] = await Promise.all([
    setupLocaleMetadata(params),
    resolveParentOgImages(parent),
  ])
  return buildPageMetadata({
    locale,
    path: "/mentions-legales",
    title: t("legalMentionsTitle"),
    description: t("legalMentionsDescription"),
    siteName: t("siteTitle"),
    indexable,
    ogType: "website",
    parentOpenGraphImages: parentImages.og,
    parentTwitterImages: parentImages.twitter,
  })
}

export default async function MentionsLegalesPage({
  params,
}: PageProps<"/[locale]/mentions-legales">) {
  const { locale } = await setupLocalePage(params)
  const t = await getTranslations("LegalMentions")

  return (
    <PageShell title={t("title")} subtitle={t("lastUpdated")}>
      <Suspense
        fallback={
          <StackedSkeleton
            heights={["h-[783px] sm:h-[436px]", "h-[783px] sm:h-[436px]", "h-[783px] sm:h-[436px]"]}
          />
        }
      >
        <MentionsLegalesContentAsync locale={locale} />
      </Suspense>
    </PageShell>
  )
}

async function MentionsLegalesContentAsync({ locale }: { locale: Locale }) {
  await io()
  const [t, tLegalStatus, tApe, publisher, hosting, legalContent] = await Promise.all([
    getTranslations("LegalMentions"),
    getTranslations("Legal.legalStatus"),
    getTranslations("Legal.ape"),
    getPublisher(),
    getHostingProvider(),
    loadLegalContent(locale, "mentions"),
  ])

  const siren = sirenFromSiret(publisher?.siret ?? null)
  const hostingSiren = sirenFromSiret(hosting?.siret ?? null)

  // Facultatifs en base, mais requis ici pour l'éditeur comme pour l'hébergeur.
  if (
    !publisher?.publisher ||
    !hosting ||
    !publisher.address ||
    !hosting.address ||
    !publisher.legalForm ||
    !hosting.legalForm ||
    !publisher.siret ||
    !siren
  ) {
    notFound()
  }
  const pub = publisher.publisher
  const vatLiable = isVatLiable(pub, new Date())
  const siret = publisher.siret
  // Parsé ici et non dans getPublisher, partagé avec le Footer : une clé hors enum ne casse que cette page.
  const apeCode = ApeCode.parse(pub.apeCode)

  const numberFormatter = new Intl.NumberFormat(locale)

  const publisherCountry = countryName(publisher.address.country, locale)
  const hostingCountry = countryName(hosting.address.country, locale)

  const hostingLegalStatus = tLegalStatus(hosting.legalForm)
  const hostingCapital =
    hosting.capitalAmount !== null && hosting.capitalCurrency !== null
      ? t("hosting.capitalLine", {
          legalStatus: hostingLegalStatus,
          amount: numberFormatter.format(hosting.capitalAmount),
          currency: hosting.capitalCurrency,
        })
      : hostingLegalStatus

  return (
    <div className="space-y-12">
      <section className="flex flex-col gap-6">
        <h2>{t("identity.title")}</h2>
        <p className="text-muted-foreground">{t("identity.intro")}</p>
        <dl className="grid gap-3 sm:grid-cols-[max-content_1fr] sm:gap-x-6 sm:gap-y-3">
          <dt className="font-semibold">{t("identity.legalNameLabel")}</dt>
          <dd>{publisher.name}</dd>

          <dt className="font-semibold">{t("identity.statusLabel")}</dt>
          <dd>{tLegalStatus(publisher.legalForm)}</dd>

          <dt className="font-semibold">{t("identity.sirenLabel")}</dt>
          <dd>{siren}</dd>

          <dt className="font-semibold">{t("identity.siretLabel")}</dt>
          <dd>{formatSiret(siret)}</dd>

          <dt className="font-semibold">{t("identity.registrationLabel")}</dt>
          <dd>
            {t("identity.registrationValue", {
              type: pub.registrationType,
              siren,
            })}
          </dd>

          <dt className="font-semibold">{t("identity.apeLabel")}</dt>
          <dd>
            {t("identity.apeValue", {
              code: apeCode,
              label: tApe(apeCode),
            })}
          </dd>

          <dt className="font-semibold">{t("identity.addressLabel")}</dt>
          <dd>
            {publisher.address.street}, {publisher.address.postalCode} {publisher.address.city},{" "}
            {publisherCountry}
          </dd>

          <dt className="font-semibold">{t("identity.emailLabel")}</dt>
          <dd>
            <a href={`mailto:${pub.publicEmail}`} className={LINK_CLASS}>
              {pub.publicEmail}
            </a>
          </dd>

          <dt className="font-semibold">{t("identity.directorLabel")}</dt>
          <dd>{publisher.name}</dd>

          {vatLiable && (
            <>
              <dt className="font-semibold">{t("identity.vatNumberLabel")}</dt>
              <dd>{publisher.vatNumber}</dd>
            </>
          )}
        </dl>
        {!vatLiable && (
          <p className="text-sm text-muted-foreground">{t("identity.vatNotApplicable")}</p>
        )}
      </section>

      <section className="flex flex-col gap-6">
        <h2>{t("hosting.title")}</h2>
        <p className="text-muted-foreground">{t("hosting.intro")}</p>
        <dl className="grid gap-3 sm:grid-cols-[max-content_1fr] sm:gap-x-6 sm:gap-y-3">
          <dt className="font-semibold">{t("hosting.nameLabel")}</dt>
          <dd>{hosting.name}</dd>

          <dt className="font-semibold">{t("hosting.legalFormLabel")}</dt>
          <dd>{hostingCapital}</dd>

          <dt className="font-semibold">{t("hosting.addressLabel")}</dt>
          <dd>
            {hosting.address.street}, {hosting.address.postalCode} {hosting.address.city},{" "}
            {hostingCountry}
          </dd>

          {hosting.rcsCity && hostingSiren ? (
            <>
              <dt className="font-semibold">{t("hosting.rcsLabel")}</dt>
              <dd>
                {hosting.rcsCity} {formatSiret(hostingSiren)}
              </dd>
            </>
          ) : null}

          {hosting.phone ? (
            <>
              <dt className="font-semibold">{t("hosting.phoneLabel")}</dt>
              <dd>{hosting.phone}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <MarkdownContent markdown={legalContent} />
    </div>
  )
}
