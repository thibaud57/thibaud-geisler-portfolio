# Plan d'implémentation — `03-page-accueil`

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le placeholder de `src/app/[locale]/(public)/page.tsx` par la home complète : Hero interactif (Background Ripple Effect Aceternity + H1 + tagline + ShimmerButton + outline Button), teaser Services (3 ServiceCard sub 01 + "Voir tous les services"), teaser Projets (3 ProjectCard Feature 2 + "Voir tous les projets"), section CTA finale ("Parlons de votre projet").

**Architecture:** Server page qui compose 4 sections + `<Suspense>` autour du teaser projets async. Le Hero est un îlot Client (pattern Aceternity `'use client'` obligatoire). Aucune nouvelle query DB : réutilisation de `findManyPublished` (Feature 2) + `.slice(0, 3)`. Aucun nouveau composant service/projet : réutilisation stricte du sub 01 et Feature 2.

**Tech Stack:** Next.js 16 App Router + PPR, React 19, TypeScript 6 strict, Prisma 7, next-intl 4.9.1, shadcn/ui, Magic UI (ShimmerButton à installer si absent), Aceternity UI (Background Ripple Effect à installer), Motion 12 (déjà présent).

**Spec de référence:** [`docs/superpowers/specs/pages-publiques-portfolio/03-page-accueil-design.md`](../../specs/pages-publiques-portfolio/03-page-accueil-design.md).

**Rappels projet:**
- `tdd_scope: none` → pas de tests à écrire (no-lib-test : plumbing UI + réutilisation pure, pas de règle métier projet testable).
- Discipline commit CLAUDE.md : **aucun commit intermédiaire**. Proposer au user un commit unique après Task 11 verte.
- **Dépendance ordre topologique** : le sub 01 (`page-services`) doit être implémenté avant ce sub 03 pour que `ServiceCard` + `SERVICE_SLUGS` + clés i18n `ServicesPage.offers.*` existent. Si ce plan est exécuté avant sub 01, Task 5 échoue à l'import.
- **DB seedée** obligatoire pour le smoke test (`just docker-up` + `just db-seed`), sinon le teaser projets sera vide.

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `src/components/aceternity/background-ripple-effect.tsx` | Composant Aceternity (généré CLI) | Créer via CLI |
| `src/components/magicui/shimmer-button.tsx` | Composant Magic UI (généré CLI, conditionnel si absent) | Créer via CLI si absent |
| `docs/DESIGN.md` | Addendum § Stack UI + § Mapping Composants pour Background Ripple Effect | Modifier |
| `src/components/features/home/Hero.tsx` | Client Component, fond Ripple + contenu hero + 2 CTAs | Créer |
| `src/components/features/home/ServicesTeaserSection.tsx` | Server, itère SERVICE_SLUGS → 3 ServiceCard + CTA ghost | Créer |
| `src/components/features/home/ProjectsTeaserSkeleton.tsx` | Server, 3 placeholders grid identique au rendu | Créer |
| `src/components/features/home/ProjectsTeaserSection.tsx` | Server async, findManyPublished().slice(0,3) + 3 ProjectCard + CTA ghost | Créer |
| `src/components/features/home/FinalCtaSection.tsx` | Server, H2 + phrase + Button default | Créer |
| `src/app/[locale]/(public)/page.tsx` | Orchestration 4 sections + Suspense teaser projets | Modifier |
| `messages/fr.json` | Étoffer `HomePage` | Modifier |
| `messages/en.json` | Parité stricte EN | Modifier |

---

## Task 1 : Installer Background Ripple Effect (Aceternity)

**Files:**
- Create (via CLI) : `src/components/aceternity/background-ripple-effect.tsx`

Conforme à `.claude/rules/aceternity-ui/components.md` : syntaxe namespace `@aceternity/<component>`, flag `-p src/components/aceternity` pour cibler le dossier projet (défaut Aceternity = `ui/`, customisé).

- [ ] **Step 1.1 : Lancer l'installation CLI**

