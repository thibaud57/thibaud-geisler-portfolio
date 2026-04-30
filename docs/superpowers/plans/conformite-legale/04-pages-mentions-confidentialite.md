# Pages /mentions-legales et /confidentialite Server Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer 2 pages publiques bilingues Server Components (`/mentions-legales` LCEN art. 6-III + `/confidentialite` RGPD art. 13/14) qui consomment `getPublisher()` + `getDataProcessors()` du sub 1 et exposent un bouton client réutilisable `<OpenCookiePreferencesButton>` qui ouvre la modale `ConsentDialog` c15t du sub 3.

**Architecture:** 2 Server Components asynchrones avec `generateMetadata` aligné `/a-propos/page.tsx` existant. Layout via `<PageShell>` + `prose prose-invert max-w-none`. Lecture data via queries cachées du sub 1. Section Cookies de `/confidentialite` utilise un Client Component leaf `<OpenCookiePreferencesButton>` qui consomme `useConsentManager().setActiveUI('dialog')` (de `@c15t/nextjs`) pour ouvrir la modale `ConsentDialog` c15t du sub 3. Helper pur `formatSiret` colocalisé `src/lib/legal/` réutilisable au sub 7.

**Tech Stack:** Next.js 16, React 19, TypeScript 6 strict, Tailwind 4 + @tailwindcss/typography v0.5.19, next-intl 4, shadcn/ui (Button), Vitest 4 (project unit), pnpm 10.

**Spec source :** [docs/superpowers/specs/conformite-legale/04-pages-mentions-confidentialite-design.md](../../specs/conformite-legale/04-pages-mentions-confidentialite-design.md)

**Discipline commit (CLAUDE.md projet) :** AUCUN `git commit` intermédiaire pendant l'implémentation. Un seul commit final après validation utilisateur explicite à la fin de Task 9.

**Rules applicables :**
- `.claude/rules/nextjs/server-client-components.md` (leaf client component, props sérialisables)
- `.claude/rules/nextjs/data-fetching.md` (queries directes Server Components, parallélisation Promise.all)
- `.claude/rules/nextjs/rendering-caching.md` (`'use cache'`, cacheTag)
- `.claude/rules/nextjs/metadata-seo.md` (`metadataBase`, viewport séparé, alternates non-mergés)
- `.claude/rules/nextjs/routing.md` (`generateStaticParams` optionnel avec cacheComponents)
- `.claude/rules/next-intl/translations.md` (`getTranslations` async serveur, `t.rich` JSX, namespaces)
- `.claude/rules/tailwind/conventions.md` (cn(), tokens sémantiques, mobile-first)
- `.claude/rules/shadcn-ui/components.md` (Button shadcn)
- `.claude/rules/typescript/conventions.md` (alias `@/*`, fonctions pures)
- `.claude/rules/vitest/setup.md` (project unit jsdom, factory pattern)
- `.claude/rules/nextjs/tests.md` (no mock Prisma, no test RSC async)

---

## Task 1: Étendre messages/fr.json avec namespaces LegalMentions et PrivacyPolicy

**Files:**
- Modify: `messages/fr.json` (ajout 4 clés Metadata + namespace LegalMentions + namespace PrivacyPolicy)

- [ ] **Step 1.1: Ajouter les 4 clés au namespace `Metadata` existant**

Lire `messages/fr.json` pour identifier le namespace `Metadata`. Ajouter les 4 clés suivantes à la fin du namespace (avant la `}` fermante du namespace `Metadata`) :

```json
"legalMentionsTitle": "Mentions légales",
"legalMentionsDescription": "Mentions légales du site thibaud-geisler.com : identité de l'éditeur, hébergeur, propriété intellectuelle, conformité LCEN article 6-III.",
"privacyPolicyTitle": "Politique de confidentialité",
"privacyPolicyDescription": "Politique de confidentialité du site thibaud-geisler.com : finalités, sous-traitants, durées de conservation, droits utilisateur (RGPD article 13)."
```

- [ ] **Step 1.2: Ajouter le namespace `LegalMentions` complet à `messages/fr.json`**

Identifier la position d'insertion (à la fin du root, en respectant la virgule de séparation avec le namespace précédent).

Ajouter le bloc suivant :

