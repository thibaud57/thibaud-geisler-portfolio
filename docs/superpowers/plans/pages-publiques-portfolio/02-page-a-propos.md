# Plan d'implémentation — `02-page-a-propos`

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le placeholder de `src/app/[locale]/(public)/a-propos/page.tsx` par la page `/a-propos` complète : hero portrait + nom + tagline + CV téléchargeable, bio business (3 paragraphes i18n), 3 stats animées (XP auto + missions + clients dérivés DB) et stack technique groupée par `TagKind` dérivée des tags projets publiés.

**Architecture:** Server Component pour la page, `AboutHero` et `TechStackBadges` sont Server (hero), `NumberTickerStats` et `TechStackBadges` sont Client (animations Magic UI + résolution icônes Simple Icons/Lucide cohérente avec `TagBadge`). Queries Prisma wrappées `'use cache'` + `cacheTag('projects')` pour profiter de l'invalidation Feature 2. Portrait servi depuis le silo assets `/api/assets/branding/` (extend ADR-011).

**Tech Stack:** Next.js 16 App Router + PPR, React 19, TypeScript 6 strict, Prisma 7, next-intl 4.9.1, shadcn/ui, Magic UI (NumberTicker à installer), Motion 12, Lucide React, `@icons-pack/react-simple-icons`.

**Spec de référence:** [`docs/superpowers/specs/pages-publiques-portfolio/02-page-a-propos-design.md`](../../specs/pages-publiques-portfolio/02-page-a-propos-design.md).

**Rappels projet:**
- `tdd_scope: none` → pas de tests à écrire (no-lib-test : plumbing Prisma + présentationnel).
- Discipline commit CLAUDE.md : **aucun commit intermédiaire**. Proposer au user un commit final unique après Task 10 verte.
- Filtre "projet client" dans les queries = **`type: 'CLIENT'`** (enum `ProjectType` du schéma), pas magic string sur `companySlug`. Sémantiquement équivalent au wording du spec, plus propre.
- `buildAssetUrl(filename)` → `/api/assets/${filename}` (cf. `src/lib/assets.ts`), donc `buildAssetUrl('branding/portrait.webp')` → `/api/assets/branding/portrait.webp`.
- La DB doit être up + seedée pour le smoke test (`just docker-up` + `just db-seed`, ou équivalent).

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `src/components/magicui/number-ticker.tsx` | Composant Magic UI (généré par CLI) | Créer via CLI |
| `src/server/queries/about.ts` | 3 queries Prisma : missions livrées, clients servis, tags publiés | Créer |
| `src/components/features/about/tag-kind-order.ts` | Constante `KIND_ORDER` + helper `getYearsOfExperience` | Créer |
| `src/components/features/about/AboutHero.tsx` | Server Component, portrait + H1 + tagline + CV | Créer |
| `src/components/features/about/NumberTickerStats.tsx` | Client Component, wrap NumberTicker | Créer |
| `src/components/features/about/TechStackBadges.tsx` | Client Component, badges groupés par kind (résolution Simple Icons/Lucide) | Créer |
| `src/app/[locale]/(public)/a-propos/page.tsx` | Orchestration + 2 Suspense | Modifier |
| `messages/fr.json` | Étoffer `AboutPage` | Modifier |
| `messages/en.json` | Parité stricte EN | Modifier |
| `assets/branding/portrait.webp` (volume Docker) | Portrait perso servi via `/api/assets/branding/portrait.webp` | Upload ops manuel |

---

## Task 1 : Installer le composant NumberTicker Magic UI

**Files:**
- Create (via CLI) : `src/components/magicui/number-ticker.tsx`

Le CLI shadcn/magicui télécharge le composant dans `src/components/magicui/`. D'après la rule `.claude/rules/magic-ui/components.md`, la commande est `pnpm dlx shadcn@latest add @magicui/number-ticker`.

- [ ] **Step 1.1 : Lancer l'installation CLI**

Commande : `pnpm dlx shadcn@latest add @magicui/number-ticker`

Comportement attendu :
- Le CLI ajoute `src/components/magicui/number-ticker.tsx`
- Installe/valide les deps (Motion déjà présent : devrait être no-op)
- Peut afficher un prompt "overwrite Y/n" si un fichier conflit → répondre `y`