Commande : `pnpm dlx shadcn@latest add @aceternity/background-ripple-effect -p src/components/aceternity`

Attendu :
- Création de `src/components/aceternity/background-ripple-effect.tsx`
- Installation/validation de `motion` (déjà présent en `^12`, devrait être no-op)
- Prompt "overwrite ?" si conflit → répondre `y`

**Si TUI interactif bloque** : demander au user de l'exécuter dans son terminal, attendre confirmation, puis Step 1.2.

- [ ] **Step 1.2 : Vérifier le composant installé**

Commande : `ls src/components/aceternity/ && head -40 src/components/aceternity/background-ripple-effect.tsx`

Attendu : le fichier existe, signature `export function BackgroundRippleEffect({ rows?, cols?, cellSize?, borderColor?, fillColor?, interactive?, className?, ... })` ou équivalent. Noter les props exactes exposées (pour adapter Task 4 si mismatch).

- [ ] **Step 1.3 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur sur le fichier généré.

---

## Task 2 : Installer ShimmerButton si absent (Magic UI)

**Files:**
- Create (via CLI) si absent : `src/components/magicui/shimmer-button.tsx`

- [ ] **Step 2.1 : Vérifier si ShimmerButton existe déjà**

Commande : `ls src/components/magicui/shimmer-button.tsx 2>/dev/null && echo "EXISTS" || echo "MISSING"`

Si `EXISTS` → Step 2.3. Si `MISSING` → Step 2.2.

- [ ] **Step 2.2 : Installer ShimmerButton (si MISSING)**

Commande : `pnpm dlx shadcn@latest add @magicui/shimmer-button`

Attendu : `src/components/magicui/shimmer-button.tsx` créé, signature `export function ShimmerButton({ shimmerColor?, shimmerSize?, borderRadius?, shimmerDuration?, background?, className?, children?, ...props })`.

**Si TUI bloque** : fallback user, même procédure que Task 1.

- [ ] **Step 2.3 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 3 : Addendum DESIGN.md — Background Ripple Effect

**Files:**
- Modify: `docs/DESIGN.md`

Ajouter `Background Ripple Effect` dans 2 endroits : la ligne "Hero effects" du tableau § Mapping Composants, et la description Aceternity dans § Stack UI.

- [ ] **Step 3.1 : Modifier la ligne "Hero effects" du § Mapping Composants**

Trouver la ligne actuelle :

```markdown
| Hero effects | MacbookScroll, Spotlight, Hero Parallax, Aurora Background, Background Beams | Aceternity UI | Effets hero premium, sections clés uniquement (MacbookScroll = showcase projet dev principal) |
```

Remplacer par :

```markdown
| Hero effects | MacbookScroll, Spotlight, Hero Parallax, Aurora Background, Background Beams, Background Ripple Effect | Aceternity UI | Effets hero premium, sections clés uniquement (MacbookScroll = showcase projet dev principal, Background Ripple Effect = fond interactif hero/CTA) |
```

- [ ] **Step 3.2 : Modifier la ligne Aceternity UI du § Stack UI**

Trouver la ligne actuelle :

```markdown
| Aceternity UI | Effets visuels copy-paste | Effets hero premium : MacbookScroll, Spotlight, Hero Parallax, Aurora Background, Background Beams |
```

Remplacer par :

```markdown
| Aceternity UI | Effets visuels copy-paste | Effets hero premium : MacbookScroll, Spotlight, Hero Parallax, Aurora Background, Background Beams, Background Ripple Effect |
```

- [ ] **Step 3.3 : Modifier la ligne "Aceternity UI" du § Librairies du chapitre Animations (si présente)**

Si le tableau Animations (`Librairie | Rôle | ...`) contient une ligne "Aceternity UI" énumérant les hero effects, ajouter `Background Ripple Effect` de la même manière. Sinon, skipper cet step.

Commande vérif : `grep -n "Aceternity UI" docs/DESIGN.md`
Agir en cohérence sur toutes les occurrences trouvées qui énumèrent explicitement les hero effects.

---