```json
"LegalMentions": {
  "title": "Mentions légales",
  "lastUpdated": "Dernière mise à jour : 28 avril 2026",
  "identity": {
    "title": "1. Identité de l'éditeur",
    "intro": "Le présent site est édité par :",
    "legalNameLabel": "Nom",
    "statusLabel": "Statut juridique",
    "sirenLabel": "SIREN",
    "siretLabel": "SIRET",
    "registrationLabel": "Inscription",
    "registrationValue": "Inscrit au {type} sous le n° SIREN {siren}",
    "apeLabel": "Activité (code APE)",
    "apeValue": "{code} - {label}",
    "addressLabel": "Adresse",
    "emailLabel": "Contact",
    "directorLabel": "Directeur de la publication",
    "vatNotApplicable": "TVA non applicable, article 293 B du Code général des impôts (régime de la franchise en base).",
    "vatNumberLabel": "Numéro de TVA intracommunautaire"
  },
  "hosting": {
    "title": "2. Hébergeur",
    "intro": "Le site est hébergé par :",
    "nameLabel": "Nom",
    "legalFormLabel": "Forme juridique",
    "addressLabel": "Adresse",
    "rcsLabel": "RCS",
    "phoneLabel": "Téléphone"
  },
  "intellectualProperty": {
    "title": "3. Propriété intellectuelle",
    "body": "L'ensemble du contenu de ce site (textes, graphismes, logos, images, code source) est la propriété exclusive de Thibaud Pierre Geisler, sauf mention contraire. Toute reproduction, représentation, modification ou exploitation non autorisée, par quelque procédé que ce soit, est interdite et constituerait une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle."
  },
  "liability": {
    "title": "4. Responsabilité",
    "body": "L'éditeur s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur le site. Toutefois, il ne peut garantir l'exhaustivité ni l'absence d'erreurs. L'utilisation des informations et contenus disponibles sur le site se fait sous l'entière responsabilité de l'utilisateur. L'éditeur ne saurait être tenu responsable des dommages directs ou indirects résultant de l'accès ou de l'utilisation du site."
  },
  "law": {
    "title": "5. Droit applicable et juridiction compétente",
    "body": "Les présentes mentions légales sont régies par le droit français. En cas de litige, et après tentative de résolution amiable, les tribunaux du ressort de Metz seront seuls compétents."
  },
  "privacyLink": "Pour le traitement des données personnelles, consultez notre <link>politique de confidentialité</link>."
}
```

- [ ] **Step 1.3: Ajouter le namespace `PrivacyPolicy` complet à `messages/fr.json`**

Toujours dans `messages/fr.json`, ajouter à la suite :

```json
"PrivacyPolicy": {
  "title": "Politique de confidentialité",
  "lastUpdated": "Dernière mise à jour : 28 avril 2026",
  "intro": "La présente politique de confidentialité décrit la manière dont vos données personnelles sont collectées et traitées sur ce site, conformément au Règlement Général sur la Protection des Données (RGPD, règlement UE 2016/679) et à la loi Informatique et Libertés modifiée.",
  "controller": {
    "title": "1. Responsable du traitement",
    "body": "Le responsable du traitement est Thibaud Pierre Geisler. Pour le détail de l'identité et des coordonnées, consultez les <link>mentions légales</link>."
  },
  "purposes": {
    "title": "2. Finalités et bases légales du traitement",
    "intro": "Vos données personnelles sont traitées pour les finalités suivantes :",
    "contactForm": "Formulaire de contact : répondre à vos demandes (nom, adresse email, message). Base légale : intérêt légitime de l'éditeur à répondre à ses contacts (RGPD art. 6-1-f).",
    "calendly": "Prise de rendez-vous Calendly : permettre la planification d'un rendez-vous via un widget tiers embarqué. Base légale : consentement préalable au dépôt de cookies marketing (RGPD art. 6-1-a)."
  },
  "recipients": {
    "title": "3. Destinataires et sous-traitants",
    "intro": "Les données personnelles peuvent être transmises aux sous-traitants suivants pour les finalités décrites :",
    "tableHeaders": {
      "name": "Sous-traitant",
      "role": "Rôle",
      "purpose": "Finalité",
      "country": "Pays"
    }
  },
  "retention": {
    "title": "4. Durées de conservation",
    "intro": "Vos données sont conservées selon les durées suivantes :",
    "tableHeaders": {
      "processor": "Traitement",
      "duration": "Durée"
    }
  },
  "rights": {
    "title": "5. Vos droits",
    "body": "Conformément au RGPD, vous disposez des droits suivants : accès, rectification, effacement, opposition, limitation, portabilité de vos données. Vous pouvez exercer ces droits en écrivant à <mail>contact@thibaud-geisler.com</mail>. Vous avez également le droit d'introduire une réclamation auprès de la <cnil>CNIL</cnil> (Commission nationale de l'informatique et des libertés)."
  },
  "transfers": {
    "title": "6. Transferts de données hors Union européenne",
    "intro": "Certains sous-traitants traitent vos données en dehors de l'Union européenne. Ces transferts sont encadrés par des garanties appropriées :"
  },
  "cookies": {
    "title": "7. Cookies",
    "intro": "Le site utilise deux catégories de cookies :",
    "necessary": "Cookies essentiels (toujours actifs) : préférence de thème, mémorisation de votre choix de cookies, fonctionnement technique du site.",
    "marketing": "Cookies marketing (soumis à votre consentement) : permettent l'affichage du widget Calendly de prise de rendez-vous. Calendly transfère vos données aux États-Unis dans le cadre du Data Privacy Framework.",
    "managePreferences": "Vous pouvez modifier votre choix à tout moment :"
  }
}
```

- [ ] **Step 1.4: Vérifier la cohérence JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));console.log('OK')"`
Expected: `OK`

---

## Task 2: Étendre messages/en.json avec les traductions équivalentes

**Files:**
- Modify: `messages/en.json` (mêmes namespaces traduits en EN)

- [ ] **Step 2.1: Ajouter les 4 clés Metadata EN**

Identifier le namespace `Metadata` dans `messages/en.json`. Ajouter à la fin :