**Si le CLI est interactif (TUI qui bloque) et que Claude Code ne peut pas le lancer en non-interactif** : demander au user de l'exécuter lui-même dans son terminal, attendre confirmation, puis passer à 1.2 (règle CLAUDE.md global CLI-first).

- [ ] **Step 1.2 : Vérifier la présence et l'API du composant**

Commande : `ls src/components/magicui/number-ticker.tsx && head -30 src/components/magicui/number-ticker.tsx`

Attendu : le fichier existe, on voit la signature exportée. Noter la shape exacte des props (`value`, `startValue?`, `direction?`, `delay?`, `decimalPlaces?`, `className?`). Les noms de props peuvent varier selon la version du registry — ajuster les appels dans Task 5 si nécessaire.

---

## Task 2 : Queries server `about.ts`

**Files:**
- Create: `src/server/queries/about.ts`

Trois queries, pattern calqué sur `src/server/queries/projects.ts` (`import 'server-only'` + `'use cache'` + `cacheLife('hours')` + `cacheTag('projects')`).

- [ ] **Step 2.1 : Créer le fichier**

```typescript
// src/server/queries/about.ts
import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { Tag } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export async function countMissionsDelivered(): Promise<number> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  return prisma.project.count({
    where: {
      status: 'PUBLISHED',
      type: 'CLIENT',
      endedAt: { not: null },
    },
  })
}

export async function countClientsServed(): Promise<number> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  return prisma.company.count({
    where: {
      slug: { not: 'personnel' },
      clientMetas: {
        some: {
          project: { status: 'PUBLISHED', type: 'CLIENT' },
        },
      },
    },
  })
}

export async function findPublishedTags(): Promise<Tag[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  return prisma.tag.findMany({
    where: {
      projects: {
        some: {
          project: { status: 'PUBLISHED' },
        },
      },
    },
    orderBy: [{ kind: 'asc' }, { slug: 'asc' }],
  })
}
```

Notes :
- `import 'server-only'` = garde-fou build-time : si un Client Component importe ce module, build fail (voir `.claude/rules/nextjs/data-fetching.md`).
- `type: 'CLIENT'` remplace la formulation `companySlug != 'personnel'` du spec (même résultat, plus propre, pas de magic string — projets perso pointent aussi sur `personnel` via `clientMeta`, donc le filtre par `type` est plus direct).
- `findPublishedTags` ne filtre pas par `type: 'CLIENT'` volontairement : la stack affichée couvre **tout ce qui est dans des projets visibles**, perso inclus (ex: techno utilisée dans un projet perso = compétence affichable).
- Pas besoin de `await connection()` (les queries sont dans un scope `'use cache'` qui absorbe le `new Date()` Prisma, cf. `.claude/rules/nextjs/data-fetching.md`).

- [ ] **Step 2.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur sur `src/server/queries/about.ts`. Si l'import `@/generated/prisma/client` n'expose pas `Tag`, ajuster en `import type { Prisma } from '@/generated/prisma/client'` et utiliser `Prisma.TagGetPayload<{}>`.

---

## Task 3 : Constantes `tag-kind-order.ts`

**Files:**
- Create: `src/components/features/about/tag-kind-order.ts`

Constante d'ordre d'affichage (AI en premier pour refléter le positionnement services) + helper pur pour les années d'XP.

- [ ] **Step 3.1 : Créer le fichier**

```typescript
// src/components/features/about/tag-kind-order.ts
import type { TagKind } from '@/generated/prisma/client'

export const KIND_ORDER: readonly TagKind[] = [
  'AI',
  'EXPERTISE',
  'LANGUAGE',
  'FRAMEWORK',
  'DATABASE',
  'INFRA',
]

export const START_YEAR = 2020

export function getYearsOfExperience(startYear: number = START_YEAR): number {
  return new Date().getFullYear() - startYear
}
```

Notes :
- `START_YEAR = 2020` acte la décision du brainstorming (alternance Cloudsmart comptée comme XP).
- Helper `getYearsOfExperience` pur, testable trivialement mais hors scope no-lib-test.

- [ ] **Step 3.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 4 : Composant `AboutHero` (Server)