## Task 4 : Composant `Hero` (Client, îlot Aceternity + ShimmerButton)

**Files:**
- Create: `src/components/features/home/Hero.tsx`

Client Component `'use client'` car Aceternity Ripple + Magic UI ShimmerButton utilisent hooks/events. Reçoit tous ses textes en props depuis la page Server pour rester sérialisable (règle `.claude/rules/nextjs/server-client-components.md`).

- [ ] **Step 4.1 : Créer le composant**

```typescript
// src/components/features/home/Hero.tsx
'use client'

import { BackgroundRippleEffect } from '@/components/aceternity/background-ripple-effect'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

type Props = {
  h1: string
  tagline: string
  ctaPrimaryLabel: string
  ctaSecondaryLabel: string
  className?: string
}

export function Hero({
  h1,
  tagline,
  ctaPrimaryLabel,
  ctaSecondaryLabel,
  className,
}: Props) {
  return (
    <section
      className={cn(
        'relative isolate flex min-h-[70vh] w-full items-center justify-center overflow-hidden',
        className,
      )}
    >
      <BackgroundRippleEffect />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {h1}
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{tagline}</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <ShimmerButton className="inline-flex items-center justify-center">
            <Link href="/contact" className="px-6 py-2 text-base font-medium">
              {ctaPrimaryLabel}
            </Link>
          </ShimmerButton>
          <Button asChild variant="outline" size="lg">
            <Link href="/services">{ctaSecondaryLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
```

Notes :
- `relative isolate overflow-hidden` : contient le Ripple Effect au périmètre du Hero, évite la fuite hors viewport.
- `z-10` sur le contenu, Ripple en fond z-0 par défaut.
- `Link` de `@/i18n/navigation` préserve le prefix locale (`/fr/contact`, `/en/contact`).
- `ShimmerButton asChild` n'est pas supporté par tous les wrappers Magic UI → pattern ici = `<ShimmerButton><Link>...</Link></ShimmerButton>` (Link à l'intérieur). Vérifier l'API exacte après Task 2.2 et ajuster si nécessaire (ex: certains ShimmerButton acceptent `onClick` et on utilise `useRouter().push('/contact')`).
- Si après Task 2 le ShimmerButton ne peut pas wrapper un Link, fallback : utiliser `useRouter().push('/contact')` dans un `onClick`.

- [ ] **Step 4.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur. Si l'API ShimmerButton mismatch → ajuster le pattern (asChild / onClick / wrap).

---

## Task 5 : Composant `ServicesTeaserSection` (Server, réutilise sub 01)

**Files:**
- Create: `src/components/features/home/ServicesTeaserSection.tsx`

Server Component. Itère `SERVICE_SLUGS` du sub 01, rend 3 `ServiceCard` avec les clés i18n `ServicesPage.offers.<slug>.*` (réutilisation pure). Termine par un Button `ghost` vers `/services`.

**Prérequis d'ordre topologique** : le sub 01 doit être implémenté (fichiers `src/components/features/services/service-slugs.ts`, `ServiceCard.tsx` et clés i18n existantes). Si le sub 03 est implémenté avant sub 01, cette task échoue à l'import.

- [ ] **Step 5.1 : Créer le composant**

```typescript
// src/components/features/home/ServicesTeaserSection.tsx
import { getTranslations } from 'next-intl/server'

import { ServiceCard } from '@/components/features/services/ServiceCard'
import { SERVICE_SLUGS } from '@/components/features/services/service-slugs'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export async function ServicesTeaserSection() {
  const tHome = await getTranslations('HomePage.servicesTeaser')
  const tServices = await getTranslations('ServicesPage.offers')

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {tHome('title')}
        </h2>
        <p className="max-w-2xl text-base text-muted-foreground">
          {tHome('subtitle')}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SERVICE_SLUGS.map((slug) => (
          <ServiceCard
            key={slug}
            slug={slug}
            title={tServices(`${slug}.title`)}
            description={tServices(`${slug}.description`)}
            bullets={tServices.raw(`${slug}.bullets`) as string[]}
            ctaLabel={tServices(`${slug}.ctaLabel`)}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Button asChild variant="ghost" size="lg">
          <Link href="/services">{tHome('seeAll')}</Link>
        </Button>
      </div>
    </section>
  )
}
```

