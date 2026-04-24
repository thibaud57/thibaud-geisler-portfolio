# Plan d'implémentation — `04-page-contact-layout`

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le placeholder de `src/app/[locale]/(public)/contact/page.tsx` par la page /contact complète : header centré (icône Mail + H1 + tagline + location), grille 2 colonnes desktop (Calendly inline + réseaux à gauche, form UI stub à droite), lien CV discret en footer. Le form UI est fonctionnel visuellement avec un handler stub (toast sonner + console.log) ; Feature 4 remplacera uniquement le handler par la Server Action SMTP.

**Architecture:** Server page qui lit `searchParams.service` et passe `defaultSubject` au `ContactForm` Client. Îlots Client pour `CalendlyWidget` (Script externe) et `ContactForm` (inputs + handler submit). Le `Toaster` sonner est monté dans `Providers.tsx` pour que le toast stub fonctionne. Les URLs réseaux vivent dans une constante TS, les labels en i18n. La logique métier (Zod + Server Action + SMTP + rate limit + tests) reste pour Feature 4 qui swap uniquement le handler submit.

**Tech Stack:** Next.js 16 App Router + PPR, React 19 (`useActionState` + `useFormStatus`), TypeScript 6 strict, next-intl 4.9.1, shadcn/ui (Input, Textarea, Button, Card, Label, Toaster sonner déjà installés), `@icons-pack/react-simple-icons`, Lucide React.

**Spec de référence:** [`docs/superpowers/specs/pages-publiques-portfolio/04-page-contact-layout-design.md`](../../specs/pages-publiques-portfolio/04-page-contact-layout-design.md).

**Rappels projet:**
- `tdd_scope: none` → pas de tests à écrire (form UI stub, validation HTML5 native, pas de règle métier projet testable sous no-lib-test).
- Discipline commit CLAUDE.md : **aucun commit intermédiaire**. Commit unique après Task 10 verte, validé par l'utilisateur.
- **Pas de modif DESIGN.md / PRODUCTION.md** dans ce plan : sync docs global différé à la fin de `/decompose-feature`.
- **Toaster sonner** actuellement non monté dans le projet (`grep` sur src/app et src/components/layout confirme) → Task 1 dédiée pour le monter dans `Providers.tsx`.
- URLs réseaux (LinkedIn + GitHub) à fournir par l'utilisateur au moment de Task 2 ; valeurs placeholder à remplacer avant commit (check PR).

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `src/components/providers/Providers.tsx` | Ajout `<Toaster />` sonner | Modifier |
| `src/components/features/contact/social-links-config.ts` | Constante `SOCIAL_LINKS` (slug, url, icon) + type `SocialSlug` | Créer |
| `src/components/features/contact/ContactHeader.tsx` | Server, badge Mail + H1 + tagline + location | Créer |
| `src/components/features/contact/CalendlyWidget.tsx` | Client, Script Calendly + div inline + fallback | Créer |
| `src/components/features/contact/SocialLinks.tsx` | Server, grid de badges carrés avec résolution Simple Icons | Créer |
| `src/components/features/contact/ContactForm.tsx` | Client, 5 champs shadcn + stub submit (`sonner.toast` + `console.log`) + prop `defaultSubject` | Créer |
| `src/app/[locale]/(public)/contact/page.tsx` | Orchestration : header + grid 2 cols + lecture searchParams → defaultSubject | Modifier |
| `messages/fr.json` | Étoffer `ContactPage` complet | Modifier |
| `messages/en.json` | Parité FR/EN stricte | Modifier |
| `.env.example` | Ajout `NEXT_PUBLIC_CALENDLY_URL` avec commentaire | Modifier |

---

## Task 1 : Monter `<Toaster />` dans `Providers.tsx`

**Files:**
- Modify: `src/components/providers/Providers.tsx`

Le composant `Toaster` de sonner (`src/components/ui/sonner.tsx`) existe mais n'est monté nulle part. Sans ce mount, `toast(...)` appelé depuis `ContactForm` ne déclenchera aucun visuel. On le monte dans `Providers.tsx` (Client Component qui contient déjà `ThemeProvider`), car `Toaster` dépend de `useTheme()` de `next-themes` → il doit être dans le scope du `ThemeProvider`.

- [ ] **Step 1.1 : Ajouter l'import et le mount `<Toaster />`**