**Files:**
- Create: `src/components/features/about/AboutHero.tsx`

Server Component async, compose portrait `next/image` + H1/tagline traduits + `DownloadCvButton` réutilisé.

- [ ] **Step 4.1 : Créer le composant**

```typescript
// src/components/features/about/AboutHero.tsx
import Image from 'next/image'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'
import { buildAssetUrl } from '@/lib/assets'
import { cn } from '@/lib/utils'

type Props = {
  locale: Locale
  className?: string
}

export async function AboutHero({ locale, className }: Props) {
  const t = await getTranslations('AboutPage.hero')

  return (
    <section
      className={cn(
        'grid gap-10 lg:grid-cols-2 lg:items-center',
        className,
      )}
    >
      <div className="order-1 mx-auto w-full max-w-sm lg:order-2 lg:max-w-md">
        <Image
          src={buildAssetUrl('branding/portrait.webp')}
          alt={t('portraitAlt')}
          width={480}
          height={480}
          preload
          sizes="(max-width: 1024px) 80vw, 480px"
          className="aspect-square w-full rounded-xl object-cover"
        />
      </div>

      <div className="order-2 flex flex-col items-start gap-6 text-left lg:order-1">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {t('headline')}
        </h1>
        <p className="text-lg text-muted-foreground">{t('tagline')}</p>
        <DownloadCvButton locale={locale} />
      </div>
    </section>
  )
}
```

Notes :
- `preload` (renommé depuis `priority` en Next 16) = image LCP above-the-fold, voir `.claude/rules/nextjs/images-fonts.md`.
- `buildAssetUrl('branding/portrait.webp')` génère `/api/assets/branding/portrait.webp`.
- Sur mobile (`order-1`/`order-2`) : portrait d'abord, headline dessous. Sur desktop : headline à gauche, portrait à droite (plus naturel en lecture FR).

- [ ] **Step 4.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 5 : Composant `NumberTickerStats` (Client)

**Files:**
- Create: `src/components/features/about/NumberTickerStats.tsx`

Client Component (`'use client'` obligatoire selon `.claude/rules/magic-ui/components.md`), wrap minimal de `NumberTicker` + layout grid 3 colonnes.

- [ ] **Step 5.1 : Créer le composant**

```typescript
// src/components/features/about/NumberTickerStats.tsx
'use client'

import { NumberTicker } from '@/components/magicui/number-ticker'
import { cn } from '@/lib/utils'

export type Stat = {
  slug: string
  value: number
  label: string
  suffix?: string
}

type Props = {
  stats: Stat[]
  className?: string
}

export function NumberTickerStats({ stats, className }: Props) {
  return (
    <div
      className={cn(
        'grid gap-10 sm:grid-cols-3',
        className,
      )}
    >
      {stats.map((stat) => (
        <div
          key={stat.slug}
          className="flex flex-col items-center gap-2 text-center"
        >
          <div className="font-display text-5xl font-bold text-primary sm:text-6xl">
            <NumberTicker value={stat.value} />
            {stat.suffix ? <span>{stat.suffix}</span> : null}
          </div>
          <div className="text-base text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
```

Notes :
- Si le NumberTicker généré par le CLI expose une API différente (ex: `endValue` au lieu de `value`), ajuster à Step 5.1 après avoir inspecté Task 1 Step 1.2.
- `suffix` optionnel : peut afficher `+` si on veut ("6 ans" vs "6+ ans"). Décision par stat au niveau page (Task 7).

- [ ] **Step 5.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur. Si `NumberTicker` props mismatch → corriger les appels.

---

## Task 6 : Composant `TechStackBadges` (Client, pattern TagBadge)

**Files:**
- Create: `src/components/features/about/TechStackBadges.tsx`