Notes :
- 2 namespaces i18n chargés : `HomePage.servicesTeaser` (title/subtitle/seeAll) et `ServicesPage.offers` (reuse sub 01).
- `ServiceCard` props et comportement strictement identiques au rendu de `/services` (cohérence visuelle).

- [ ] **Step 5.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur. Si `ServiceCard` ou `SERVICE_SLUGS` n'existent pas → sub 01 pas encore implémenté, stopper et implémenter sub 01 d'abord.

---

## Task 6 : Skeleton teaser Projets

**Files:**
- Create: `src/components/features/home/ProjectsTeaserSkeleton.tsx`

Skeleton léger rendu pendant le streaming de la query Prisma. Layout identique au rendu final pour éviter le CLS.

- [ ] **Step 6.1 : Créer le composant**

```typescript
// src/components/features/home/ProjectsTeaserSkeleton.tsx
export function ProjectsTeaserSkeleton() {
  return (
    <div
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      aria-hidden
    >
      {['p1', 'p2', 'p3'].map((k) => (
        <div
          key={k}
          className="flex h-full flex-col overflow-hidden rounded-lg border bg-card"
        >
          <div className="h-56 w-full bg-muted" />
          <div className="flex flex-1 flex-col gap-3 p-6">
            <div className="h-7 w-3/4 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

Notes :
- Hauteur cover `h-56` alignée sur le vrai `ProjectCard` (voir `src/components/features/projects/ProjectCard.tsx` ligne 93).
- `aria-hidden` car le skeleton est purement visuel.

- [ ] **Step 6.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 7 : Composant `ProjectsTeaserSection` (Server async, réutilise Feature 2)

**Files:**
- Create: `src/components/features/home/ProjectsTeaserSection.tsx`

Server Component async. Appelle `findManyPublished({ locale })` (Feature 2, `'use cache' + cacheTag('projects')`), applique `.slice(0, 3)`, rend 3 `ProjectCard`. Termine par un Button `ghost` vers `/projets`.

- [ ] **Step 7.1 : Créer le composant**

```typescript
// src/components/features/home/ProjectsTeaserSection.tsx
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { ProjectCard } from '@/components/features/projects/ProjectCard'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { findManyPublished } from '@/server/queries/projects'

const TEASER_LIMIT = 3

type Props = {
  locale: Locale
}