Remplacer le contenu actuel de `src/components/providers/Providers.tsx` par :

```typescript
'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'

import { Toaster } from '@/components/ui/sonner'

// Faux positif React 19 × next-themes 0.4.6 : next-themes injecte un <script> inline
// pour éviter le FOUC, React 19 warne à tort (le script s'exécute bien en SSR).
// Workaround communautaire accepté, dev-only, filtre le message exact.
// Refs : https://github.com/pacocoursey/next-themes/issues/387
//        https://github.com/shadcn-ui/ui/issues/10104
// À retirer quand next-themes publie un fix (repo inactif depuis mars 2025).
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalConsoleError = console.error
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Encountered a script tag while rendering React component')
    ) {
      return
    }
    originalConsoleError.apply(console, args)
  }
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster />
    </ThemeProvider>
  )
}
```

- [ ] **Step 1.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 2 : Constante `SOCIAL_LINKS`

**Files:**
- Create: `src/components/features/contact/social-links-config.ts`

Les URLs des 2 réseaux (LinkedIn + GitHub) vivent en constante TS. **L'utilisateur devra compléter les URLs réelles** à la place des placeholders avant le merge. Typage via `typeof` + `as const`, cohérent avec le pattern `SERVICE_SLUGS` du sub 01.

- [ ] **Step 2.1 : Créer le fichier**

```typescript
// src/components/features/contact/social-links-config.ts
export const SOCIAL_LINKS = [
  {
    slug: 'linkedin',
    url: 'https://www.linkedin.com/in/<replace-with-real-slug>',
    icon: 'simple-icons:linkedin',
  },
  {
    slug: 'github',
    url: 'https://github.com/<replace-with-real-username>',
    icon: 'simple-icons:github',
  },
] as const

export type SocialSlug = (typeof SOCIAL_LINKS)[number]['slug']
```

Notes :
- `<replace-with-real-slug>` et `<replace-with-real-username>` sont des **placeholders temporaires** à remplacer avant commit final. L'utilisateur fournira les valeurs exactes pendant la Task 10 smoke test.
- Format `icon: 'simple-icons:<slug>'` aligne sur la convention projet (pattern de `src/components/features/projects/TagBadge.tsx`).

- [ ] **Step 2.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 3 : Composant `ContactHeader` (Server)

**Files:**
- Create: `src/components/features/contact/ContactHeader.tsx`

Server Component async. Badge icône `Mail` Lucide (48×48, `bg-primary/10`), H1 `font-display` centré, tagline + ligne localisation "Luxembourg · France · Remote".

- [ ] **Step 3.1 : Créer le composant**

```typescript
// src/components/features/contact/ContactHeader.tsx
import { Mail } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

export async function ContactHeader({ className }: Props) {
  const t = await getTranslations('ContactPage.header')

  return (
    <header className={cn('flex flex-col items-center gap-4 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
        <Mail className="size-6 text-primary" aria-hidden />
      </div>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
        {t('h1')}
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">{t('tagline')}</p>
      <p className="text-sm text-muted-foreground">{t('location')}</p>
    </header>
  )
}
```

- [ ] **Step 3.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 4 : Composant `CalendlyWidget` (Client)

**Files:**
- Create: `src/components/features/contact/CalendlyWidget.tsx`

Client Component qui charge le script widget Calendly officiel en `lazyOnload` et rend le conteneur `calendly-inline-widget`. Fallback si URL manquante.

- [ ] **Step 4.1 : Créer le composant**

```typescript
// src/components/features/contact/CalendlyWidget.tsx
'use client'

import Script from 'next/script'

import { cn } from '@/lib/utils'

type Props = {
  url: string
  fallbackMessage: string
  className?: string
}

export function CalendlyWidget({ url, fallbackMessage, className }: Props) {
  if (!url) {
    return (
      <div
        className={cn(
          'flex min-h-[700px] w-full items-center justify-center rounded-lg border border-dashed border-muted bg-card text-center text-muted-foreground',
          className,
        )}
      >
        <p className="px-6">{fallbackMessage}</p>
      </div>
    )
  }

  return (
    <>
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />
      <div
        className={cn('calendly-inline-widget min-h-[700px] w-full', className)}
        data-url={url}
      />
    </>
  )
}
```

