# Plan d'implémentation — `01-page-services`

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le placeholder de `src/app/[locale]/(public)/services/page.tsx` par la page `/services` fonctionnelle : header H1 + 3 cards (IA & Automatisation, Développement Full-Stack, Formation IA) avec icône Lucide, bullets, CTA vers `/contact?service=<slug>`, animation scroll, metadata SEO localisée, FR/EN.

**Architecture:** Server Component pour la page et `ServiceCard` (shadcn `Card` + Lucide + shadcn `Button`), leaf Client Component `ServicesGrid` pour le wrapper Motion (pattern "Server child of Client"). Contenu dans `messages/{fr,en}.json` sous `ServicesPage.offers.<slug>.*`, ordre et mapping icône dans `service-slugs.ts` (constante TS dérivée via `typeof`).

**Tech Stack:** Next.js 16 App Router (PPR, `cacheComponents: true`), React 19, TypeScript 6 strict, next-intl 4.9.1, shadcn/ui, Motion 12, Lucide React.

**Spec de référence:** [`docs/superpowers/specs/pages-publiques-portfolio/01-page-services-design.md`](../../specs/pages-publiques-portfolio/01-page-services-design.md).

**Rappels projet:**
- `tdd_scope: none` → pas de tests à écrire dans ce sub-project (règle no-lib-test : pas de règle métier projet testable ici).
- Discipline commit CLAUDE.md : **aucun commit intermédiaire** dans ce plan. Proposer au user un unique commit après Task 6 (verification complète OK).
- Helpers existants à réutiliser **sans modification** : `setupLocalePage` ([src/i18n/locale-guard.ts](../../../../src/i18n/locale-guard.ts)), `setupLocaleMetadata`, `buildLanguageAlternates`, `localeToOgLocale` ([src/lib/seo.ts](../../../../src/lib/seo.ts)).
- `Link` localisé = `@/i18n/navigation` (pas `next/link`) — next-intl expose un wrapper qui ajoute le prefix locale.
- Convention nommage : composants features en PascalCase (`ServiceCard.tsx`), constantes en kebab-case (`service-slugs.ts`).

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `src/components/features/services/service-slugs.ts` | Constante `SERVICE_SLUGS`, type `ServiceSlug`, mapping `ICON_MAP` slug→Lucide | Créer |
| `src/components/features/services/ServiceCard.tsx` | Card présentielle Server Component (shadcn `Card` + icône + bullets + CTA) | Créer |
| `src/components/features/services/ServicesGrid.tsx` | Wrapper Client Component avec Motion (fade-in + slide-up + stagger sur viewport entry) | Créer |
| `src/app/[locale]/(public)/services/page.tsx` | Page Server Component qui compose header + `ServicesGrid` + 3 `ServiceCard` | Modifier (remplacer placeholder) |
| `messages/fr.json` | Étoffe `ServicesPage` avec `subtitle` + `offers.{ia,fullstack,formation}.*` | Modifier |
| `messages/en.json` | Parité stricte EN | Modifier |

---

## Task 1 : Constante `SERVICE_SLUGS` + mapping icônes

**Files:**
- Create: `src/components/features/services/service-slugs.ts`

Cette étape pose la source de vérité pour l'ordre des offres (`ia`, `fullstack`, `formation`) et le mapping vers les icônes Lucide. Le type `ServiceSlug` est dérivé via `typeof` conformément à `.claude/rules/typescript/conventions.md`.

- [ ] **Step 1.1 : Créer le fichier avec la constante, le type et le mapping icônes**

```typescript
// src/components/features/services/service-slugs.ts
import type { LucideIcon } from 'lucide-react'
import { Bot, Code, GraduationCap } from 'lucide-react'

export const SERVICE_SLUGS = ['ia', 'fullstack', 'formation'] as const

export type ServiceSlug = (typeof SERVICE_SLUGS)[number]

export const SERVICE_ICONS: Record<ServiceSlug, LucideIcon> = {
  ia: Bot,
  fullstack: Code,
  formation: GraduationCap,
}
```

- [ ] **Step 1.2 : Vérifier le typecheck local du fichier**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur rapportée pour `src/components/features/services/service-slugs.ts`. (Si le reste du repo a des erreurs préexistantes, filtrer mentalement sur le chemin créé.)

---

## Task 2 : Messages i18n — namespace `ServicesPage` étoffé

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