export async function ProjectsTeaserSection({ locale }: Props) {
  const t = await getTranslations('HomePage.projectsTeaser')
  const projects = await findManyPublished({ locale })
  const featured = projects.slice(0, TEASER_LIMIT)

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {featured.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>

      <div className="flex justify-center">
        <Button asChild variant="ghost" size="lg">
          <Link href="/projets">{t('seeAll')}</Link>
        </Button>
      </div>
    </div>
  )
}
```

Notes :
- `TEASER_LIMIT = 3` constante locale, pas de magic number.
- Pas de `h2` ici : le titre `HomePage.projectsTeaser.title` sera rendu dans la page parent (Task 9) avant le `<Suspense>` pour que le titre reste dans le shell statique et seul le grid streame.

- [ ] **Step 7.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur. Si import de `ProjectCard` échoue → vérifier Feature 2 livrée.

---

## Task 8 : Section CTA finale

**Files:**
- Create: `src/components/features/home/FinalCtaSection.tsx`

Server Component. Block H2 + phrase + Button `default` "Parlons de votre projet" vers `/contact`. Pas de ShimmerButton (règle DESIGN.md max 1 par page → déjà dans le Hero).

- [ ] **Step 8.1 : Créer le composant**

```typescript
// src/components/features/home/FinalCtaSection.tsx
import { getTranslations } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export async function FinalCtaSection() {
  const t = await getTranslations('HomePage.finalCta')

  return (
    <section className="flex flex-col items-center gap-6 rounded-xl border bg-card px-6 py-12 text-center sm:py-16">
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {t('title')}
      </h2>
      <p className="max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>
      <Button asChild size="lg">
        <Link href="/contact">{t('ctaLabel')}</Link>
      </Button>
    </section>
  )
}
```

Notes :
- Fond `bg-card` + `border` pour distinguer visuellement de la section précédente (pattern "card géante").
- Button `default` (variant implicite), taille `lg`.

- [ ] **Step 8.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 9 : Page `/` (orchestration)

**Files:**
- Modify: `src/app/[locale]/(public)/page.tsx`

Server Component. Compose les 4 sections + `<Suspense>` autour du teaser projets. Titre teaser projets rendu au niveau page (hors Suspense) pour que seul le grid streame.

- [ ] **Step 9.1 : Remplacer intégralement le contenu du fichier**

```typescript
// src/app/[locale]/(public)/page.tsx
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { FinalCtaSection } from '@/components/features/home/FinalCtaSection'
import { Hero } from '@/components/features/home/Hero'
import { ProjectsTeaserSection } from '@/components/features/home/ProjectsTeaserSection'
import { ProjectsTeaserSkeleton } from '@/components/features/home/ProjectsTeaserSkeleton'
import { ServicesTeaserSection } from '@/components/features/home/ServicesTeaserSection'
import { setupLocalePage } from '@/i18n/locale-guard'
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
} from '@/lib/seo'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)

  return {
    title: t('homeTitle'),
    description: t('homeDescription'),
    openGraph: { locale: localeToOgLocale[locale] },
    alternates: { languages: buildLanguageAlternates('') },
  }
}

export default async function HomePage({
  params,
}: PageProps<'/[locale]'>) {
  const { locale } = await setupLocalePage(params)
  const tHero = await getTranslations('HomePage.hero')
  const tProjectsTeaser = await getTranslations('HomePage.projectsTeaser')

  return (
    <main className="flex flex-col gap-20 pb-20 sm:gap-24 sm:pb-24 lg:gap-28 lg:pb-28">
      <Hero
        h1={tHero('h1')}
        tagline={tHero('tagline')}
        ctaPrimaryLabel={tHero('ctaPrimary')}
        ctaSecondaryLabel={tHero('ctaSecondary')}
      />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <ServicesTeaserSection />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-8">
          <header className="flex flex-col items-center gap-3 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {tProjectsTeaser('title')}
            </h2>
            <p className="max-w-2xl text-base text-muted-foreground">
              {tProjectsTeaser('subtitle')}
            </p>
          </header>

          <Suspense fallback={<ProjectsTeaserSkeleton />}>
            <ProjectsTeaserSection locale={locale} />
          </Suspense>
        </section>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <FinalCtaSection />
      </div>
    </main>
  )
}
```

Notes :
- Le Hero occupe la pleine largeur (pas de container `max-w-7xl` autour) pour laisser respirer le Ripple Effect.
- Les 3 autres sections sont dans le container standard `max-w-7xl`.
- Titre teaser projets au niveau page, pas dans `ProjectsTeaserSection` : le titre + subtitle s'affichent dans le shell statique, seul le grid async streame via Suspense.
- `buildLanguageAlternates('')` avec path vide pour la racine locale.

- [ ] **Step 9.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur sur `page.tsx` et les composants importés.

---

## Task 10 : Étoffer les messages i18n

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

Remplacer le namespace `HomePage` actuel (`{ title, placeholder }`) par la structure complète nested `hero / servicesTeaser / projectsTeaser / finalCta`.

- [ ] **Step 10.1 : Mettre à jour `messages/fr.json` (namespace `HomePage`)**

Remplacer le bloc `HomePage` par :

```json
  "HomePage": {
    "title": "Accueil",
    "hero": {
      "h1": "Thibaud Geisler - IA & Développement Full-Stack",
      "tagline": "IA, développement d'applications sur mesure et formation : de l'idée à la mise en production.",
      "ctaPrimary": "Parlons de votre projet",
      "ctaSecondary": "Voir les services"
    },
    "servicesTeaser": {
      "title": "Mes services",
      "subtitle": "Trois façons de travailler ensemble, adaptées à votre contexte et votre niveau de maturité.",
      "seeAll": "Voir tous les services"
    },
    "projectsTeaser": {
      "title": "Projets récents",
      "subtitle": "Une sélection de missions et de projets qui illustrent concrètement ma manière de travailler.",
      "seeAll": "Voir tous les projets"
    },
    "finalCta": {
      "title": "Un projet en tête ?",
      "subtitle": "IA, application web, automatisation, formation : décrivez-moi ce que vous voulez construire et voyons comment avancer ensemble.",
      "ctaLabel": "Parlons de votre projet"
    }
  },