Notes :
- `strategy="lazyOnload"` = chargement du script après hydratation, pas d'impact LCP.
- `min-h-[700px]` = hauteur minimale requise par Calendly pour afficher le picker complet.
- La classe `calendly-inline-widget` est ciblée par le JS Calendly pour initialiser le widget.

- [ ] **Step 4.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 5 : Composant `SocialLinks` (Server)

**Files:**
- Create: `src/components/features/contact/SocialLinks.tsx`

Server Component. Rend un H3 + grille de badges carrés 56×56 px. Résolution d'icône Simple Icons identique au pattern de `src/components/features/projects/TagBadge.tsx` mais server-renderable (pas de hook). Liens externes avec `target="_blank" rel="noopener noreferrer"`.

- [ ] **Step 5.1 : Créer le composant**

```typescript
// src/components/features/contact/SocialLinks.tsx
import * as SimpleIcons from '@icons-pack/react-simple-icons'
import { getTranslations } from 'next-intl/server'

import { cn } from '@/lib/utils'

import { SOCIAL_LINKS, type SocialSlug } from './social-links-config'

type IconComponent = React.ComponentType<{ size?: number; className?: string }>

function toPascalCase(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function isComponentLike(value: unknown): value is IconComponent {
  if (typeof value === 'function') return true
  return typeof value === 'object' && value !== null && '$$typeof' in value
}

function resolveSimpleIcon(iconKey: string): IconComponent | null {
  const colonIdx = iconKey.indexOf(':')
  if (colonIdx === -1) return null
  const lib = iconKey.slice(0, colonIdx)
  const slug = iconKey.slice(colonIdx + 1)
  if (lib !== 'simple-icons' || !slug) return null
  const componentName = `Si${toPascalCase(slug)}`
  const maybeComponent = (SimpleIcons as unknown as Record<string, unknown>)[componentName]
  return isComponentLike(maybeComponent) ? maybeComponent : null
}

type Props = {
  className?: string
}

export async function SocialLinks({ className }: Props) {
  const t = await getTranslations('ContactPage.social')

  const ariaLabels: Record<SocialSlug, string> = {
    linkedin: t('ariaLabel.linkedin'),
    github: t('ariaLabel.github'),
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <h3 className="text-base font-semibold">{t('title')}</h3>
      <div className="flex flex-wrap gap-3">
        {SOCIAL_LINKS.map((link) => {
          const Icon = resolveSimpleIcon(link.icon)
          return (
            <a
              key={link.slug}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={ariaLabels[link.slug]}
              className="flex size-14 items-center justify-center rounded-lg border border-border bg-card transition hover:scale-105 hover:shadow-md"
            >
              {Icon ? <Icon className="size-6" /> : null}
            </a>
          )
        })}
      </div>
    </div>
  )
}
```

Notes :
- Résolution d'icône simplifiée (support uniquement `simple-icons:<slug>`, pas `lucide:` car on sait que SOCIAL_LINKS ne contient que des Simple Icons).
- `Record<SocialSlug, string>` typé à partir du type exporté par `social-links-config.ts`.
- Pattern `hover:scale-105 hover:shadow-md transition` cohérent avec DESIGN.md (cards custom).

- [ ] **Step 5.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 6 : Composant `ContactForm` (Client, stub submit)

**Files:**
- Create: `src/components/features/contact/ContactForm.tsx`

Client Component avec 5 champs shadcn dans une `Card`. Handler submit stub : `toast.success(stubMessage)` + `console.log` des données. Pattern `useActionState` + `useFormStatus` (sous-composant `SubmitButton`) pour faciliter l'extension Feature 4. Si la config React/next-intl pose problème au moment de l'impl (ex: Server Action non requis ici), fallback documenté en note : remplacer par `onSubmit` + `useState('idle' | 'submitting')`.

- [ ] **Step 6.1 : Créer le composant**