```json
"legalMentionsTitle": "Legal notice",
"legalMentionsDescription": "Legal notice of thibaud-geisler.com: publisher identity, hosting provider, intellectual property, LCEN article 6-III compliance.",
"privacyPolicyTitle": "Privacy policy",
"privacyPolicyDescription": "Privacy policy of thibaud-geisler.com: purposes, processors, retention periods, user rights (GDPR article 13)."
```

- [ ] **Step 2.2: Ajouter le namespace `LegalMentions` EN**

```json
"LegalMentions": {
  "title": "Legal notice",
  "lastUpdated": "Last updated: April 28, 2026",
  "identity": {
    "title": "1. Publisher identity",
    "intro": "This site is published by:",
    "legalNameLabel": "Name",
    "statusLabel": "Legal status",
    "sirenLabel": "SIREN",
    "siretLabel": "SIRET",
    "registrationLabel": "Registration",
    "registrationValue": "Registered with {type} under SIREN no. {siren}",
    "apeLabel": "Activity (APE code)",
    "apeValue": "{code} - {label}",
    "addressLabel": "Address",
    "emailLabel": "Contact",
    "directorLabel": "Publication director",
    "vatNotApplicable": "VAT not applicable, article 293 B of the French General Tax Code (basic exemption regime).",
    "vatNumberLabel": "Intra-Community VAT number"
  },
  "hosting": {
    "title": "2. Hosting provider",
    "intro": "The site is hosted by:",
    "nameLabel": "Name",
    "legalFormLabel": "Legal form",
    "addressLabel": "Address",
    "rcsLabel": "Trade and Companies Register",
    "phoneLabel": "Phone"
  },
  "intellectualProperty": {
    "title": "3. Intellectual property",
    "body": "All content on this site (text, graphics, logos, images, source code) is the exclusive property of Thibaud Pierre Geisler unless otherwise stated. Any unauthorized reproduction, representation, modification or use, by any means, is prohibited and constitutes infringement subject to articles L.335-2 et seq. of the French Intellectual Property Code."
  },
  "liability": {
    "title": "4. Liability",
    "body": "The publisher strives to ensure the accuracy and timeliness of the information published on the site. However, completeness or absence of errors cannot be guaranteed. Use of the information and content available on the site is at the user's sole responsibility. The publisher cannot be held liable for any direct or indirect damages resulting from access to or use of the site."
  },
  "law": {
    "title": "5. Applicable law and competent jurisdiction",
    "body": "These legal notices are governed by French law. In the event of a dispute, and after attempted amicable resolution, the courts within the jurisdiction of Metz shall have exclusive competence."
  },
  "privacyLink": "For the processing of personal data, see our <link>privacy policy</link>."
}
```

- [ ] **Step 2.3: Ajouter le namespace `PrivacyPolicy` EN**

```json
"PrivacyPolicy": {
  "title": "Privacy policy",
  "lastUpdated": "Last updated: April 28, 2026",
  "intro": "This privacy policy describes how your personal data is collected and processed on this site, in accordance with the General Data Protection Regulation (GDPR, EU regulation 2016/679) and the French Data Protection Act.",
  "controller": {
    "title": "1. Data controller",
    "body": "The data controller is Thibaud Pierre Geisler. For full identity and contact details, see the <link>legal notice</link>."
  },
  "purposes": {
    "title": "2. Purposes and legal bases for processing",
    "intro": "Your personal data is processed for the following purposes:",
    "contactForm": "Contact form: responding to your inquiries (name, email address, message). Legal basis: legitimate interest of the publisher to respond to contacts (GDPR art. 6-1-f).",
    "calendly": "Calendly scheduling: enabling appointment booking via an embedded third-party widget. Legal basis: prior consent to marketing cookies (GDPR art. 6-1-a)."
  },
  "recipients": {
    "title": "3. Recipients and processors",
    "intro": "Personal data may be shared with the following processors for the described purposes:",
    "tableHeaders": {
      "name": "Processor",
      "role": "Role",
      "purpose": "Purpose",
      "country": "Country"
    }
  },
  "retention": {
    "title": "4. Retention periods",
    "intro": "Your data is retained for the following periods:",
    "tableHeaders": {
      "processor": "Processing",
      "duration": "Duration"
    }
  },
  "rights": {
    "title": "5. Your rights",
    "body": "Under GDPR, you have the following rights: access, rectification, erasure, objection, restriction, and data portability. You can exercise these rights by writing to <mail>contact@thibaud-geisler.com</mail>. You also have the right to lodge a complaint with the <cnil>CNIL</cnil> (French data protection authority)."
  },
  "transfers": {
    "title": "6. Data transfers outside the European Union",
    "intro": "Some processors handle your data outside the European Union. These transfers are subject to appropriate safeguards:"
  },
  "cookies": {
    "title": "7. Cookies",
    "intro": "The site uses two categories of cookies:",
    "necessary": "Essential cookies (always active): theme preference, cookie consent storage, technical site operation.",
    "marketing": "Marketing cookies (subject to your consent): enable the Calendly scheduling widget. Calendly transfers your data to the United States under the Data Privacy Framework.",
    "managePreferences": "You can change your choice at any time:"
  }
}
```

