import type { Metadata, ResolvingMetadata } from 'next'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { OpenCookiePreferencesButton } from '@/components/features/legal/OpenCookiePreferencesButton'
import { PageShell } from '@/components/layout/PageShell'
import { MarkdownContent } from '@/components/markdown/MarkdownContent'
import { StackedSkeleton } from '@/components/ui/stacked-skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { setupLocalePage } from '@/i18n/locale-guard'
import { loadLegalContent } from '@/lib/legal/load-legal-content'
import {
  buildPageMetadata,
  resolveParentOgImages,
  setupLocaleMetadata,
} from '@/lib/seo'
import { getDataProcessors, getPublisher } from '@/server/queries/legal'

export async function generateMetadata(
  { params }: PageProps<'/[locale]/confidentialite'>,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const [{ locale, t }, parentImages] = await Promise.all([
    setupLocaleMetadata(params),
    resolveParentOgImages(parent),
  ])
  return buildPageMetadata({
    locale,
    path: '/confidentialite',
    title: t('privacyPolicyTitle'),
    description: t('privacyPolicyDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
    parentOpenGraphImages: parentImages.og,
    parentTwitterImages: parentImages.twitter,
  })
}

export default async function ConfidentialitePage({
  params,
}: PageProps<'/[locale]/confidentialite'>) {
  const { locale } = await setupLocalePage(params)
  const t = await getTranslations('PrivacyPolicy')

  return (
    <PageShell title={t('title')} subtitle={t('lastUpdated')}>
      <Suspense fallback={<StackedSkeleton heights={['h-32', 'h-64', 'h-48']} />}>
        <ConfidentialiteContentAsync locale={locale} />
      </Suspense>
    </PageShell>
  )
}

async function ConfidentialiteContentAsync({ locale }: { locale: Locale }) {
  const [t, tLegal, publisher, processors, introContent, cookiesContent] =
    await Promise.all([
      getTranslations('PrivacyPolicy'),
      getTranslations('Legal'),
      getPublisher(),
      getDataProcessors(),
      loadLegalContent(locale, 'confidentialite-intro'),
      loadLegalContent(locale, 'confidentialite-cookies'),
    ])

  if (!publisher?.publisher) notFound()
  const pub = publisher.publisher

  const regionFormatter = new Intl.DisplayNames([locale], { type: 'region' })

  const transfersOutsideEu = processors.flatMap((entry) => {
    const framework = entry.processing.outsideEuFramework
    return framework !== null ? [{ ...entry, framework }] : []
  })

  return (
    <div className="space-y-12">
      <MarkdownContent markdown={introContent} />

      <section className="flex flex-col gap-6">
        <h2>
          {t('recipients.title')}
        </h2>
        <p className="text-muted-foreground">{t('recipients.intro')}</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('recipients.tableHeaders.name')}</TableHead>
              <TableHead>{t('recipients.tableHeaders.role')}</TableHead>
              <TableHead>{t('recipients.tableHeaders.purpose')}</TableHead>
              <TableHead>{t('recipients.tableHeaders.country')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processors.map((entry) => {
              const purpose =
                locale === 'fr'
                  ? entry.processing.purposeFr
                  : entry.processing.purposeEn
              const country =
                regionFormatter.of(entry.address.country) ??
                entry.address.country
              return (
                <TableRow key={entry.processing.slug}>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell>
                    {tLegal(`processingKind.${entry.processing.kind}`)}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {purpose}
                  </TableCell>
                  <TableCell>{country}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-6">
        <h2>
          {t('retention.title')}
        </h2>
        <p className="text-muted-foreground">{t('retention.intro')}</p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('retention.tableHeaders.processor')}</TableHead>
              <TableHead>{t('retention.tableHeaders.duration')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processors.map((entry) => (
              <TableRow key={entry.processing.slug}>
                <TableCell className="font-medium">{entry.name}</TableCell>
                <TableCell className="whitespace-normal">
                  {tLegal(
                    `retention.${entry.processing.retentionPolicyKey}` as Parameters<
                      typeof tLegal
                    >[0],
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-6">
        <h2>
          {t('rights.title')}
        </h2>
        <p className="text-muted-foreground">
          {t.rich('rights.body', {
            mail: (chunks) => (
              <a
                href={`mailto:${pub.publicEmail}`}
                className="text-primary hover:underline"
              >
                {chunks}
              </a>
            ),
            cnil: (chunks) => (
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </section>

      {transfersOutsideEu.length > 0 ? (
        <section className="flex flex-col gap-6">
          <h2>
            {t('transfers.title')}
          </h2>
          <p className="text-muted-foreground">{t('transfers.intro')}</p>
          <ul className="flex flex-col gap-2">
            {transfersOutsideEu.map((entry) => {
              const country =
                regionFormatter.of(entry.address.country) ??
                entry.address.country
              return (
                <li key={entry.processing.slug}>
                  <span className="font-semibold">{entry.name}</span> (
                  {country}) -{' '}
                  {tLegal(`outsideEuFramework.${entry.framework}`)}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <MarkdownContent markdown={cookiesContent} />
        <OpenCookiePreferencesButton variant="outline" className="mt-4" />
      </section>
    </div>
  )
}