Client Component pour cohérence avec `TagBadge` existant (résolution Simple Icons / Lucide via lookup d'export). Reçoit les tags bruts + la locale + les labels traduits des catégories. Groupe par `kind`, itère sur `KIND_ORDER`.

- [ ] **Step 6.1 : Créer le composant**

```typescript
// src/components/features/about/TechStackBadges.tsx
'use client'

/* eslint-disable react-hooks/static-components -- lookup par clé dans registries immuables Simple Icons / Lucide, pas de création de composant runtime */

import * as SimpleIcons from '@icons-pack/react-simple-icons'
import * as LucideIcons from 'lucide-react'
import type { Locale } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Tag, TagKind } from '@/generated/prisma/client'

import { KIND_ORDER } from './tag-kind-order'

type IconComponent = React.ComponentType<{ size?: number; className?: string }>

type Props = {
  tags: Tag[]
  locale: Locale
  kindLabels: Record<TagKind, string>
  className?: string
}

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

function resolveIcon(icon: string | null): IconComponent | null {
  if (!icon) return null
  const colonIdx = icon.indexOf(':')
  if (colonIdx === -1) return null
  const lib = icon.slice(0, colonIdx)
  const slug = icon.slice(colonIdx + 1)
  if (!slug) return null
  if (lib === 'simple-icons') {
    const name = `Si${toPascalCase(slug)}`
    const maybe = (SimpleIcons as unknown as Record<string, unknown>)[name]
    return isComponentLike(maybe) ? maybe : null
  }
  if (lib === 'lucide') {
    const maybe = (LucideIcons as unknown as Record<string, unknown>)[toPascalCase(slug)]
    return isComponentLike(maybe) ? maybe : null
  }
  return null
}

export function TechStackBadges({ tags, locale, kindLabels, className }: Props) {
  const byKind = new Map<TagKind, Tag[]>()
  for (const tag of tags) {
    const bucket = byKind.get(tag.kind) ?? []
    bucket.push(tag)
    byKind.set(tag.kind, bucket)
  }

  return (
    <div className={cn('flex flex-col gap-8', className)}>
      {KIND_ORDER.map((kind) => {
        const group = byKind.get(kind)
        if (!group || group.length === 0) return null
        return (
          <div key={kind} className="flex flex-col gap-3">
            <h3 className="text-2xl font-semibold">{kindLabels[kind]}</h3>
            <div className="flex flex-wrap gap-2">
              {group.map((tag) => {
                const Icon = resolveIcon(tag.icon)
                const name = locale === 'fr' ? tag.nameFr : tag.nameEn
                return (
                  <Badge key={tag.slug} variant="outline" className="gap-1.5 rounded-sm">
                    {Icon ? <Icon size={14} className="shrink-0" /> : null}
                    <span>{name}</span>
                  </Badge>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

Notes :
- Même stratégie de résolution d'icône que `TagBadge` (`src/components/features/projects/TagBadge.tsx`) pour rester cohérent — sans réimporter directement (couplage inutile inter-features).
- Typage `Tag[]` depuis Prisma generated client.
- Rend `null` pour une catégorie vide → pas de `<h3>` orphelin.

- [ ] **Step 6.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 7 : Page `/a-propos` (orchestration)

**Files:**
- Modify: `src/app/[locale]/(public)/a-propos/page.tsx`

La page Server Component compose les 4 sections, avec 2 `<Suspense>` autour des zones async (stats + stack) pour streamer le shell hero + bio immédiatement.

- [ ] **Step 7.1 : Remplacer intégralement le contenu du fichier**

```typescript
// src/app/[locale]/(public)/a-propos/page.tsx
import type { Metadata } from 'next'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { AboutHero } from '@/components/features/about/AboutHero'
import { NumberTickerStats } from '@/components/features/about/NumberTickerStats'
import { TechStackBadges } from '@/components/features/about/TechStackBadges'
import {
  getYearsOfExperience,
  START_YEAR,
} from '@/components/features/about/tag-kind-order'
import { setupLocalePage } from '@/i18n/locale-guard'
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
} from '@/lib/seo'
import {
  countClientsServed,
  countMissionsDelivered,
  findPublishedTags,
} from '@/server/queries/about'
import type { TagKind } from '@/generated/prisma/client'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/a-propos'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)

  return {
    title: t('aboutTitle'),
    description: t('aboutDescription'),
    openGraph: { locale: localeToOgLocale[locale] },
    alternates: { languages: buildLanguageAlternates('/a-propos') },
  }
}