- [ ] **Step 2.4: Vérifier la cohérence JSON et la compilation des types next-intl**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));console.log('OK')"`
Expected: `OK`

Run: `pnpm typecheck`
Expected: aucune erreur. Les nouvelles clés sont accessibles via `t('LegalMentions.identity.title')` etc.

---

## Task 3: TDD red — écrire les tests unit du helper formatSiret

**Files:**
- Create: `src/lib/legal/format-siret.test.ts`

- [ ] **Step 3.1: Créer le fichier de tests avec les 5 cas**

Create `src/lib/legal/format-siret.test.ts` :

```typescript
import { describe, expect, it } from 'vitest'

import { formatSiret } from './format-siret'

describe('formatSiret', () => {
  it('formate un SIRET valide 14 chiffres avec espaces aux bons emplacements', () => {
    expect(formatSiret('88041912200036')).toBe('880 419 122 00036')
  })

  it('retourne un SIREN 9 chiffres tel quel (pas de match du regex 14 chiffres)', () => {
    expect(formatSiret('880419122')).toBe('880419122')
  })

  it('retourne une chaîne vide telle quelle', () => {
    expect(formatSiret('')).toBe('')
  })

  it('retourne une chaîne non numérique telle quelle (graceful fallback)', () => {
    expect(formatSiret('abc')).toBe('abc')
  })

  it('retourne un SIRET déjà formatté tel quel (idempotence regex stricte sur 14 chiffres consécutifs)', () => {
    expect(formatSiret('880 419 122 00036')).toBe('880 419 122 00036')
  })
})
```

- [ ] **Step 3.2: Lancer les tests pour confirmer qu'ils ÉCHOUENT (red phase)**

Run: `pnpm test src/lib/legal/format-siret.test.ts`
Expected: échec d'import `Cannot find module './format-siret'`. C'est attendu, c'est la phase red du TDD.

---

## Task 4: TDD green — implémenter formatSiret

**Files:**
- Create: `src/lib/legal/format-siret.ts`

- [ ] **Step 4.1: Créer le helper pur**

Create `src/lib/legal/format-siret.ts` :

```typescript
export function formatSiret(siret: string): string {
  return siret.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, '$1 $2 $3 $4')
}
```

- [ ] **Step 4.2: Lancer les tests, ils doivent PASSER (green phase)**

Run: `pnpm test src/lib/legal/format-siret.test.ts`
Expected: les 5 tests passent (vert).

- [ ] **Step 4.3: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur.

---

## Task 5: Créer OpenCookiePreferencesButton

**Files:**
- Create: `src/components/features/legal/OpenCookiePreferencesButton.tsx`

- [ ] **Step 5.1: Créer le Client Component leaf**

Create `src/components/features/legal/OpenCookiePreferencesButton.tsx` :

```typescript
'use client'

import { useTranslations } from 'next-intl'
import { useConsentManager } from '@c15t/nextjs'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
  variant?: 'default' | 'outline' | 'link'
  label?: string
}

export function OpenCookiePreferencesButton({
  className,
  variant = 'outline',
  label,
}: Props) {
  const { setActiveUI } = useConsentManager()
  const t = useTranslations('Cookies')

  return (
    <Button
      variant={variant}
      onClick={() => setActiveUI('dialog')}
      className={cn(className)}
    >
      {label ?? t('openManagerLabel')}
    </Button>
  )
}
```

Notes :
- `useConsentManager` exposé par `<ConsentManagerProvider>` du sub 3 (mounté dans `Providers.tsx`)
- `setActiveUI('dialog')` ouvre la modale `ConsentDialog` c15t (équivalent v2 de `showPreferences()` v1)
- Prop optionnelle `label?: string` permet le custom (ex: sub 5 "Activer Calendly"). Texte par défaut : `Cookies.openManagerLabel` (FR "Gérer mes cookies" / EN "Manage cookies")

- [ ] **Step 5.2: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur. `useConsentManager` et `setActiveUI` typés via `@c15t/nextjs` (installé au sub 3).

---

## Task 6: Créer la page /mentions-legales

**Files:**
- Create: `src/app/[locale]/(public)/mentions-legales/page.tsx`

- [ ] **Step 6.1: Créer le Server Component avec generateMetadata + 5 sections**

Create `src/app/[locale]/(public)/mentions-legales/page.tsx` :

