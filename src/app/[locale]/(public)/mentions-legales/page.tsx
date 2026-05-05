import type { Metadata, ResolvingMetadata } from 'next'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PageShell } from '@/components/layout/PageShell'
import { MarkdownContent } from '@/components/markdown/MarkdownContent'
import { StackedSkeleton } from '@/components/ui/stacked-skeleton'
import { setupLocalePage } from '@/i18n/locale-guard'
import { buildOnlyConnection } from '@/lib/build-only-connection'
import { formatSiret } from '@/lib/legal/format-siret'
import { loadLegalContent } from '@/lib/legal/load-legal-content'
import {
  buildPageMetadata,
  resolveParentOgImages,
  setupLocaleMetadata,
} from '@/lib/seo'
import { getHostingProvider, getPublisher } from '@/server/queries/legal'

export async function generateMetadata(
  { params }: PageProps<'/[locale]/mentions-legales'>,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const [{ locale, t }, parentImages] = await Promise.all([
    setupLocaleMetadata(params),
    resolveParentOgImages(parent),
  ])
  return buildPageMetadata({
    locale,
    path: '/mentions-legales',
    title: t('legalMentionsTitle'),
    description: t('legalMentionsDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
    parentOpenGraphImages: parentImages.og,
    parentTwitterImages: parentImages.twitter,
  })
}

export default async function MentionsLegalesPage({
  params,
}: PageProps<'/[locale]/mentions-legales'>) {
  const { locale } = await setupLocalePage(params)
  const t = await getTranslations('LegalMentions')

  return (
    <PageShell title={t('title')} subtitle={t('lastUpdated')}>
      <Suspense fallback={<StackedSkeleton heights={['h-64', 'h-48', 'h-32']} />}>
        <MentionsLegalesContentAsync locale={locale} />
      </Suspense>
    </PageShell>
  )
}

async function MentionsLegalesContentAsync({ locale }: { locale: Locale }) {
  await buildOnlyConnection()
  const [t, tLegal, publisher, hosting, legalContent] = await Promise.all([
    getTranslations('LegalMentions'),
    getTranslations('Legal'),
    getPublisher(),
    getHostingProvider(),
    loadLegalContent(locale, 'mentions'),
  ])

  if (!publisher?.publisher || !hosting) notFound()
  const pub = publisher.publisher
  const siret = publisher.siret ?? ''
  const siren = siret.slice(0, 9)

  const regionFormatter = new Intl.DisplayNames([locale], { type: 'region' })
  const numberFormatter = new Intl.NumberFormat(locale)

  const publisherCountry =
    regionFormatter.of(publisher.address.country) ?? publisher.address.country
  const hostingCountry =
    regionFormatter.of(hosting.address.country) ?? hosting.address.country

  const hostingLegalStatus = tLegal(
    `legalStatus.${hosting.legalStatusKey}` as Parameters<typeof tLegal>[0],
  )
  const hostingCapital =
    hosting.capitalAmount !== null && hosting.capitalCurrency !== null
      ? t('hosting.capitalLine', {
          legalStatus: hostingLegalStatus,
          amount: numberFormatter.format(hosting.capitalAmount),
          currency: hosting.capitalCurrency,
        })
      : hostingLegalStatus

  const hostingSiren = hosting.siret?.slice(0, 9) ?? ''

  return (
    <div className="space-y-12">
      <section className="flex flex-col gap-6">
        <h2>{t('identity.title')}</h2>
        <p className="text-muted-foreground">{t('identity.intro')}</p>
        <dl className="grid gap-3 sm:grid-cols-[max-content_1fr] sm:gap-x-6 sm:gap-y-3">
          <dt className="font-semibold">{t('identity.legalNameLabel')}</dt>
          <dd>{publisher.name}</dd>

          <dt className="font-semibold">{t('identity.statusLabel')}</dt>
          <dd>
            {tLegal(
              `legalStatus.${publisher.legalStatusKey}` as Parameters<
                typeof tLegal
              >[0],
            )}
          </dd>

          <dt className="font-semibold">{t('identity.sirenLabel')}</dt>
          <dd>{siren}</dd>

          <dt className="font-semibold">{t('identity.siretLabel')}</dt>
          <dd>{formatSiret(siret)}</dd>

          <dt className="font-semibold">{t('identity.registrationLabel')}</dt>
          <dd>
            {t('identity.registrationValue', {
              type: pub.registrationType,
              siren,
            })}
          </dd>

          <dt className="font-semibold">{t('identity.apeLabel')}</dt>
          <dd>
            {t('identity.apeValue', {
              code: pub.apeCode,
              label: tLegal(
                `ape.${pub.apeCode}` as Parameters<typeof tLegal>[0],
              ),
            })}
          </dd>

          <dt className="font-semibold">{t('identity.addressLabel')}</dt>
          <dd>
            {publisher.address.street}, {publisher.address.postalCode}{' '}
            {publisher.address.city}, {publisherCountry}
          </dd>

          <dt className="font-semibold">{t('identity.emailLabel')}</dt>
          <dd>
            <a
              href={`mailto:${pub.publicEmail}`}
              className="text-primary hover:underline"
            >
              {pub.publicEmail}
            </a>
          </dd>

          <dt className="font-semibold">{t('identity.directorLabel')}</dt>
          <dd>{publisher.name}</dd>
        </dl>
        {pub.vatRegime === 'FRANCHISE' ? (
          <p className="text-sm text-muted-foreground">
            {t('identity.vatNotApplicable')}
          </p>
        ) : publisher.vatNumber ? (
          <p>
            <span className="font-semibold">
              {t('identity.vatNumberLabel')} :
            </span>{' '}
            {publisher.vatNumber}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-6">
        <h2>{t('hosting.title')}</h2>
        <p className="text-muted-foreground">{t('hosting.intro')}</p>
        <dl className="grid gap-3 sm:grid-cols-[max-content_1fr] sm:gap-x-6 sm:gap-y-3">
          <dt className="font-semibold">{t('hosting.nameLabel')}</dt>
          <dd>{hosting.name}</dd>

          <dt className="font-semibold">{t('hosting.legalFormLabel')}</dt>
          <dd>{hostingCapital}</dd>

          <dt className="font-semibold">{t('hosting.addressLabel')}</dt>
          <dd>
            {hosting.address.street}, {hosting.address.postalCode}{' '}
            {hosting.address.city}, {hostingCountry}
          </dd>

          {hosting.rcsCity && hostingSiren ? (
            <>
              <dt className="font-semibold">{t('hosting.rcsLabel')}</dt>
              <dd>
                {hosting.rcsCity} {formatSiret(hostingSiren)}
              </dd>
            </>
          ) : null}

          {hosting.phone ? (
            <>
              <dt className="font-semibold">{t('hosting.phoneLabel')}</dt>
              <dd>{hosting.phone}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <MarkdownContent markdown={legalContent} />
    </div>
  )
}

