import type { Metadata } from 'next'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { setupLocalePage } from '@/i18n/locale-guard'
import { logger } from '@/lib/logger'
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
} from '@/lib/seo'

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
  fr: process.env.NEXT_PUBLIC_CALENDLY_URL_FR,
  en: process.env.NEXT_PUBLIC_CALENDLY_URL_EN,
} as const satisfies Record<Locale, string | undefined>

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/contact'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)

  return {
    title: t('contactTitle'),
    description: t('contactDescription'),
    openGraph: { locale: localeToOgLocale[locale] },
    alternates: { languages: buildLanguageAlternates('/contact') },
  }
}

export default async function ContactPage({
  params,
  searchParams,
}: PageProps<'/[locale]/contact'>) {
  const { locale } = await setupLocalePage(params)
  const resolvedSearchParams = await searchParams
  const rawService = resolvedSearchParams?.service
  const serviceParam = Array.isArray(rawService) ? rawService[0] : rawService

  const [tHeader, tCalendly, tForm, tTabs] = await Promise.all([
    getTranslations('ContactPage.header'),
    getTranslations('ContactPage.calendly'),
    getTranslations('ContactPage.form'),
    getTranslations('ContactPage.tabs'),
  ])

  const defaultSubject = isPrefillSlug(serviceParam) ? tForm(`subjectPrefill.${serviceParam}`) : ''

  const formLabels = {
    name: tForm('fields.name'),
    company: tForm('fields.company'),
    email: tForm('fields.email'),
    subject: tForm('fields.subject'),
    message: tForm('fields.message'),
    namePlaceholder: tForm('placeholders.name'),
    companyPlaceholder: tForm('placeholders.company'),
    emailPlaceholder: tForm('placeholders.email'),
    subjectPlaceholder: tForm('placeholders.subject'),
    messagePlaceholder: tForm('placeholders.message'),
    submit: tForm('submit'),
    submitting: tForm('submitting'),
    successToast: tForm('success.toast'),
  }

  const calendlyUrl = CALENDLY_URL_BY_LOCALE[locale] ?? ''
  if (!calendlyUrl) {
    logger.warn({ event: 'calendly:url_missing', locale }, 'NEXT_PUBLIC_CALENDLY_URL_<locale> absent')
  }

  return (
    <PageShell title={tHeader('h1')} subtitle={tHeader('tagline')}>
      <div className="flex flex-wrap items-center justify-center mb-10 -mt-2 gap-4 md:justify-between">
        <LocationLine />
        <SocialLinks className="md:justify-end" />
      </div>

      <ContactTabs
        formLabel={tTabs('form')}
        calendlyLabel={tTabs('calendly')}
        formContent={
          <ContactForm key={defaultSubject} labels={formLabels} defaultSubject={defaultSubject} />
        }
        calendlyContent={
          <CalendlyWidget url={calendlyUrl} placeholderLabel={tCalendly('placeholder')} />
        }
      />
    </PageShell>
  )
}