export default async function AProposPage({
  params,
}: PageProps<'/[locale]/a-propos'>) {
  const { locale } = await setupLocalePage(params)
  const t = await getTranslations('AboutPage')

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-20 px-4 py-16 sm:gap-24 sm:px-6 sm:py-20 lg:gap-28 lg:px-8 lg:py-24">
      <AboutHero locale={locale} />

      <section className="flex flex-col gap-4">
        <p className="text-base leading-relaxed">{t('bio.intro')}</p>
        <p className="text-base leading-relaxed">{t('bio.positioning')}</p>
        <p className="text-base leading-relaxed">{t('bio.approach')}</p>
      </section>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsAsync locale={locale} />
      </Suspense>

      <section className="flex flex-col gap-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('stack.title')}
        </h2>
        <Suspense fallback={<StackSkeleton />}>
          <StackAsync locale={locale} />
        </Suspense>
      </section>
    </main>
  )
}

async function StatsAsync({ locale }: { locale: Locale }) {
  const t = await getTranslations('AboutPage.stats')
  const [missions, clients] = await Promise.all([
    countMissionsDelivered(),
    countClientsServed(),
  ])
  const stats = [
    { slug: 'years', value: getYearsOfExperience(START_YEAR), label: t('years.label'), suffix: '+' },
    { slug: 'missions', value: missions, label: t('missions.label'), suffix: '+' },
    { slug: 'clients', value: clients, label: t('clients.label'), suffix: '+' },
  ]
  return <NumberTickerStats stats={stats} />
}