```

(Attention à la virgule de clôture vers le namespace suivant.)

- [ ] **Step 10.2 : Mettre à jour `messages/en.json` (namespace `HomePage`)**

Remplacer le bloc `HomePage` par :

```json
  "HomePage": {
    "title": "Home",
    "hero": {
      "h1": "Thibaud Geisler - AI & Full-Stack Development",
      "tagline": "AI, custom application development and training: from idea to production.",
      "ctaPrimary": "Let's talk about your project",
      "ctaSecondary": "See services"
    },
    "servicesTeaser": {
      "title": "My services",
      "subtitle": "Three ways to work together, tailored to your context and your level of maturity.",
      "seeAll": "See all services"
    },
    "projectsTeaser": {
      "title": "Recent projects",
      "subtitle": "A selection of missions and projects that concretely illustrate the way I work.",
      "seeAll": "See all projects"
    },
    "finalCta": {
      "title": "Got a project in mind?",
      "subtitle": "AI, web app, automation, training: tell me what you want to build and let's see how we can move forward together.",
      "ctaLabel": "Let's talk about your project"
    }
  },
```

- [ ] **Step 10.3 : Vérifier la validité JSON des deux fichiers**

Commande : `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('OK')"`
Attendu : `OK`.

---

## Task 11 : Verification finale

La DB doit être up et seedée (seed de Feature 2 projets). `tdd_scope: none` → aucun test automatisé, verification = gates qualité + inspection navigateur.

- [ ] **Step 11.1 : Préparer l'environnement**

Commandes :

```bash
just docker-up
just db-seed
```

Attendu : PostgreSQL up, table `Project` peuplée (≥ 3 projets `status = 'PUBLISHED'` pour que le teaser affiche 3 cards).

- [ ] **Step 11.2 : Lint**

Commande : `just lint`
Attendu : 0 error, warnings uniquement préexistants.

- [ ] **Step 11.3 : Typecheck global**

Commande : `just typecheck`
Attendu : 0 erreur.

- [ ] **Step 11.4 : Build**

Commande : `just build`
Attendu : build Next.js OK, route `/[locale]` listée. Probablement un mix `ƒ Dynamic` (à cause du Suspense + query cached) avec shell statique.

- [ ] **Step 11.5 : Smoke test FR**

