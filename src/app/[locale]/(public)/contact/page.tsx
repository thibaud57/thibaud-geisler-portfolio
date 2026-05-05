import type { Metadata, ResolvingMetadata } from 'next'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { env } from '@/env'
import { setupLocalePage } from '@/i18n/locale-guard'
import { logger } from '@/lib/logger'
import { buildPageMetadata, resolveParentOgImages, setupLocaleMetadata } from '@/lib/seo'

import { CalendlyWidget } from '@/components/features/contact/CalendlyWidget'
import { ContactForm } from '@/components/features/contact/ContactForm'
import { ContactTabs } from '@/components/features/contact/ContactTabs'
import { LocationLine } from '@/components/features/contact/LocationLine'
import { SocialLinks } from '@/components/features/contact/SocialLinks'
import { PageShell } from '@/components/layout/PageShell'

const PREFILL_SLUGS = ['ia', 'fullstack', 'formation'] as const
type PrefillSlug = (typeof PREFILL_SLUGS)[number]

function isPrefillSlug(value: string | undefined): value is PrefillSlug {
  return typeof value === 'string' && (PREFILL_SLUGS as readonly string[]).includes(value)
}

const CALENDLY_URL_BY_LOCALE = {
  fr: env.NEXT_PUBLIC_CALENDLY_URL_FR,
  en: env.NEXT_PUBLIC_CALENDLY_URL_EN,
} as const satisfies Record<Locale, string | undefined>

export async function generateMetadata(
  { params }: PageProps<'/[locale]/contact'>,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const [{ locale, t }, parentImages] = await Promise.all([
    setupLocaleMetadata(params),
    resolveParentOgImages(parent),
  ])
  return buildPageMetadata({
    locale,
    path: '/contact',
    title: t('contactTitle'),
    description: t('contactDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
    parentOpenGraphImages: parentImages.og,
    parentTwitterImages: parentImages.twitter,
  })
}

export default async function ContactPage({
  params,
  searchParams,
}: PageProps<'/[locale]/contact'>) {
  const { locale } = await setupLocalePage(params)
  const resolvedSearchParams = await searchParams
  const rawService = resolvedSearchParams?.service
  const serviceParam = Array.isArray(rawService) ? rawService[0] : rawService

  const t = await getTranslations('ContactPage')

  const defaultSubject = isPrefillSlug(serviceParam) ? t(`form.subjectPrefill.${serviceParam}`) : ''

  const formLabels = {
    name: t('form.fields.name'),
    company: t('form.fields.company'),
    email: t('form.fields.email'),
    subject: t('form.fields.subject'),
    message: t('form.fields.message'),
    namePlaceholder: t('form.placeholders.name'),
    companyPlaceholder: t('form.placeholders.company'),
    emailPlaceholder: t('form.placeholders.email'),
    subjectPlaceholder: t('form.placeholders.subject'),
    messagePlaceholder: t('form.placeholders.message'),
    submit: t('form.submit'),
    submitting: t('form.submitting'),
    successToast: t('form.success.toast'),
  }

  const calendlyUrl = CALENDLY_URL_BY_LOCALE[locale] ?? ''
  if (!calendlyUrl) {
    logger.warn({ event: 'calendly:url_missing', locale }, 'NEXT_PUBLIC_CALENDLY_URL_<locale> absent')
  }

  return (
    <PageShell title={t('header.h1')} subtitle={t('header.tagline')}>
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-10">
        <div className="flex flex-wrap items-center justify-center -mt-2 gap-4 md:justify-between">
          <LocationLine />
          <SocialLinks className="md:justify-end" />
        </div>

        <ContactTabs
          formLabel={t('tabs.form')}
          calendlyLabel={t('tabs.calendly')}
          formContent={
            <ContactForm key={defaultSubject} labels={formLabels} defaultSubject={defaultSubject} />
          }
          calendlyContent={
            <CalendlyWidget url={calendlyUrl} placeholderLabel={t('calendly.placeholder')} />
          }
        />
      </div>
    </PageShell>
  )
}