```typescript
import type { Metadata, ResolvingMetadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { setupLocalePage } from '@/i18n/locale-guard'
import { Link } from '@/i18n/navigation'
import { formatSiret } from '@/lib/legal/format-siret'
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
  const [t, tLegal, publisher, hosting] = await Promise.all([
    getTranslations('LegalMentions'),
    getTranslations('Legal'),
    getPublisher(),
    getHostingProvider(),
  ])

  const entity = publisher
  const pub = publisher.publisher
  const hostingProcessing = hosting.processing
  const localizedHostingLegalForm =
    locale === 'fr' ? hostingProcessing.legalStatusFr : hostingProcessing.legalStatusEn

  return (
    <PageShell>
      <article className="prose prose-invert max-w-none">
        <h1>{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('lastUpdated')}</p>

        <section>
          <h2>{t('identity.title')}</h2>
          <p>{t('identity.intro')}</p>
          <ul>
            <li>
              <strong>{t('identity.legalNameLabel')}:</strong> {entity.name}
            </li>
            <li>
              <strong>{t('identity.statusLabel')}:</strong>{' '}
              {tLegal(`legalStatus.${entity.legalStatusKey}`)}
            </li>
            <li>
              <strong>{t('identity.sirenLabel')}:</strong> {pub.siren}
            </li>
            <li>
              <strong>{t('identity.siretLabel')}:</strong> {formatSiret(entity.siret ?? '')}
            </li>
            <li>
              <strong>{t('identity.registrationLabel')}:</strong>{' '}
              {t('identity.registrationValue', {
                type: pub.registrationType,
                siren: pub.siren,
              })}
            </li>
            <li>
              <strong>{t('identity.apeLabel')}:</strong>{' '}
              {t('identity.apeValue', {
                code: pub.apeCode,
                label: tLegal(`ape.${pub.apeCode}`),
              })}
            </li>
            <li>
              <strong>{t('identity.addressLabel')}:</strong>{' '}
              {entity.address.street}, {entity.address.postalCode} {entity.address.city},{' '}
              {entity.address.country}
            </li>
            <li>
              <strong>{t('identity.emailLabel')}:</strong>{' '}
              <a href={`mailto:${pub.publicEmail}`}>{pub.publicEmail}</a>
            </li>
            <li>
              <strong>{t('identity.directorLabel')}:</strong> {entity.name}
            </li>
          </ul>
          {pub.vatRegime === 'FRANCHISE' ? (
            <p>{t('identity.vatNotApplicable')}</p>
          ) : (
            entity.vatNumber && (
              <p>
                <strong>{t('identity.vatNumberLabel')}:</strong> {entity.vatNumber}
              </p>
            )
          )}
        </section>

        <section>
          <h2>{t('hosting.title')}</h2>
          <p>{t('hosting.intro')}</p>
          <ul>
            <li>
              <strong>{t('hosting.nameLabel')}:</strong> {hosting.name}
            </li>
            {localizedHostingLegalForm && (
              <li>
                <strong>{t('hosting.legalFormLabel')}:</strong> {localizedHostingLegalForm}
              </li>
            )}
            <li>
              <strong>{t('hosting.addressLabel')}:</strong>{' '}
              {hosting.address.street}, {hosting.address.postalCode}{' '}
              {hosting.address.city}, {hosting.address.country}
            </li>
            {hosting.rcsCity && hosting.rcsNumber && (
              <li>
                <strong>{t('hosting.rcsLabel')}:</strong> {hosting.rcsCity} {hosting.rcsNumber}
              </li>
            )}
            {hosting.phone && (
              <li>
                <strong>{t('hosting.phoneLabel')}:</strong> {hosting.phone}
              </li>
            )}
          </ul>
        </section>

        <section>
          <h2>{t('intellectualProperty.title')}</h2>
          <p>{t('intellectualProperty.body')}</p>
        </section>

        <section>
          <h2>{t('liability.title')}</h2>
          <p>{t('liability.body')}</p>
        </section>

        <section>
          <h2>{t('law.title')}</h2>
          <p>{t('law.body')}</p>
        </section>

        <p>
          {t.rich('privacyLink', {
            link: (chunks) => <Link href="/confidentialite">{chunks}</Link>,
          })}
        </p>
      </article>
    </PageShell>
  )
}
```

Note importante : `Link` est importé de `@/i18n/navigation` (helper next-intl créé dans le projet) qui produit automatiquement les URLs préfixées par locale.

- [ ] **Step 6.2: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur. Les types Prisma de `getPublisher()` et `getHostingProvider()` sont inférés correctement.

---

## Task 7: Créer la page /confidentialite

**Files:**
- Create: `src/app/[locale]/(public)/confidentialite/page.tsx`

- [ ] **Step 7.1: Créer le Server Component avec generateMetadata + 7 sections + tableaux**

Create `src/app/[locale]/(public)/confidentialite/page.tsx` :