1. `just dev` (serveur sur `http://localhost:3000`).
2. Ouvrir `http://localhost:3000/`.
3. Vérifier visuellement :
   - **Hero** : fond Background Ripple Effect visible et cliquable (click sur une cellule déclenche l'ondulation), H1 centré `font-display` `Thibaud Geisler - IA & Développement Full-Stack`, tagline en `text-muted-foreground`, 2 boutons côte à côte (ShimmerButton effet shimmer + Button outline).
   - **Services teaser** : H2 `Mes services`, 3 cards (IA / Full-Stack / Formation) identiques au rendu de `/services`, CTA ghost `Voir tous les services` en bas pointant vers `/services`.
   - **Projets teaser** : H2 `Projets récents`, 3 cards (ProjectCard de Feature 2 avec BentoCard Magic UI), CTA ghost `Voir tous les projets` en bas vers `/projets`.
   - **Final CTA** : fond card, H2 `Un projet en tête ?`, phrase courte, Button `Parlons de votre projet` pointant vers `/contact`.
4. Vérifier le `<head>` DevTools : `<title>` = `Accueil | ...`, description = `Metadata.homeDescription`, `<meta property="og:locale" content="fr_FR">`, `<link rel="alternate" hreflang="fr|en|x-default">`.
5. **Comptage effets lib** : auditer la page (DevTools Elements + import analysis) → trouver 1 et 1 seul `BackgroundRippleEffect` dans le Hero, 1 et 1 seul `ShimmerButton` dans le Hero, aucun autre effet Aceternity/Magic UI sur la home. Total = 2 effets = conforme DESIGN.md "2-3 max par page".
6. Tester navigation : clic CTA primaire Hero → `/fr/contact`, CTA secondaire Hero → `/fr/services`, CTA fin services → `/fr/services`, CTA fin projets → `/fr/projets`, CTA final → `/fr/contact`.
7. Redimensionner : mobile (sections stacked, CTAs Hero verticaux), desktop `lg:` (CTAs Hero côte à côte, grid services + projets en 3 cols).
8. **Streaming** : observer le Network tab → le HTML du shell arrive immédiatement, le contenu du teaser projets arrive légèrement plus tard (via React streaming). Le skeleton doit apparaître brièvement.

Attendu : tout OK, aucune erreur console, pas de hydration mismatch.

- [ ] **Step 11.6 : Smoke test EN**

1. Ouvrir `http://localhost:3000/en`.
2. Vérifier traductions : Hero (`AI & Full-Stack Development`), services teaser EN, projets teaser EN (H2 `Recent projects`), final CTA EN (`Got a project in mind?`).
3. Les `ProjectCard` affichent `titleEn`, `descriptionEn` (localisation déjà gérée par Feature 2 via `localizeProject`).
4. `<head>` : `<meta property="og:locale" content="en_US">`.
5. Tester un lien CTA → `/en/contact`, `/en/services`, `/en/projets`.

Attendu : contenu intégralement en anglais, navigation avec prefix `/en/`.

- [ ] **Step 11.7 : Arrêter le serveur dev**

Commande : `just stop`
Attendu : port 3000 libéré.

- [ ] **Step 11.8 : Proposer le commit au user (discipline CLAUDE.md)**

Ne PAS commit automatiquement. Demander au user :

> "Verification complète OK (lint + typecheck + build + smoke FR/EN + comptage effets 2/3 + streaming teaser projets). Je peux committer ce sub-project ? Message suggéré : `feat(home): page d'accueil avec hero Ripple, teasers services et projets, CTA final`."

Attendre validation explicite avant `git add` / `git commit`.

---

## Status du spec

La mise à jour du `status` du spec de `draft` vers `implemented` (frontmatter de [`03-page-accueil-design.md`](../../specs/pages-publiques-portfolio/03-page-accueil-design.md)) **n'est pas réalisée dans ce plan**. Elle est déléguée au workflow parent `/implement-subproject` (gates `/simplify` + `code/code-reviewer` + mise à jour status après approbation finale).

---

## Self-review

**Spec coverage** (chaque scénario du spec mappé à une task) :
- Scénario 1 (rendu FR complet) → Tasks 4, 5, 7, 8, 9, 10 + smoke 11.5.
- Scénario 2 (rendu EN) → Task 10.2 + smoke 11.6.
- Scénario 3 (CTAs Hero) → Task 4 (`<Link href="/contact">` et `<Link href="/services">`) + smoke 11.5 point 6.
- Scénario 4 (CTAs fin de section teaser) → Task 5 (`Voir tous les services`) + Task 7 (`Voir tous les projets`) + smoke 11.5 point 6.
- Scénario 5 (teaser projets limite et tri) → Task 7 (`TEASER_LIMIT = 3` + `.slice(0, TEASER_LIMIT)`) + smoke 11.5.
- Scénario 6 (metadata SEO localisée) → Task 9 (`generateMetadata`) + smoke 11.5 point 4.
- Scénario 7 (responsive mobile) → Task 4 (`flex-col sm:flex-row` sur CTAs) + Task 5/7 (`md:grid-cols-2 lg:grid-cols-3`) + smoke 11.5 point 7.
- Scénario 8 (responsive desktop) → idem.
- Scénario 9 (streaming projets teaser) → Task 6 (skeleton) + Task 7 + Task 9 (`<Suspense>`) + smoke 11.5 point 8.
- Scénario 10 (budget effets) → Tasks 1, 2, 4 (1 Aceternity + 1 Magic UI dans Hero, pas d'autre ailleurs) + smoke 11.5 point 5.
- Edge case "moins de 3 projets publiés" → Task 7 (`.slice(0, 3)` accepte 0/1/2).
- Edge case "ShimmerButton non installé" → Task 2 (install conditionnel).
- Edge case "Ripple CLI incompatible" → Task 1 (fallback user exécute).
- Edge case "interactivité désactivée" → non couvert (hors scope, prop `interactive` par défaut).
- Architectural decision A (Ripple vs Beams) → Task 1 + Task 3 (addendum DESIGN.md).
- Architectural decision B (réutilisation query vs nouvelle) → Task 7 (réutilisation pure).
- Architectural decision C (CTA fin de section symétrique) → Tasks 5 + 7.

**Placeholder scan** : aucun `TBD` / `TODO` / `à définir` / `implement later` / `similar to task N`. Les seules notes dynamiques (API exacte ShimmerButton à vérifier Step 2 et 4) sont justifiées car dépendent du composant généré CLI, pas d'un manque de rigueur.

**Type consistency** :
- `Hero` props (Task 4) ↔ appel dans `page.tsx` (Task 9) : `h1`, `tagline`, `ctaPrimaryLabel`, `ctaSecondaryLabel` cohérents.
- `ProjectsTeaserSection` prop `locale: Locale` (Task 7) ↔ appel dans `page.tsx` (Task 9) : cohérent.
- `TEASER_LIMIT = 3` (Task 7) ↔ spec scénario 5 (max 3 cards) : cohérent.
- `SERVICE_SLUGS` (sub 01) ↔ import dans Task 5 : cohérent (prérequis ordre topologique).
- Namespaces i18n :
  - `HomePage.hero.{h1, tagline, ctaPrimary, ctaSecondary}` (Task 10) ↔ Task 9 page (Task 4 props : `h1`, `tagline`, `ctaPrimaryLabel`, `ctaSecondaryLabel`) — cohérent mais les labels i18n sont des sous-clés différentes des props, OK car la page map les deux.
  - `HomePage.servicesTeaser.{title, subtitle, seeAll}` (Task 10) ↔ Task 5 consumer : cohérent.
  - `HomePage.projectsTeaser.{title, subtitle, seeAll}` (Task 10) ↔ Task 9 page (`title`, `subtitle`) + Task 7 (`seeAll`) : cohérent.
  - `HomePage.finalCta.{title, subtitle, ctaLabel}` (Task 10) ↔ Task 8 consumer : cohérent.

Aucune divergence détectée.

---

## Execution Handoff

Plan sauvegardé dans [`docs/superpowers/plans/pages-publiques-portfolio/03-page-accueil.md`](./03-page-accueil.md).

Deux options d'exécution lorsqu'on passera à l'implémentation (après implémentation du sub 01 qui est prérequis topologique) :

1. **Subagent-Driven (recommandé)** — `superpowers:subagent-driven-development` dispatch un subagent frais par task, review entre tasks. Aligné avec `/implement-subproject` qui intègre `/simplify` et `code/code-reviewer` comme gates.
2. **Inline Execution** — `superpowers:executing-plans`, batch avec checkpoints dans la session courante.

Pas d'exécution dans le cadre de `/decompose-feature` : la phase d'implémentation est déclenchée via `/implement-subproject pages-publiques-portfolio 03` (après `01`).