Le namespace `ServicesPage` contient actuellement `{ title, placeholder }` dans les deux fichiers. On remplace `placeholder` par la structure `subtitle` + `offers.<slug>.{title,description,bullets,ctaLabel}`. Lecture des bullets via `t.raw('offers.<slug>.bullets') as string[]`. Rédactionnel provisoire (le user affinera sans refacto de code). Parité FR/EN stricte obligatoire (convention projet, voir `.claude/rules/next-intl/translations.md`).

- [ ] **Step 2.1 : Mettre à jour le namespace `ServicesPage` dans `messages/fr.json`**

Remplacer intégralement le bloc `"ServicesPage": { "title": "Services", "placeholder": "Contenu à venir." }` par :

```json
  "ServicesPage": {
    "title": "Services",
    "subtitle": "Trois façons de travailler ensemble, du prototype IA au produit full-stack, en passant par la montée en compétences de vos équipes.",
    "offers": {
      "ia": {
        "title": "IA & Automatisation",
        "description": "Je conçois et intègre des solutions IA sur mesure : assistants RAG, agents, pipelines d'automatisation métier, intégrations LLM dans vos outils existants.",
        "bullets": [
          "Cadrage d'un cas d'usage IA concret et mesurable",
          "Prototype rapide (POC) puis mise en production",
          "Intégration dans votre stack existante (API, CRM, outils internes)",
          "Automatisations sur mesure (n8n, scripts, webhooks)"
        ],
        "ctaLabel": "Parler de mon besoin IA"
      },
      "fullstack": {
        "title": "Développement Full-Stack",
        "description": "Applications web et API sur mesure, du design à la mise en ligne. Stack moderne (TypeScript, Next.js, Node, Postgres) pensée pour la performance et la maintenabilité.",
        "bullets": [
          "Sites et applications web (Next.js, React, Node)",
          "APIs et intégrations tierces",
          "Bases de données relationnelles et ORMs (Postgres, Prisma)",
          "Déploiement, CI/CD, observabilité"
        ],
        "ctaLabel": "Discuter de mon projet"
      },
      "formation": {
        "title": "Formation IA en entreprise",
        "description": "Formations pratiques à l'IA générative pour vos équipes, adaptées au niveau et au contexte métier. Formats courts ou approfondis, en présentiel ou à distance.",
        "bullets": [
          "Introduction à l'IA générative et aux LLM",
          "Prompt engineering appliqué aux cas métier",
          "Ateliers pratiques sur vos outils (ChatGPT, Claude, Copilot)",
          "Mise en place d'automatisations internes"
        ],
        "ctaLabel": "Organiser une formation"
      }
    }
  },
```

(Attention : le bloc courant est suivi de `ProjectsPage`, veiller à la virgule de clôture correcte.)

- [ ] **Step 2.2 : Mettre à jour `messages/en.json` avec la même structure, traduite**

Remplacer le bloc équivalent par :

```json
  "ServicesPage": {
    "title": "Services",
    "subtitle": "Three ways to work together, from AI prototypes to full-stack products, through upskilling your teams.",
    "offers": {
      "ia": {
        "title": "AI & Automation",
        "description": "I design and integrate tailor-made AI solutions: RAG assistants, agents, business automation pipelines, LLM integrations into your existing tools.",
        "bullets": [
          "Scoping a concrete, measurable AI use case",
          "Rapid prototype (POC) then production rollout",
          "Integration into your existing stack (API, CRM, internal tools)",
          "Custom automations (n8n, scripts, webhooks)"
        ],
        "ctaLabel": "Discuss my AI needs"
      },
      "fullstack": {
        "title": "Full-Stack Development",
        "description": "Custom web apps and APIs, from design to go-live. Modern stack (TypeScript, Next.js, Node, Postgres) built for performance and maintainability.",
        "bullets": [
          "Web apps and sites (Next.js, React, Node)",
          "APIs and third-party integrations",
          "Relational databases and ORMs (Postgres, Prisma)",
          "Deployment, CI/CD, observability"
        ],
        "ctaLabel": "Discuss my project"
      },
      "formation": {
        "title": "AI Training for Companies",
        "description": "Hands-on generative AI training for your teams, tailored to skill level and business context. Short or in-depth formats, onsite or remote.",
        "bullets": [
          "Introduction to generative AI and LLMs",
          "Prompt engineering applied to business use cases",
          "Hands-on workshops on your tools (ChatGPT, Claude, Copilot)",
          "Setting up internal automations"
        ],
        "ctaLabel": "Organize a training session"
      }
    }
  },
```