function StatsSkeleton() {
  return (
    <div className="grid gap-10 sm:grid-cols-3" aria-hidden>
      {['s1', 's2', 's3'].map((k) => (
        <div key={k} className="flex flex-col items-center gap-2 text-center">
          <div className="h-14 w-20 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

async function StackAsync({ locale }: { locale: Locale }) {
  const [tags, t] = await Promise.all([
    findPublishedTags(),
    getTranslations('AboutPage.stack.kindLabels'),
  ])
  const kindLabels: Record<TagKind, string> = {
    AI: t('AI'),
    EXPERTISE: t('EXPERTISE'),
    LANGUAGE: t('LANGUAGE'),
    FRAMEWORK: t('FRAMEWORK'),
    DATABASE: t('DATABASE'),
    INFRA: t('INFRA'),
  }
  return <TechStackBadges tags={tags} locale={locale} kindLabels={kindLabels} />
}

function StackSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden>
      {['g1', 'g2', 'g3'].map((k) => (
        <div key={k} className="flex flex-col gap-3">
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="flex flex-wrap gap-2">
            {['b1', 'b2', 'b3', 'b4'].map((b) => (
              <div key={b} className="h-6 w-20 rounded bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

Notes :
- 2 Suspense indépendants → stats et stack streament en parallèle sans bloquer le shell hero+bio.
- `Promise.all` dans `StatsAsync` parallélise les 2 counts Prisma (évite waterfall, cf. `.claude/rules/nextjs/data-fetching.md`).
- Les skeletons sont triviaux, layout identique au rendu final pour éviter le CLS.
- `kindLabels` construit via `getTranslations('AboutPage.stack.kindLabels')` puis mappage explicite vers le `Record<TagKind, string>` — safer qu'un cast.

- [ ] **Step 7.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur sur la page ni les imports.

---

## Task 8 : Étoffer `messages/fr.json` et `messages/en.json`

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

Remplacer le bloc actuel `"AboutPage": { "title": "À propos", "placeholder": "Contenu à venir." }` par la structure complète `hero / bio / stats / stack`. Parité FR/EN stricte.

- [ ] **Step 8.1 : Mettre à jour `messages/fr.json` (namespace `AboutPage`)**

Remplacer le bloc `AboutPage` par :

```json
  "AboutPage": {
    "title": "À propos",
    "hero": {
      "headline": "Thibaud Geisler — IA & Développement Full-Stack",
      "tagline": "Je conçois des produits IA et des applications web sur mesure, en équipe réduite ou en solo, avec une approche business-solution.",
      "portraitAlt": "Portrait de Thibaud Geisler"
    },
    "bio": {
      "intro": "Développeur full-stack spécialisé IA et automatisation, je travaille en freelance et j'interviens auprès d'entreprises (de la TPE au groupe) pour livrer des produits concrets, mesurables et maintenables.",
      "positioning": "Mon positionnement : l'IA au service d'un cas d'usage business précis, pas un gadget. Je combine LLM, automatisations et développement full-stack pour livrer la solution la plus simple qui résout le problème.",
      "approach": "Mon approche : cadrer le besoin réel avec vous, prototyper vite, itérer sur des livrables concrets, documenter pour la maintenance. Je préfère livrer petit et souvent plutôt que promettre gros et livrer tard."
    },
    "stats": {
      "years": { "label": "années d'expérience" },
      "missions": { "label": "missions clients livrées" },
      "clients": { "label": "clients servis" }
    },
    "stack": {
      "title": "Stack technique",
      "kindLabels": {
        "AI": "IA & Machine Learning",
        "EXPERTISE": "Expertises",
        "LANGUAGE": "Langages",
        "FRAMEWORK": "Frameworks",
        "DATABASE": "Bases de données",
        "INFRA": "Infrastructure"
      }
    }
  },
```

(Attention à la virgule de clôture vers le namespace suivant `ContactPage`.)

- [ ] **Step 8.2 : Mettre à jour `messages/en.json` (namespace `AboutPage`)**

Remplacer le bloc `AboutPage` par :

```json
  "AboutPage": {
    "title": "About",
    "hero": {
      "headline": "Thibaud Geisler — AI & Full-Stack Development",
      "tagline": "I design AI products and custom web apps, in small teams or solo, with a business-solution mindset.",
      "portraitAlt": "Portrait of Thibaud Geisler"
    },
    "bio": {
      "intro": "Full-stack developer specialized in AI and automation. I work as a freelancer with companies from small businesses to large groups, delivering concrete, measurable and maintainable products.",
      "positioning": "My positioning: AI in service of a precise business use case, not a gimmick. I combine LLMs, automations and full-stack development to deliver the simplest solution that actually solves the problem.",
      "approach": "My approach: scope the real need with you, prototype fast, iterate on concrete deliverables, document for maintenance. I'd rather ship small and often than promise big and deliver late."
    },
    "stats": {
      "years": { "label": "years of experience" },
      "missions": { "label": "client missions delivered" },
      "clients": { "label": "clients served" }
    },
    "stack": {
      "title": "Tech stack",
      "kindLabels": {
        "AI": "AI & Machine Learning",
        "EXPERTISE": "Expertise",
        "LANGUAGE": "Languages",
        "FRAMEWORK": "Frameworks",
        "DATABASE": "Databases",
        "INFRA": "Infrastructure"
      }
    }
  },
```

- [ ] **Step 8.3 : Vérifier la validité JSON des deux fichiers**

Commande : `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('OK')"`
Attendu : `OK` sur stdout.

---

## Task 9 : Ops — Upload du portrait dans le volume assets

**Files:**
- External (Docker volume) : `assets/branding/portrait.webp`

Cet asset n'est **pas versionné dans le repo** (convention ADR-011 : assets dynamiques via `/api/assets/[...path]`, stockés dans le volume Docker). Il doit être déposé manuellement dans le volume pour que `/api/assets/branding/portrait.webp` réponde 200.

- [ ] **Step 9.1 : Préparer le fichier `portrait.webp`**

1. Prendre une photo portrait propre (carré, 800×800 px minimum recommandé).
2. Convertir en WebP (qualité 80-85, cible < 150 KB) via outil au choix (ex: `cwebp -q 85 portrait.jpg -o portrait.webp`).
3. Vérifier visuellement : cadrage, netteté, fond propre.

- [ ] **Step 9.2 : Déposer dans le volume Docker**

Commande (environnement local, adaptable selon la conf du projet, cf. `docker-compose.yml` + `Justfile`) :

```bash
# Exemple : le volume est monté sur ./assets au niveau du repo
mkdir -p ./assets/branding
cp chemin/vers/portrait.webp ./assets/branding/portrait.webp
```

Attendu : le fichier est accessible via `http://localhost:3000/api/assets/branding/portrait.webp` (200) après redémarrage du conteneur Next si besoin.

- [ ] **Step 9.3 : Déposer le même fichier en prod (Dokploy)**

Scp ou upload via l'interface Dokploy dans le volume monté. Noter dans le PR body que cette étape ops est requise avant le merge sur `main` (sinon la prod affichera une image cassée après déploiement).

---

## Task 10 : Verification finale (lint + typecheck + build + smoke FR/EN)

La DB doit être up et seedée pour que les queries renvoient des valeurs non triviales. `tdd_scope: none` → aucune assertion automatisée, uniquement les gates qualité + inspection navigateur.

- [ ] **Step 10.1 : Préparer l'environnement**

Commandes (si pas déjà fait) :

```bash
just docker-up
just db-seed
```

Attendu : PostgreSQL up, tables `Project`, `Company`, `Tag`, `ProjectTag`, `ClientMeta` peuplées.

- [ ] **Step 10.2 : Lint**

Commande : `just lint`
Attendu : 0 error. Warnings tolérés uniquement s'ils sont préexistants (ne pas introduire de nouveau warning dans les fichiers créés/modifiés).

- [ ] **Step 10.3 : Typecheck**

Commande : `just typecheck`
Attendu : 0 erreur.

- [ ] **Step 10.4 : Build**

Commande : `just build`
Attendu : build Next.js OK, route `/[locale]/a-propos` listée (`○ Static` ou `ƒ Dynamic` acceptable — en présence de 2 Suspense + queries dynamiques cached, probablement un mix statique/streamé).

- [ ] **Step 10.5 : Smoke test FR**

1. `just dev` (serveur sur `http://localhost:3000`).
2. Ouvrir `http://localhost:3000/a-propos`.
3. Vérifier :
   - Hero : portrait visible, H1 en `font-display`, tagline en `text-muted-foreground`, bouton CV pleine largeur.
   - Bio : 3 paragraphes affichés.
   - Stats : 3 compteurs animés (`NumberTicker`). Valeurs cohérentes : années XP = 6 (en 2026), missions ≥ 3 (4 projets clients CLIENT+endedAt≠null dans le seed : Webapp Gestion Sinistres, SaaS Paie, ERP Odoo, + éventuels autres), clients ≥ 3 (Foyer, Paysystem, Cloudsmart). Le chiffre exact dépend du seed actuel.
   - Stack : sections dans l'ordre `AI → EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → INFRA`, badges avec icônes Simple Icons/Lucide lorsque `tag.icon` est défini.
4. Vérifier le `<head>` DevTools : `<title>` = `À propos | ...`, `<meta name="description">` = `Metadata.aboutDescription`, `<meta property="og:locale" content="fr_FR">`, `<link rel="alternate" hreflang="fr|en|x-default" ...>`.
5. Redimensionner : mobile (portrait au-dessus, bio single col, stats single col), desktop `lg:` (portrait à droite, stats 3 cols).

Attendu : tout OK, aucune erreur dans la console, aucun hydration mismatch.

- [ ] **Step 10.6 : Smoke test EN**

1. Ouvrir `http://localhost:3000/en/a-propos`.
2. Vérifier traductions : hero (`AI & Full-Stack Development`), bio EN, stats labels EN (`years of experience`...), stack kind labels EN.
3. Badges stack : `tag.nameEn` affiché.
4. `<head>` : `<meta property="og:locale" content="en_US">`.

Attendu : contenu intégralement traduit, valeurs numériques identiques.

- [ ] **Step 10.7 : Vérifier le cache Data Cache en dev**

Activer `logging: { fetches: { fullUrl: true } }` dans `next.config.ts` **si pas déjà actif** (optionnel, déjà recommandé par `.claude/rules/nextjs/rendering-caching.md`). Recharger `/a-propos` deux fois, voir les logs : second chargement devrait afficher HIT sur les queries cachées.

- [ ] **Step 10.8 : Arrêter le serveur dev**

Commande : `just stop`
Attendu : port 3000 libéré.

- [ ] **Step 10.9 : Proposer le commit au user (discipline CLAUDE.md)**

Ne PAS commit automatiquement. Demander au user :

> "Verification complète OK (lint + typecheck + build + smoke FR/EN + cache dev). Je peux committer ce sub-project ? Message suggéré : `feat(about): page /a-propos avec hero, bio, stats DB et stack dérivée`."

Attendre la validation explicite avant `git add` / `git commit`.

---

## Status du spec

La mise à jour du `status` du spec de `draft` vers `implemented` (frontmatter de [`02-page-a-propos-design.md`](../../specs/pages-publiques-portfolio/02-page-a-propos-design.md)) **n'est pas réalisée dans ce plan**. Elle est déléguée au workflow parent `/implement-subproject` (gates `/simplify` + `code/code-reviewer` + mise à jour status après approbation finale).

---

## Self-review

**Spec coverage** (chaque élément du spec mappé à une task) :
- Scénario 1 (rendu FR complet) → Tasks 4, 5, 6, 7, 8 + smoke 10.5.
- Scénario 2 (rendu EN) → Task 8.2 + smoke 10.6.
- Scénario 3 (XP auto) → Task 3 (`getYearsOfExperience` + `START_YEAR = 2020`) + Task 7 (appel dans `StatsAsync`).
- Scénario 4 (missions/clients dérivés DB) → Task 2 (`countMissionsDelivered`, `countClientsServed`) + Task 7.
- Scénario 5 (stack dérivée DB) → Task 2 (`findPublishedTags`) + Task 6 + Task 7.
- Scénario 6 (metadata SEO localisée) → Task 7 (`generateMetadata`) + smoke 10.5/10.6.
- Scénario 7 (responsive) → Task 4 (hero `lg:grid-cols-2` + `order-*`), Task 5 (`sm:grid-cols-3`), Task 6 (`flex flex-wrap`) + smoke 10.5.
- Scénario 8 (Data Cache) → Task 2 (`'use cache'` + `cacheTag('projects')`) + smoke 10.7.
- Edge case "portrait introuvable" → Task 9 (upload ops documenté).
- Edge case "DB sans projet publié" → Task 10.1 (seed obligatoire avant smoke).
- Edge case "`tag.icon = null`" → Task 6 (branch `Icon ? <Icon/> : null`).
- Edge case "calendar year rollover" → Task 3 (`new Date().getFullYear()` intrinsèque).
- Architectural decision A (silo `/api/assets/branding/`) → Task 4 + Task 9.
- Architectural decision B (DB vs i18n pour stats/stack) → Task 2 + Task 7.
- Architectural decision C (XP calcul auto) → Task 3 + Task 7.

**Placeholder scan** : aucun `TBD` / `TODO` / `à définir` / `implement later`. Tous les snippets code sont complets. Seule la note sur l'API exacte de `NumberTicker` (Task 5 Step 5.1) invite à ajuster après Task 1 Step 1.2 — c'est légitime car la shape dépend du registry téléchargé, pas d'un manque de rigueur du plan.

**Type consistency** :
- `Stat` (Task 5) ↔ `stats: Stat[]` (Task 7) : cohérent (`slug, value, label, suffix?`).
- `TagKind` (Prisma) ↔ `KIND_ORDER: readonly TagKind[]` (Task 3) ↔ `kindLabels: Record<TagKind, string>` (Task 6, Task 7) : cohérent.
- `Tag` (Prisma) ↔ `tags: Tag[]` (Task 2 return, Task 6 props, Task 7 consumer) : cohérent.
- `getYearsOfExperience(startYear: number = START_YEAR): number` (Task 3) ↔ appel `getYearsOfExperience(START_YEAR)` (Task 7) : signatures alignées.

Aucune divergence détectée.

---

## Execution Handoff

Plan sauvegardé dans [`docs/superpowers/plans/pages-publiques-portfolio/02-page-a-propos.md`](./02-page-a-propos.md).

Deux options d'exécution lorsqu'on passera à l'implémentation :

1. **Subagent-Driven (recommandé)** — `superpowers:subagent-driven-development` dispatch un subagent frais par task, review entre tasks. Aligne avec la commande projet `/implement-subproject` qui intègre `/simplify` et `code/code-reviewer` comme gates de sortie.
2. **Inline Execution** — `superpowers:executing-plans`, batch avec checkpoints dans la session courante.

Pas d'exécution dans le cadre de `/decompose-feature` : la phase d'implémentation est déclenchée ultérieurement par `/implement-subproject pages-publiques-portfolio 02`.