```typescript
// src/components/features/contact/ContactForm.tsx
'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type FormState = {
  submitted: boolean
}

const initialState: FormState = { submitted: false }

type Labels = {
  name: string
  company: string
  companyOptional: string
  email: string
  subject: string
  message: string
  namePlaceholder: string
  companyPlaceholder: string
  emailPlaceholder: string
  subjectPlaceholder: string
  messagePlaceholder: string
  submit: string
  submitting: string
  stubToast: string
}

type Props = {
  labels: Labels
  defaultSubject?: string
}

export function ContactForm({ labels, defaultSubject = '' }: Props) {
  const [, formAction] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const payload = {
        name: String(formData.get('name') ?? ''),
        company: String(formData.get('company') ?? ''),
        email: String(formData.get('email') ?? ''),
        subject: String(formData.get('subject') ?? ''),
        message: String(formData.get('message') ?? ''),
      }
      // Feature 4 remplacera ce bloc par l'appel Server Action SMTP + validation Zod.
      console.log('[ContactForm stub] payload:', payload)
      toast.success(labels.stubToast)
      return { submitted: true }
    },
    initialState,
  )

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-5">
          <Field id="name" label={labels.name} required>
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder={labels.namePlaceholder}
            />
          </Field>

          <Field id="company" label={`${labels.company} ${labels.companyOptional}`}>
            <Input
              id="company"
              name="company"
              type="text"
              placeholder={labels.companyPlaceholder}
            />
          </Field>

          <Field id="email" label={labels.email} required>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder={labels.emailPlaceholder}
            />
          </Field>

          <Field id="subject" label={labels.subject} required>
            <Input
              id="subject"
              name="subject"
              type="text"
              required
              defaultValue={defaultSubject}
              placeholder={labels.subjectPlaceholder}
            />
          </Field>

          <Field id="message" label={labels.message} required>
            <Textarea
              id="message"
              name="message"
              required
              rows={6}
              placeholder={labels.messagePlaceholder}
            />
          </Field>

          <SubmitButton label={labels.submit} submittingLabel={labels.submitting} />
        </form>
      </CardContent>
    </Card>
  )
}

function Field({
  id,
  label,
  required = false,
  children,
}: {
  id: string
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  )
}

function SubmitButton({
  label,
  submittingLabel,
}: {
  label: string
  submittingLabel: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="mt-2 w-full sm:w-auto">
      {pending ? submittingLabel : label}
    </Button>
  )
}
```

Notes :
- Pattern `useActionState` + `useFormStatus` (cf. `.claude/rules/react/hooks.md`) = prêt pour Feature 4 : remplacer uniquement la fonction passée à `useActionState` par `submitContact` (Server Action).
- `SubmitButton` est un enfant du `<form>` pour que `useFormStatus` fonctionne (règle projet).
- **Fallback si `useActionState` pose problème à l'impl** : remplacer `formAction` par un `onSubmit` classique avec `useState<'idle' | 'submitting'>` et `preventDefault`. L'API publique du composant (props `labels`, `defaultSubject`) ne change pas.
- `defaultSubject` utilisé via `defaultValue` sur l'input → l'utilisateur peut éditer après arrivée sur la page.

- [ ] **Step 6.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur. Si `useActionState` import incorrect ou signature mismatch → ajuster (React 19 exporte `useActionState` depuis `react`, `useFormStatus` depuis `react-dom`).

---

## Task 7 : Page `/contact` (orchestration)

**Files:**
- Modify: `src/app/[locale]/(public)/contact/page.tsx`

Server Component async. Lit `searchParams.service`, dérive `defaultSubject` via i18n, compose le layout complet.

- [ ] **Step 7.1 : Remplacer intégralement le contenu du fichier**

```typescript
// src/app/[locale]/(public)/contact/page.tsx
import type { Metadata } from 'next'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { ContactForm } from '@/components/features/contact/ContactForm'
import { ContactHeader } from '@/components/features/contact/ContactHeader'
import { CalendlyWidget } from '@/components/features/contact/CalendlyWidget'
import { SocialLinks } from '@/components/features/contact/SocialLinks'
import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
} from '@/lib/seo'
import { setupLocalePage } from '@/i18n/locale-guard'

const PREFILL_SLUGS = ['ia', 'fullstack', 'formation'] as const
type PrefillSlug = (typeof PREFILL_SLUGS)[number]

function isPrefillSlug(value: string | undefined): value is PrefillSlug {
  return typeof value === 'string' && (PREFILL_SLUGS as readonly string[]).includes(value)
}

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

  const tCalendly = await getTranslations('ContactPage.calendly')
  const tForm = await getTranslations('ContactPage.form')
  const tPrefill = await getTranslations('ContactPage.form.subjectPrefill')
  const tCv = await getTranslations('ContactPage.cv')

  const defaultSubject = isPrefillSlug(serviceParam) ? tPrefill(serviceParam) : ''

  const formLabels = {
    name: tForm('fields.name'),
    company: tForm('fields.company'),
    companyOptional: tForm('fields.companyOptional'),
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
    stubToast: tForm('stubToast'),
  }

  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL ?? ''

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <ContactHeader />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <section className="flex flex-col gap-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {tCalendly('title')}
          </h2>
          <CalendlyWidget url={calendlyUrl} fallbackMessage={tCalendly('fallback')} />
          <SocialLinks />
        </section>

        <section className="flex flex-col gap-8">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {(await getTranslations('ContactPage.form'))('title')}
          </h2>
          <ContactForm labels={formLabels} defaultSubject={defaultSubject} />
        </section>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">{tCv('label')}</p>
        <DownloadCvButton locale={locale} variant="ghost" />
      </div>
    </main>
  )
}
```