```typescript
import type { Metadata, ResolvingMetadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { OpenCookiePreferencesButton } from '@/components/features/legal/OpenCookiePreferencesButton'
import { setupLocalePage } from '@/i18n/locale-guard'
import { Link } from '@/i18n/navigation'
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
  const [t, tLegal, publisher, processors] = await Promise.all([
    getTranslations('PrivacyPolicy'),
    getTranslations('Legal'),
    getPublisher(),
    getDataProcessors(),
  ])

  const transfersOutsideEu = processors.filter(
    (entry) => entry.processing.outsideEuFramework !== null,
  )

  return (
    <PageShell>
      <article className="prose prose-invert max-w-none">
        <h1>{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('lastUpdated')}</p>
        <p>{t('intro')}</p>

        <section>
          <h2>{t('controller.title')}</h2>
          <p>
            {t.rich('controller.body', {
              link: (chunks) => <Link href="/mentions-legales">{chunks}</Link>,
            })}
          </p>
        </section>

        <section>
          <h2>{t('purposes.title')}</h2>
          <p>{t('purposes.intro')}</p>
          <ul>
            <li>{t('purposes.contactForm')}</li>
            <li>{t('purposes.calendly')}</li>
          </ul>
        </section>

        <section>
          <h2>{t('recipients.title')}</h2>
          <p>{t('recipients.intro')}</p>
          <table>
            <thead>
              <tr>
                <th>{t('recipients.tableHeaders.name')}</th>
                <th>{t('recipients.tableHeaders.role')}</th>
                <th>{t('recipients.tableHeaders.purpose')}</th>
                <th>{t('recipients.tableHeaders.country')}</th>
              </tr>
            </thead>
            <tbody>
              {processors.map((entry) => {
                const purpose =
                  locale === 'fr' ? entry.processing.purposeFr : entry.processing.purposeEn
                return (
                  <tr key={entry.processing.slug}>
                    <td>{entry.name}</td>
                    <td>{tLegal(`processingKind.${entry.processing.kind}`)}</td>
                    <td>{purpose}</td>
                    <td>{entry.address.country}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <section>
          <h2>{t('retention.title')}</h2>
          <p>{t('retention.intro')}</p>
          <table>
            <thead>
              <tr>
                <th>{t('retention.tableHeaders.processor')}</th>
                <th>{t('retention.tableHeaders.duration')}</th>
              </tr>
            </thead>
            <tbody>
              {processors.map((entry) => (
                <tr key={entry.processing.slug}>
                  <td>{entry.name}</td>
                  <td>{tLegal(`retention.${entry.processing.retentionPolicyKey}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>{t('rights.title')}</h2>
          <p>
            {t.rich('rights.body', {
              mail: (chunks) => (
                <a href={`mailto:${publisher.publisher.publicEmail}`}>{chunks}</a>
              ),
              cnil: (chunks) => (
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>

        {transfersOutsideEu.length > 0 && (
          <section>
            <h2>{t('transfers.title')}</h2>
            <p>{t('transfers.intro')}</p>
            <ul>
              {transfersOutsideEu.map((entry) => (
                <li key={entry.processing.slug}>
                  <strong>{entry.name}</strong> ({entry.address.country}) —{' '}
                  {tLegal(`outsideEuFramework.${entry.processing.outsideEuFramework}`)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2>{t('cookies.title')}</h2>
          <p>{t('cookies.intro')}</p>
          <ul>
            <li>{t('cookies.necessary')}</li>
            <li>{t('cookies.marketing')}</li>
          </ul>
          <p>{t('cookies.managePreferences')}</p>
          <div className="not-prose">
            <OpenCookiePreferencesButton variant="outline" />
          </div>
        </section>
      </article>
    </PageShell>
  )
}
```

- [ ] **Step 7.2: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur. Si TypeScript proteste sur `entry.processing.outsideEuFramework` étant possiblement `null`, le filtre `transfersOutsideEu` n'élimine pas le narrowing automatique, mais le compilateur accepte de toute façon car le retour de `tLegal` accepte une string.

---

## Task 8: Smoke tests en dev

**Files:** aucun fichier modifié.

- [ ] **Step 8.1: Démarrer le serveur dev**

Run: `pnpm dev`
Expected: serveur démarre sans erreur sur `http://localhost:3000`. Note : nécessite que sub 1 (DB seedée avec publisher + 3 processors) et sub 3 (`<ConsentManagerProvider>` mounté dans `Providers.tsx`) soient déjà implémentés et mergés.

- [ ] **Step 8.2: Charger /fr/mentions-legales**

Ouvrir `http://localhost:3000/fr/mentions-legales` dans un navigateur.
Expected:
- Statut HTTP 200, page rendue.
- `<h1>` "Mentions légales".
- Section 1 affiche `Thibaud Pierre Geisler`, `Entrepreneur Individuel`, SIRET `880 419 122 00036`, SIREN `880419122`, ligne `Inscrit au RNE sous le n° SIREN 880419122`, code APE `6201Z - Programmation informatique`, adresse `11 rue Gouvy, 57000 Metz, France`, email cliquable `contact@thibaud-geisler.com`, mention `TVA non applicable, article 293 B du CGI`.
- Section 2 affiche `IONOS SARL`, `SARL au capital de 100 000 EUR`, adresse Sarreguemines, `RCS Sarreguemines 431 303 775`, `+33 9 70 80 89 11`.
- Sections 3, 4, 5 contiennent les textes fixes i18n FR.
- Lien "politique de confidentialité" en bas pointe vers `/fr/confidentialite`.

- [ ] **Step 8.3: Charger /en/mentions-legales**

Ouvrir `http://localhost:3000/en/mentions-legales`.
Expected:
- `<h1>` "Legal notice".
- Section 1 affiche `Sole proprietorship` au lieu de `Entrepreneur Individuel`, `Computer programming` au lieu de `Programmation informatique`, mention `VAT not applicable, article 293 B of the French General Tax Code`.
- Section 2 affiche `LLC with capital of 100,000 EUR` au lieu de la version FR (legalStatusEn lue depuis BDD).
- Sections 3-5 en EN.

- [ ] **Step 8.4: Charger /fr/confidentialite**

Ouvrir `http://localhost:3000/fr/confidentialite`.
Expected:
- `<h1>` "Politique de confidentialité".
- Section 3 (Destinataires) : tableau de 3 lignes (IONOS hosting, Calendly, IONOS SMTP) avec rôle/finalité/pays.
- Section 4 (Durées) : tableau de 3 lignes avec durées formatées.
- Section 5 (Droits) : email `contact@thibaud-geisler.com` cliquable + lien CNIL externe.
- Section 6 (Transferts hors UE) : 1 ligne pour Calendly avec mention `Data Privacy Framework (décision d'adéquation US 2023)`.
- Section 7 (Cookies) : récap des 2 catégories + bouton "Personnaliser" cliquable.

- [ ] **Step 8.5: Cliquer sur le bouton "Gérer mes cookies" de la section Cookies**

Cliquer sur le bouton.
Expected:
- La modale `ConsentDialog` c15t du sub 3 s'ouvre, affichant les 2 catégories (necessary read-only + marketing toggle interactif).
- Aucune erreur en console DevTools.
- Si l'utilisateur a déjà interagi avec le banner, l'état des toggles reflète le dernier choix persisté.

- [ ] **Step 8.6: Charger /en/confidentialite**

Ouvrir `http://localhost:3000/en/confidentialite`.
Expected: équivalent EN, tableaux avec en-têtes traduits, durées rendues via `Legal.retention.{key}` namespace EN.

- [ ] **Step 8.7: Vérifier l'absence de violations CSP en console**

Pour les 4 URLs ci-dessus, ouvrir DevTools console.
Expected: aucune violation CSP. Aucun warning React. Aucune erreur 404 sur les liens internes.

- [ ] **Step 8.8: Arrêter le serveur dev**

Run: `Ctrl+C`.

---

## Task 9: Smoke tests en build prod et vérifications finales

**Files:** aucun fichier modifié.

- [ ] **Step 9.1: Builder l'app en mode production**

Run: `pnpm build`
Expected: build réussi. Vérifier dans le rapport `next build` que les routes `/[locale]/mentions-legales` et `/[locale]/confidentialite` sont marquées `ƒ Dynamic` (lecture queries Prisma cachées via `'use cache'`) avec un First Load JS raisonnable (< 200 KB).

- [ ] **Step 9.2: Démarrer le serveur production**

Run: `pnpm start`
Expected: serveur démarre sur `http://localhost:3000`, mode production.

- [ ] **Step 9.3: Refaire les smoke tests Step 8.2 à 8.7 en prod**

Refaire les 4 chargements URL et la vérification CSP en mode incognito + DevTools.
Expected: comportement identique à dev. Aucune divergence.

- [ ] **Step 9.4: Vérifier le header Open Graph et hreflang**

Run: `curl -I http://localhost:3000/fr/mentions-legales` puis ouvrir `http://localhost:3000/fr/mentions-legales` et View Source.
Expected dans le HTML rendu:
- `<title>Mentions légales | Thibaud Geisler...</title>` (template appliqué)
- `<meta name="description" content="Mentions légales du site thibaud-geisler.com...">`
- `<meta property="og:type" content="website">`
- `<meta property="og:locale" content="fr_FR">`
- `<meta property="og:url" content="https://localhost:3000/fr/mentions-legales">` (ou similaire selon `NEXT_PUBLIC_SITE_URL` local)
- `<link rel="canonical" href="...">`
- `<link rel="alternate" hreflang="fr">`, `hreflang="en">`, `hreflang="x-default">`

- [ ] **Step 9.5: Vérifier les Core Web Vitals**

Run: lancer Lighthouse Performance audit (mode mobile) sur `/fr/mentions-legales` et `/fr/confidentialite`.
Expected:
- LCP < 2.5s
- CLS < 0.1
- INP < 200ms
- Performance score >= 90

- [ ] **Step 9.6: Lancer la suite complète**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: tous verts. Le test `format-siret.test.ts` passe (5 cas). Aucune régression sur les tests existants.

- [ ] **Step 9.7: Arrêter le serveur prod**

Run: `Ctrl+C`.

- [ ] **Step 9.8: Vérifier le diff git**

Run: `git status`
Expected output (les fichiers attendus) :
- new file: `src/app/[locale]/(public)/mentions-legales/page.tsx`
- new file: `src/app/[locale]/(public)/confidentialite/page.tsx`
- new file: `src/components/features/legal/OpenCookiePreferencesButton.tsx`
- new file: `src/lib/legal/format-siret.ts`
- new file: `src/lib/legal/format-siret.test.ts`
- modified: `messages/fr.json`
- modified: `messages/en.json`

- [ ] **Step 9.9: DEMANDER VALIDATION USER avant tout `git add` / `git commit`**

NE PAS lancer `git commit` directement. La discipline projet (CLAUDE.md projet § Workflow Git > Discipline commit) interdit les commits auto-initiés.

Présenter à l'utilisateur :
1. La liste des fichiers (output `git status`)
2. Un résumé : "Sub-project 4/7 implémenté : 2 pages bilingues mentions-legales + confidentialite Server Components, lecture data via queries Prisma cachées, bouton client OpenCookiePreferencesButton réutilisable, helper formatSiret + 5 tests unit verts, smoke tests dev + prod OK, Lighthouse vert"
3. Une proposition de message de commit Conventional :
   ```
   feat(legal): add /mentions-legales and /confidentialite pages with i18n FR/EN

   - Pages Server Components consomment getPublisher / getDataProcessors / getHostingProvider du sub legal-entity
   - 5 sections LCEN art. 6-III + 7 sections RGPD art. 13/14 conformes 2026
   - Bouton client OpenCookiePreferencesButton qui ouvre la modale du sub cookies
   - Helper pur formatSiret colocalisé src/lib/legal/ + 5 tests unit
   - Tableaux destinataires + durées de conservation rendus depuis itération getDataProcessors
   - Section "Transferts hors UE" conditionnelle (présente pour Calendly DPF)
   - Metadata Open Graph + canonical + hreflang FR/EN/x-default

   Refs: docs/superpowers/specs/conformite-legale/04-pages-mentions-confidentialite-design.md
   ```

Attendre l'accord explicite de l'utilisateur avant de lancer `git add` puis `git commit`.

- [ ] **Step 9.10: Après validation user uniquement, commiter**

Run (uniquement après accord explicite user) :
```bash
git add src/app/[locale]/\(public\)/mentions-legales src/app/[locale]/\(public\)/confidentialite src/components/features/legal/OpenCookiePreferencesButton.tsx src/lib/legal/ messages/fr.json messages/en.json
git commit -m "$(cat <<'EOF'
feat(legal): add /mentions-legales and /confidentialite pages with i18n FR/EN

- Pages Server Components consomment getPublisher / getDataProcessors / getHostingProvider du sub legal-entity
- 5 sections LCEN art. 6-III + 7 sections RGPD art. 13/14 conformes 2026
- Bouton client OpenCookiePreferencesButton qui ouvre la modale du sub cookies
- Helper pur formatSiret colocalisé src/lib/legal/ + 5 tests unit
- Tableaux destinataires + durées de conservation rendus depuis itération getDataProcessors
- Section "Transferts hors UE" conditionnelle (présente pour Calendly DPF)
- Metadata Open Graph + canonical + hreflang FR/EN/x-default

Refs: docs/superpowers/specs/conformite-legale/04-pages-mentions-confidentialite-design.md
EOF
)"
```

Run: `git status`
Expected: working tree clean.

- [ ] **Step 9.11: Mettre à jour le statut du spec**

Modifier le frontmatter de `docs/superpowers/specs/conformite-legale/04-pages-mentions-confidentialite-design.md` :
- Changer `status: "draft"` en `status: "implemented"`

Cette modification peut être commitée séparément en `chore(specs): mark pages-mentions-confidentialite as implemented` après accord user.

---

## Self-Review

**Spec coverage check :**

| Spec section | Task(s) couvrant |
|---|---|
| Page /mentions-legales 5 sections LCEN (Scénario 1) | Task 6 + Task 8 Step 8.2 |
| Page /en/mentions-legales équivalent EN (Scénario 2) | Task 2 + Task 6 + Task 8 Step 8.3 |
| Page /confidentialite 7 sections RGPD (Scénario 3) | Task 7 + Task 8 Step 8.4 |
| Bouton "Gérer mes préférences" ouvre la modale (Scénario 4) | Task 5 + Task 7 + Task 8 Step 8.5 |
| Metadata Open Graph + hreflang (Scénario 5) | Task 6 generateMetadata + Task 7 generateMetadata + Task 9 Step 9.4 |
| `formatSiret` 5 cas (Scénario 6) | Task 3 + Task 4 |
| Performance Core Web Vitals (Scénario 7) | Task 9 Step 9.5 |
| Mention TVA franchise vs assujetti conditionnelle | Task 6 condition `if (pub.vatRegime === 'FRANCHISE')` |
| Section "Transferts hors UE" conditionnelle | Task 7 condition `if (transfersOutsideEu.length > 0)` |
| Tableaux destinataires + durées | Task 7 itération `processors.map` dans table |
| Liens internes via `t.rich` Link next-intl | Task 6 privacyLink + Task 7 controller.body |

Aucun gap identifié.

**Placeholder scan :** aucun TBD/TODO/à définir dans le plan. Code complet à chaque step. Textes i18n FR + EN intégraux fournis dans Tasks 1 et 2.

**Type consistency :** `formatSiret(siret: string): string` cohérent entre Task 3 (test) et Task 4 (impl) et Task 6 (usage). `OpenCookiePreferencesButton` props `{ className?, variant?, label? }` cohérent entre Task 5 (impl) et Task 7 (usage `variant="outline"`). `useConsentManager()` retour fourni par `@c15t/nextjs` (sub 3). Queries Prisma `getPublisher`, `getHostingProvider`, `getDataProcessors` consommées en lecture seule, types inférés.

---

## Execution Handoff

**Plan complet et sauvegardé dans `docs/superpowers/plans/conformite-legale/04-pages-mentions-confidentialite.md`.**

Ce plan sera consommé par `/implement-subproject conformite-legale 04` lors de l'implémentation effective.

**Pas d'implémentation tout de suite** : on est dans le workflow `/decompose-feature` qui boucle sur les 7 sub-projects. Le sub-project 5/7 (`gating-calendly-marketing`) est le suivant dans l'ordre topologique.