- [ ] **Step 2.3 : Vérifier la validité JSON des deux fichiers**

Commande : `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('OK')"`
Attendu : `OK` sur stdout, aucune SyntaxError.

---

## Task 3 : Composant `ServiceCard` (Server Component)

**Files:**
- Create: `src/components/features/services/ServiceCard.tsx`

Composant présentiel pur, Server-renderable. Reçoit un `slug` (pour l'icône + le href CTA) et les textes déjà résolus par la page (`title`, `description`, `bullets`, `ctaLabel`). Pas de `'use client'`. Utilise `Link` de `@/i18n/navigation` pour respecter le prefix locale, `Card` shadcn pour la structure, `Button` shadcn pour le CTA.

- [ ] **Step 3.1 : Créer le composant**

```typescript
// src/components/features/services/ServiceCard.tsx
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { SERVICE_ICONS, type ServiceSlug } from './service-slugs'

type Props = {
  slug: ServiceSlug
  title: string
  description: string
  bullets: string[]
  ctaLabel: string
}

export function ServiceCard({ slug, title, description, bullets, ctaLabel }: Props) {
  const Icon = SERVICE_ICONS[slug]

  return (
    <Card
      className={cn(
        'flex h-full flex-col',
        'transition hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <CardHeader className="gap-4">
        <Icon className="size-8 text-primary" aria-hidden />
        <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="flex flex-col gap-2 text-base">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full">
          <Link href={{ pathname: '/contact', query: { service: slug } }}>
            {ctaLabel}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
```

Notes :
- `Icon` est dérivé du `SERVICE_ICONS` colocalisé, aucune prop `icon` dans l'API publique du composant (encapsulation).
- `Link` avec `href` objet `{ pathname, query }` préserve le typage et le prefix locale next-intl (évite de hardcoder `/fr/contact`).
- `Button asChild` délègue le rendu au `Link` tout en gardant les styles du Button (pattern shadcn standard).
- Hover géré en CSS Tailwind pur (pas de Motion sur le hover), le Motion viendra de `ServicesGrid`.

- [ ] **Step 3.2 : Vérifier le typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur sur `ServiceCard.tsx`. Si l'import `@/components/ui/card` râle sur une sub-component absente (`CardDescription` etc.), ouvrir `src/components/ui/card.tsx` pour lister les exports réels et adapter l'import.

---

## Task 4 : Composant `ServicesGrid` (Client Component avec Motion)

**Files:**
- Create: `src/components/features/services/ServicesGrid.tsx`

Wrapper minimal client-only. Reçoit les 3 `<ServiceCard>` déjà rendus en Server en `children` et applique un `motion.div` autour de chaque enfant (stagger 0.1s). `viewport={{ once: true }}` pour ne pas rejouer l'animation au re-scroll. La grid responsive (1/2/3 colonnes) est portée par ce composant.

- [ ] **Step 4.1 : Créer le composant**

```typescript
// src/components/features/services/ServicesGrid.tsx
'use client'

import { Children } from 'react'
import { motion } from 'motion/react'

type Props = {
  children: React.ReactNode
}

export function ServicesGrid({ children }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Children.map(children, (child, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          viewport={{ once: true, amount: 0.2 }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}
```

Notes :
- Import `motion/react` (convention Motion 12, remplace l'ancien `framer-motion`).
- `Children.map` conserve les keys React sans recréer les ServiceCard (ils arrivent déjà avec leurs props side-server).
- `amount: 0.2` = 20% de la card visible avant de déclencher l'anim (léger garde-fou anti-flicker).

- [ ] **Step 4.2 : Vérifier le typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur sur `ServicesGrid.tsx`.

---

## Task 5 : Remplacer la page `/services` par la version complète

**Files:**
- Modify: `src/app/[locale]/(public)/services/page.tsx`

La page Server Component :
1. Appelle `setupLocalePage(params)` (obligation `setRequestLocale` pour SSG par locale, voir `.claude/rules/next-intl/setup.md`).
2. Obtient `getTranslations('ServicesPage')` via next-intl.
3. Compose header + grid des 3 cards via itération sur `SERVICE_SLUGS`.
4. Conserve `generateMetadata` identique au placeholder actuel (reprise stricte du pattern helpers existants).

- [ ] **Step 5.1 : Remplacer intégralement le contenu du fichier**

```typescript
// src/app/[locale]/(public)/services/page.tsx
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { setupLocalePage } from '@/i18n/locale-guard'
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
} from '@/lib/seo'

import { ServiceCard } from '@/components/features/services/ServiceCard'
import { ServicesGrid } from '@/components/features/services/ServicesGrid'
import { SERVICE_SLUGS } from '@/components/features/services/service-slugs'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/services'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)

  return {
    title: t('servicesTitle'),
    description: t('servicesDescription'),
    openGraph: { locale: localeToOgLocale[locale] },
    alternates: { languages: buildLanguageAlternates('/services') },
  }
}

export default async function ServicesPage({ params }: PageProps<'/[locale]/services'>) {
  await setupLocalePage(params)
  const t = await getTranslations('ServicesPage')

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <header className="mb-12 flex flex-col items-center gap-3 text-center lg:mb-16">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {t('title')}
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>
      </header>

      <ServicesGrid>
        {SERVICE_SLUGS.map((slug) => (
          <ServiceCard
            key={slug}
            slug={slug}
            title={t(`offers.${slug}.title`)}
            description={t(`offers.${slug}.description`)}
            bullets={t.raw(`offers.${slug}.bullets`) as string[]}
            ctaLabel={t(`offers.${slug}.ctaLabel`)}
          />
        ))}
      </ServicesGrid>
    </main>
  )
}
```

Notes :
- `setupLocaleMetadata` retourne déjà `{ locale, t }` avec `t` scopé sur `Metadata` → `t('servicesTitle')` / `t('servicesDescription')` pointent sur les clés déjà présentes dans `messages/*.json`.
- `setupLocalePage(params)` appelle `setRequestLocale` en interne → rendu statique par locale OK.
- `t.raw('offers.<slug>.bullets')` est la signature supportée par next-intl pour les arrays/objets (lecture brute sans ICU).

- [ ] **Step 5.2 : Vérifier le typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur sur la page ou les composants créés.

---

## Task 6 : Verification finale (lint + typecheck + build + smoke test navigateur)

Cette task valide l'intégrité du changement avant de proposer un commit au user. `tdd_scope: none` → pas de test automatisé dédié à ce sub-project. La verification est donc lint + typecheck + build (détecte tout oubli de type, import cassé, clé i18n absente au moment du bundle) + smoke test manuel FR/EN sur localhost.

- [ ] **Step 6.1 : Lint**

Commande : `just lint`
Attendu : `0 problem(s)` ou seulement des warnings préexistants (ne pas introduire de nouveau warning/error dans les fichiers créés/modifiés par ce sub-project).

- [ ] **Step 6.2 : Typecheck global**

Commande : `just typecheck`
Attendu : aucune erreur.

- [ ] **Step 6.3 : Build**

Commande : `just build`
Attendu : build Next.js réussit, route `/[locale]/services` apparaît dans le rapport (`○ Static` ou `ƒ Dynamic` acceptable, idéalement statique car aucune dynamic function n'est appelée).

- [ ] **Step 6.4 : Smoke test navigateur FR**

1. Lancer `just dev` (démarre le serveur Next sur `http://localhost:3000`).
2. Ouvrir `http://localhost:3000/services`.
3. Vérifier visuellement :
   - Header H1 `Services` en police `font-display` (Sansation), subtitle en `text-muted-foreground`.
   - 3 cards dans l'ordre IA / Full-Stack / Formation, chacune avec son icône Lucide en `text-primary` taille 32 px, titre H3, description, bullets à puces, CTA pleine largeur en bas.
   - Fade-in + slide-up au premier scroll dans le viewport (cards animées en cascade).
   - Hover card : légère translation vers le haut + ombre renforcée.
4. Clic CTA de la card IA → URL devient `/contact?service=ia`. Idem pour les deux autres (`fullstack`, `formation`).
5. Redimensionner la fenêtre : passage 1 → 2 → 3 colonnes aux breakpoints `md:` (768px) et `lg:` (1024px).
6. Ouvrir le DevTools → `<head>` → vérifier `<title>`, `<meta name="description">`, `<meta property="og:locale" content="fr_FR">`, `<link rel="alternate" hreflang="fr|en|x-default" ...>`.

Attendu : tous les points OK, pas d'erreur console, pas de hydration mismatch.

- [ ] **Step 6.5 : Smoke test navigateur EN**

1. Ouvrir `http://localhost:3000/en/services`.
2. Reproduire les vérifications de Step 6.4 en anglais.
3. Vérifier `<meta property="og:locale" content="en_US">` dans le `<head>`.

Attendu : contenu traduit intégralement, metadata en EN, CTA toujours vers `/en/contact?service=<slug>`.

- [ ] **Step 6.6 : Arrêter le serveur dev**

Commande : `just stop`
Attendu : port 3000 libéré.

- [ ] **Step 6.7 : Proposer le commit au user (discipline CLAUDE.md)**

Ne PAS commit automatiquement. Demander au user : "Verification complète OK (lint + typecheck + build + smoke FR/EN). Je peux committer ce sub-project (message suggéré : `feat(services): page /services avec 3 offres et CTA vers /contact`) ?"

Attendre la validation explicite du user avant `git add` / `git commit`.

---

## Status du spec

La mise à jour du `status` du spec de `draft` vers `implemented` (dans le frontmatter YAML de [`01-page-services-design.md`](../../specs/pages-publiques-portfolio/01-page-services-design.md)) **n'est pas réalisée dans ce plan**. Elle est déléguée au workflow parent `/implement-subproject` (gates `/simplify` + `code/code-reviewer` + mise à jour status après approbation finale).

---

## Self-review

**Spec coverage** (chaque élément du spec mappé à une task) :
- Scénario 1 (rendu FR complet) → Task 5 + Step 6.4.
- Scénario 2 (rendu EN) → Task 2 Step 2.2 + Step 6.5.
- Scénario 3 (metadata SEO localisée) → Task 5 Step 5.1 (`generateMetadata`) + Step 6.4 point 6.
- Scénario 4 (CTA vers `/contact?service=<slug>`) → Task 3 Step 3.1 (`Link` avec query) + Step 6.4 point 4.
- Scénario 5 (responsive) → Task 4 Step 4.1 (`md:grid-cols-2 lg:grid-cols-3`) + Step 6.4 point 5.
- Scénario 6 (animation scroll) → Task 4 Step 4.1 (`motion.div` + `whileInView` + stagger).
- Edge case "parité FR/EN bullets" → Task 2 Step 2.3 (JSON parse check) + convention projet. Aucun fallback code ajouté (décision spec).
- Architectural decision 1 (wrapper ad hoc vs générique) → implémentée via `ServicesGrid` ad hoc en Task 4.
- Architectural decision 2 (i18n vs DB) → implémentée via Task 1 + Task 2 (zero Prisma).

**Placeholder scan** : aucun `TBD` / `TODO` / `à définir` / `implement later` dans le plan. Tous les steps "show code" contiennent le code complet.

**Type consistency** :
- `SERVICE_SLUGS` (Task 1) ↔ `ServiceSlug` (Task 1, 3, 5) ↔ `SERVICE_ICONS` (Task 1, 3) : signatures cohérentes.
- `ServiceCard` props (Task 3) ↔ page call site (Task 5) : 5 props (`slug`, `title`, `description`, `bullets`, `ctaLabel`) identiques.
- `ServicesGrid` prop `children` (Task 4) ↔ page call site (Task 5) : cohérent.

Aucune divergence détectée.

---

## Execution Handoff

Plan sauvegardé dans [`docs/superpowers/plans/pages-publiques-portfolio/01-page-services.md`](./01-page-services.md).

Deux options d'exécution lorsqu'on passera à l'implémentation :

1. **Subagent-Driven (recommandé)** — `superpowers:subagent-driven-development` dispatch un subagent frais par task, review entre tasks, cadence rapide. Aligne avec la commande projet `/implement-subproject` qui intègre `/simplify` et `code/code-reviewer` comme gates de sortie.
2. **Inline Execution** — `superpowers:executing-plans`, batch avec checkpoints dans la session courante.

Pas d'exécution dans le cadre de `/decompose-feature` : la phase d'implémentation est déclenchée ultérieurement par `/implement-subproject pages-publiques-portfolio 01`.