Notes :
- `await searchParams` obligatoire Next 16 (hard error sinon, cf. `.claude/rules/nextjs/routing.md`).
- Si `service` est un tableau (URL mal formée `?service=a&service=b`), on prend le premier élément par sécurité, puis le `isPrefillSlug` filtre.
- Le typage `PREFILL_SLUGS` côté page évite de dépendre d'un import cross-feature.
- Double `getTranslations('ContactPage.form')` évité en factorisant dans `formLabels`. Le second appel pour `tForm('title')` est déjà dans `tForm`. (Remarque : le snippet ci-dessus contient un appel redondant `await getTranslations('ContactPage.form')` pour le H2 form title — le corriger en `{tForm('title')}`.)

- [ ] **Step 7.2 : Corriger le doublon `getTranslations` pour le H2 du form**

Remplacer dans le snippet précédent :

```typescript
{(await getTranslations('ContactPage.form'))('title')}
```

par :

```typescript
{tForm('title')}
```

- [ ] **Step 7.3 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 8 : Étoffer les messages `ContactPage`

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

Remplacer le bloc `ContactPage` actuel (`{ title, placeholder }`) par la structure nested complète. Parité FR/EN stricte.

- [ ] **Step 8.1 : Mettre à jour `messages/fr.json` (namespace `ContactPage`)**

Remplacer le bloc `ContactPage` par :

```json
  "ContactPage": {
    "title": "Contact",
    "header": {
      "h1": "Contact",
      "tagline": "Parlons de votre projet IA, de votre application sur mesure ou d'une formation pour vos équipes.",
      "location": "Luxembourg · France · Remote"
    },
    "calendly": {
      "title": "Réservez un créneau",
      "subtitle": "Un échange de 30 minutes pour cadrer votre besoin.",
      "fallback": "Prise de rendez-vous bientôt disponible. En attendant, utilisez le formulaire à droite ou écrivez-moi via LinkedIn."
    },
    "social": {
      "title": "Ou retrouvez-moi",
      "ariaLabel": {
        "linkedin": "Profil LinkedIn de Thibaud Geisler",
        "github": "Profil GitHub de Thibaud Geisler"
      }
    },
    "form": {
      "title": "Envoyez-moi un message",
      "subtitle": "Je vous réponds sous 24 à 48 h ouvrées.",
      "fields": {
        "name": "Nom complet",
        "company": "Entreprise",
        "companyOptional": "(optionnel)",
        "email": "Email",
        "subject": "Sujet",
        "message": "Message"
      },
      "placeholders": {
        "name": "Jeanne Dupont",
        "company": "Acme SAS",
        "email": "jeanne@exemple.com",
        "subject": "Sujet de votre message",
        "message": "Décrivez votre besoin, votre contexte et vos questions…"
      },
      "submit": "Envoyer",
      "submitting": "Envoi…",
      "stubToast": "Merci, message bien reçu côté interface. L'envoi réel sera activé très prochainement.",
      "subjectPrefill": {
        "ia": "Projet IA & Automatisation",
        "fullstack": "Projet Développement Full-Stack",
        "formation": "Formation IA en entreprise"
      }
    },
    "cv": {
      "label": "Ou téléchargez directement mon CV :"
    }
  },
```

(Attention à la virgule de clôture vers le namespace suivant.)

- [ ] **Step 8.2 : Mettre à jour `messages/en.json` (namespace `ContactPage`)**

Remplacer le bloc `ContactPage` par :

```json
  "ContactPage": {
    "title": "Contact",
    "header": {
      "h1": "Contact",
      "tagline": "Let's talk about your AI project, your custom application or a training session for your team.",
      "location": "Luxembourg · France · Remote"
    },
    "calendly": {
      "title": "Book a slot",
      "subtitle": "A 30-minute call to scope your need.",
      "fallback": "Online booking coming soon. In the meantime, use the form on the right or reach out via LinkedIn."
    },
    "social": {
      "title": "Or reach me on",
      "ariaLabel": {
        "linkedin": "Thibaud Geisler's LinkedIn profile",
        "github": "Thibaud Geisler's GitHub profile"
      }
    },
    "form": {
      "title": "Send me a message",
      "subtitle": "I reply within 24 to 48 business hours.",
      "fields": {
        "name": "Full name",
        "company": "Company",
        "companyOptional": "(optional)",
        "email": "Email",
        "subject": "Subject",
        "message": "Message"
      },
      "placeholders": {
        "name": "Jane Doe",
        "company": "Acme Inc.",
        "email": "jane@example.com",
        "subject": "What's your message about?",
        "message": "Describe your need, your context and your questions…"
      },
      "submit": "Send",
      "submitting": "Sending…",
      "stubToast": "Thanks, message received on the UI side. Actual sending will be enabled very soon.",
      "subjectPrefill": {
        "ia": "AI & Automation Project",
        "fullstack": "Full-Stack Development Project",
        "formation": "AI Training for Companies"
      }
    },
    "cv": {
      "label": "Or download my CV directly:"
    }
  },
```

- [ ] **Step 8.3 : Vérifier la validité JSON**

Commande : `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('OK')"`
Attendu : `OK`.

---

## Task 9 : Ajouter `NEXT_PUBLIC_CALENDLY_URL` à `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 9.1 : Ajouter l'entrée env var**

Ajouter à la fin de `.env.example` (ou dans la section "Variables publiques" si elle existe) :

```dotenv
# Calendly — URL du widget inline pour la prise de rendez-vous sur /contact
# Format : https://calendly.com/<slug>/<event-type>
# Exemple : https://calendly.com/thibaud-geisler/30min
# Laissez vide pour afficher le fallback "Prise de rendez-vous bientôt disponible"
NEXT_PUBLIC_CALENDLY_URL=
```

Si `.env.example` contient déjà une variable similaire ou si la structure existante impose un ordre alphabétique, adapter en conséquence (grep d'abord : `grep -n "CALENDLY\|PUBLIC" .env.example`).

- [ ] **Step 9.2 : Vérification**

Commande : `grep "NEXT_PUBLIC_CALENDLY_URL" .env.example`
Attendu : la ligne est bien présente avec son commentaire.

---

## Task 10 : Verification finale

Aucun test automatisé (`tdd_scope: none`). Verification = gates qualité + inspection navigateur manuelle (stub submit + pré-remplissage query param).

- [ ] **Step 10.1 : Compléter les URLs réseaux dans `social-links-config.ts`**

**Action manuelle utilisateur** : remplacer les placeholders `<replace-with-real-slug>` (LinkedIn) et `<replace-with-real-username>` (GitHub) par les vraies URLs.

Commande de vérification : `grep "replace-with-real" src/components/features/contact/social-links-config.ts`
Attendu : aucun match (placeholders tous remplacés).

- [ ] **Step 10.2 : Renseigner `NEXT_PUBLIC_CALENDLY_URL` localement (optionnel mais recommandé pour smoke)**

**Action manuelle utilisateur** : dans `.env` local, définir `NEXT_PUBLIC_CALENDLY_URL=<ton-url>` si tu veux tester le widget réel. Sinon, le fallback sera testé au smoke.

- [ ] **Step 10.3 : Lint**

Commande : `just lint`
Attendu : 0 error, warnings uniquement préexistants.

- [ ] **Step 10.4 : Typecheck global**

Commande : `just typecheck`
Attendu : 0 erreur.

- [ ] **Step 10.5 : Build**

Commande : `just build`
Attendu : build Next.js OK, route `/[locale]/contact` listée (probablement `ƒ Dynamic` car `searchParams` lu).

- [ ] **Step 10.6 : Smoke test FR**

1. `just dev` (serveur sur `http://localhost:3000`).
2. Ouvrir `http://localhost:3000/contact`.
3. Vérifier visuellement :
   - **Header** : badge Mail 48×48 `bg-primary/10`, H1 `Contact` en Sansation, tagline et ligne location en `text-muted-foreground`.
   - **Colonne gauche** : H2 `Réservez un créneau`, widget Calendly visible (700px) si URL renseignée OU fallback `border-dashed` sinon. H3 `Ou retrouvez-moi`, 2 badges 56×56 (LinkedIn + GitHub), icônes Simple Icons centrées, hover scale+shadow.
   - **Colonne droite** : H2 `Envoyez-moi un message`, Card contenant 5 champs (Nom complet, Entreprise (optionnel), Email, Sujet, Message) avec labels, placeholders, required markers `*` en rouge, bouton `Envoyer`.
   - **Footer** : texte `Ou téléchargez directement mon CV :` + bouton ghost CV.
4. Tester **stub submit** : remplir Nom, Email, Sujet, Message, cliquer `Envoyer` → toast sonner apparaît avec le message stub, console devtools affiche `[ContactForm stub] payload:`.
5. Tester **validation HTML5** : laisser Email vide → navigateur bloque avec message standard. Saisir `notanemail` dans Email → navigateur refuse.
6. Tester **liens réseaux** : clic LinkedIn → ouvre URL dans nouvel onglet, `rel="noopener noreferrer"` présent (DevTools Elements).
7. Tester **pré-remplissage** : ouvrir `http://localhost:3000/contact?service=ia` → champ Sujet pré-rempli avec `Projet IA & Automatisation`. Idem `?service=fullstack` et `?service=formation`. Tester `?service=unknown` → Sujet vide.
8. Tester **responsive** : `< 1024px` → stack vertical (Calendly puis réseaux puis form puis CV), badges réseaux toujours côte à côte. `≥ 1024px` → 2 cols.
9. Vérifier `<head>` DevTools : `<title>` = `Contact | ...`, `og:locale=fr_FR`, `<link rel="alternate" hreflang="fr|en|x-default">`.

Attendu : tous les points OK, aucune erreur console hors hot-reload dev.

- [ ] **Step 10.7 : Smoke test EN**

1. Ouvrir `http://localhost:3000/en/contact`.
2. Vérifier traductions : header EN (`Let's talk about your AI project...`), Calendly title EN (`Book a slot`), social title EN (`Or reach me on`), form labels EN (`Full name`, `Company`, `Email`, `Subject`, `Message`), submit EN (`Send`), stubToast EN.
3. Tester `http://localhost:3000/en/contact?service=formation` → Subject = `AI Training for Companies`.
4. Vérifier `og:locale=en_US`.

Attendu : contenu intégralement en anglais, pré-remplissage slug → label EN.

- [ ] **Step 10.8 : Arrêter le serveur dev**

Commande : `just stop`
Attendu : port 3000 libéré.

- [ ] **Step 10.9 : Proposer le commit au user (discipline CLAUDE.md)**

Ne PAS commit automatiquement. Demander à l'utilisateur :

> "Verification complète OK (lint + typecheck + build + smoke FR/EN + stub submit + pré-remplissage). URLs réseaux complétées, `NEXT_PUBLIC_CALENDLY_URL` dans `.env.example`. Je peux committer ce sub-project ? Message suggéré : `feat(contact): page /contact avec Calendly, réseaux et form UI stub`."

Attendre validation explicite avant `git add` / `git commit`.

---

## Status du spec

La mise à jour du `status` du spec de `draft` vers `implemented` (frontmatter de [`04-page-contact-layout-design.md`](../../specs/pages-publiques-portfolio/04-page-contact-layout-design.md)) **n'est pas réalisée dans ce plan**. Elle est déléguée au workflow parent `/implement-subproject` (gates `/simplify` + `code/code-reviewer` + mise à jour status après approbation finale).

---

## Self-review

**Spec coverage** (chaque scénario et décision du spec mappé à une task) :
- Scénario 1 (rendu FR complet) → Tasks 3, 4, 5, 6, 7, 8 + smoke 10.6.
- Scénario 2 (rendu EN) → Task 8.2 + smoke 10.7.
- Scénario 3 (pré-remplissage `searchParams`) → Task 7 (`isPrefillSlug` + `defaultSubject`) + smoke 10.6 point 7 et 10.7 point 3.
- Scénario 4 (stub submit) → Task 1 (Toaster monté) + Task 6 (handler `toast.success` + `console.log`) + smoke 10.6 point 4.
- Scénario 5 (validation HTML5) → Task 6 (`required`, `type="email"`) + smoke 10.6 point 5.
- Scénario 6 (URL Calendly absente) → Task 4 (branche `if (!url)`) + smoke 10.6 point 3 (fallback).
- Scénario 7 (liens réseaux sécurisés) → Task 5 (`target="_blank" rel="noopener noreferrer"` + aria-label) + smoke 10.6 point 6.
- Scénario 8 (metadata SEO localisée) → Task 7 (`generateMetadata`) + smoke 10.6 point 9 et 10.7 point 4.
- Scénario 9 (responsive mobile) → Task 7 (`grid lg:grid-cols-2`) + smoke 10.6 point 8.
- Scénario 10 (responsive desktop) → idem.
- Scénario 11 (extension Feature 4 sans refactor) → Task 6 (pattern `useActionState` + commentaire `// Feature 4 remplacera ce bloc`).
- Edge case "script Calendly bloqué" → Task 4 (fallback `min-h-[700px]` évite CLS).
- Edge case "URL Calendly invalide" → non couvert code, hors scope.
- Edge case "URLs réseaux placeholder" → Task 10.1 (action manuelle + `grep`).
- Edge case "slug inconnu" → Task 7 (`isPrefillSlug` filtre, `defaultSubject = ''`).
- Edge case "Toaster non monté" → Task 1 (mount dans Providers).
- Edge case "re-soumission rapide" → Task 6 (`disabled={pending}` sur SubmitButton via `useFormStatus`).
- Edge case "Entreprise vide" → Task 6 (pas de `required` sur input company).
- Décision archi A (form UI dans sub 04) → Tasks 6 + 7 (ContactForm + orchestration searchParams).
- Décision archi B (Calendly inline) → Task 4.
- Décision archi C (pré-remplissage Server-side) → Task 7 (`isPrefillSlug` + prop `defaultSubject`).
- Décision archi D (stub sonner.toast) → Task 1 + Task 6.
- Décision archi E (carte du monde abandonnée) → remplacée par ligne `location` dans `ContactHeader` (Task 3).
- Open question "Toaster monté ?" → Task 1 résout.
- Open question "CSP Calendly" → explicitement hors scope plan (à vérifier par responsable infra).

**Placeholder scan** : pas de `TBD` / `TODO` / `à définir` / `implement later`. Les placeholders `<replace-with-real-slug>` et `<replace-with-real-username>` dans `social-links-config.ts` sont **volontaires et grep-ables**, avec une Task 10.1 dédiée pour leur remplacement par l'utilisateur. `NEXT_PUBLIC_CALENDLY_URL` vide dans `.env.example` est aussi volontaire (valeur à renseigner en `.env` local / prod).

**Type consistency** :
- `SocialSlug = 'linkedin' | 'github'` (Task 2) ↔ `Record<SocialSlug, string>` ariaLabels (Task 5) : cohérent.
- `SOCIAL_LINKS` (Task 2) ↔ import Task 5 : cohérent.
- `Labels` type (Task 6) ↔ `formLabels` construit (Task 7) : tous les champs présents et alignés.
- `PrefillSlug = 'ia' | 'fullstack' | 'formation'` (Task 7) ↔ clés i18n `subjectPrefill.{ia,fullstack,formation}` (Task 8) : cohérent.
- `Props` de `CalendlyWidget` (Task 4) ↔ appel page (Task 7) : `url` + `fallbackMessage` cohérents.
- `Props` de `ContactForm` (Task 6) ↔ appel page (Task 7) : `labels` + `defaultSubject` cohérents.

Aucune divergence détectée.

---

## Execution Handoff

Plan sauvegardé dans [`docs/superpowers/plans/pages-publiques-portfolio/04-page-contact-layout.md`](./04-page-contact-layout.md).

Deux options d'exécution lorsqu'on passera à l'implémentation :

1. **Subagent-Driven (recommandé)** — `superpowers:subagent-driven-development` dispatch un subagent frais par task, review entre tasks. Aligné avec `/implement-subproject` qui intègre `/simplify` et `code/code-reviewer` comme gates.
2. **Inline Execution** — `superpowers:executing-plans`, batch avec checkpoints dans la session courante.

Pas d'exécution dans le cadre de `/decompose-feature` : la phase d'implémentation est déclenchée via `/implement-subproject pages-publiques-portfolio 04`.
