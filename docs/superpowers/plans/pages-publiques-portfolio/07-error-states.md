# Pages d'erreur — Plan d'implémentation (sub-project 07 / Feature 1 Pages publiques)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec source :** [docs/superpowers/specs/pages-publiques-portfolio/07-error-states-design.md](../../specs/pages-publiques-portfolio/07-error-states-design.md)

**Goal :** Refactor design des 3 pages d'erreur App Router (`[locale]/not-found.tsx`, `[locale]/error.tsx`, `global-error.tsx`) avec icônes Lucide, tokens CSS, typography display, CTA retour home, et création d'un `app/not-found.tsx` racine pour catch les URLs hors locale.

**Architecture :** Server Components pour les versions sans interactivité (not-found locale + racine), Client Components pour les Error Boundaries (error.tsx + global-error.tsx). Réutilisation `PageShell` pour les versions locale (héritent automatiquement Navbar + Footer via `[locale]/layout.tsx`). Pour `app/not-found.tsx` racine et `global-error.tsx` : layout autonome hardcoded (vivent hors `NextIntlClientProvider`, hors fonts custom, hors theme provider). Extension des namespaces i18n existants `NotFound` et `ErrorPage` avec `description` et `ctaLabel`.

**Tech Stack :** Next.js 16 App Router · React 19 · TypeScript 6 strict · next-intl 4 (`localePrefix: 'always'`, FR/EN) · Tailwind CSS v4 + tokens DESIGN.md · Lucide React (icônes) · shadcn/ui Button.

**Rules à respecter (lecture dynamique) :**
- `.claude/rules/nextjs/server-client-components.md`
- `.claude/rules/nextjs/routing.md`
- `.claude/rules/nextjs/metadata-seo.md`
- `.claude/rules/next-intl/setup.md`
- `.claude/rules/next-intl/translations.md`
- `.claude/rules/tailwind/conventions.md`
- `.claude/rules/shadcn-ui/components.md`
- `.claude/rules/typescript/conventions.md`

**ADRs liés :** ADR-001 (monolithe Next.js), ADR-010 (i18n next-intl).

**Politique commits :** Pas de commit en cours de plan. La séquence complète est validée puis le user déclenche un commit unique en fin de workflow d'implémentation (cf. `~/.claude/CLAUDE.md` § Discipline commit). Les "checkpoints" entre tasks restent des points de validation visuelle/typecheck, pas des commits.

---

## File Structure

| Fichier | Action | Rôle |
|---|---|---|
| `messages/fr.json` | Modifier (étendre) | Ajouter clés `NotFound.description`, `NotFound.ctaLabel`, `ErrorPage.description`, `ErrorPage.ctaLabel` |
| `messages/en.json` | Modifier (étendre) | Parité stricte avec FR pour les 4 nouvelles clés |
| `src/app/[locale]/not-found.tsx` | Modifier (refactor complet) | Server Component, `PageShell` + icône `SearchX` + description + CTA `Button` localisé, metadata `noindex` |
| `src/app/[locale]/error.tsx` | Modifier (refactor complet) | Client Component, `PageShell` + icône `AlertCircle` + bouton retry conservé + CTA retour home additionnel |
| `src/app/global-error.tsx` | Modifier (refactor design minimal) | Client Component autonome, conserve `useSyncExternalStore` + FR/EN hardcoded, ajoute icône `AlertTriangle` + classes Tailwind + bouton natif stylé |
| `src/app/not-found.tsx` | Créer | Server Component autonome racine, FR hardcoded, layout sobre minimal pour URLs hors locale |

**Non touchés :** `src/app/[locale]/layout.tsx` (Navbar + Footer + ThemeProvider + NextIntlClientProvider déjà mountés), `src/i18n/*`, `src/components/layout/PageShell.tsx`, `src/components/ui/button.tsx`.

---

## Task 1 : Extension i18n — `messages/fr.json` et `messages/en.json`

**Files :**
- Modify: `messages/fr.json` (namespaces `NotFound` et `ErrorPage`)
- Modify: `messages/en.json` (parité)

**Pourquoi en premier :** les tasks 2, 3, 4 consomment ces clés via `t('NotFound.description')` etc. — elles doivent exister avant le refactor des pages sinon le typecheck `next-intl` (clés typées) tombera.

- [ ] **Step 1 : Étendre `messages/fr.json` namespace `NotFound`**

Remplacer le bloc `"NotFound": { ... }` actuel :

```json
  "NotFound": {
    "title": "404",
    "message": "Page introuvable."
  },
```

par :

```json
  "NotFound": {
    "title": "404",
    "message": "Page introuvable.",
    "description": "La page que vous cherchez n'existe pas ou a été déplacée. Vérifiez l'URL ou revenez à l'accueil pour explorer le portfolio.",
    "ctaLabel": "Retour à l'accueil"
  },
```

- [ ] **Step 2 : Étendre `messages/fr.json` namespace `ErrorPage`**

Remplacer le bloc `"ErrorPage": { ... }` actuel :

```json
  "ErrorPage": {
    "title": "Erreur",
    "message": "Une erreur est survenue."
  },
```

par :

```json
  "ErrorPage": {
    "title": "Erreur",
    "message": "Une erreur est survenue.",
    "description": "Quelque chose ne s'est pas passé comme prévu. Réessayez ou revenez à l'accueil. Si le problème persiste, contactez-moi.",
    "ctaLabel": "Retour à l'accueil"
  },
```

- [ ] **Step 3 : Étendre `messages/en.json` namespace `NotFound`** (parité stricte)

Remplacer le bloc `"NotFound": { ... }` actuel :

```json
  "NotFound": {
    "title": "404",
    "message": "Page not found."
  },
```

par :

```json
  "NotFound": {
    "title": "404",
    "message": "Page not found.",
    "description": "The page you are looking for does not exist or has been moved. Check the URL or head back home to explore the portfolio.",
    "ctaLabel": "Back to home"
  },
```

- [ ] **Step 4 : Étendre `messages/en.json` namespace `ErrorPage`** (parité)

Remplacer le bloc `"ErrorPage": { ... }` actuel :

```json
  "ErrorPage": {
    "title": "Error",
    "message": "Something went wrong."
  },
```

par :

```json
  "ErrorPage": {
    "title": "Error",
    "message": "Something went wrong.",
    "description": "Something didn't go as expected. Retry or head back home. If the issue persists, please reach out.",
    "ctaLabel": "Back to home"
  },
```

- [ ] **Step 5 : Vérifier la parité et le JSON valide**

Run : `pnpm typecheck` (next-intl typegen rebuild + tsc).
Expected : 0 erreur. Le typegen doit régénérer les types des clés et toutes les nouvelles clés doivent être disponibles côté usage.

---

## Task 2 : Refactor `src/app/[locale]/not-found.tsx` (Server Component)

**Files :**
- Modify: `src/app/[locale]/not-found.tsx` (remplacement intégral du contenu actuel)

- [ ] **Step 1 : Remplacer le contenu intégral du fichier**

Remplacer le contenu de `src/app/[locale]/not-found.tsx` par :

```typescript
import type { Metadata } from 'next'
import { SearchX } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: false },
}

export default async function NotFound() {
  const t = await getTranslations('NotFound')

  return (
    <PageShell title={t('title')} subtitle={t('message')}>
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <SearchX
          aria-hidden
          className="size-16 text-muted-foreground"
          strokeWidth={1.5}
        />
        <p className="text-base text-muted-foreground">{t('description')}</p>
        <Button asChild size="lg">
          <Link href="/">{t('ctaLabel')}</Link>
        </Button>
      </section>
    </PageShell>
  )
}
```

Notes :
- `metadata` static suffit (pas de `generateMetadata` async). Le titre `'Page introuvable'` est le titre HTML default — le `title.template` du root layout `[locale]/layout.tsx` lui appliquera `Page introuvable | <siteTitle>` automatiquement. `robots: { index: false, follow: false }` empêche l'indexation accidentelle d'une 404.
- `Link` from `@/i18n/navigation` préfixe automatiquement avec la locale active (cf. `.claude/rules/next-intl/setup.md`).
- `Button asChild` (slot pattern shadcn) wrappe le `Link` pour appliquer les classes du bouton tout en gardant le bon `<a>` natif.
- Icône `SearchX` 64px (`size-16`) en `text-muted-foreground` strokeWidth 1.5 pour effet doux.
- Section centrée mobile-first avec `flex flex-col items-center gap-6 text-center`.

- [ ] **Step 2 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 3 : Refactor `src/app/[locale]/error.tsx` (Client Component)

**Files :**
- Modify: `src/app/[locale]/error.tsx` (remplacement intégral du contenu actuel)

- [ ] **Step 1 : Remplacer le contenu intégral du fichier**

Remplacer le contenu de `src/app/[locale]/error.tsx` par :

```typescript
'use client'

import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: Props) {
  // TODO post-MVP : envoyer error à Sentry (cf. PRODUCTION.md > Monitoring)
  void error
  const t = useTranslations('ErrorPage')
  const tCommon = useTranslations('Common')

  return (
    <PageShell title={t('title')} subtitle={t('message')}>
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <AlertCircle
          aria-hidden
          className="size-16 text-destructive"
          strokeWidth={1.5}
        />
        <p className="text-base text-muted-foreground">{t('description')}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button type="button" size="lg" onClick={reset}>
            {tCommon('retry')}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">{t('ctaLabel')}</Link>
          </Button>
        </div>
      </section>
    </PageShell>
  )
}
```

Notes :
- Conserve la signature exacte `({ error, reset })` et la convention `void error` + commentaire TODO Sentry.
- Conserve le namespace `Common` pour `t('retry')` (déjà existant : "Réessayer" / "Retry").
- 2 boutons : `default` (retry) + `outline` (retour home), stack mobile, row desktop (`flex-col sm:flex-row`).
- Icône `AlertCircle` 64px en `text-destructive`.

- [ ] **Step 2 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 4 : Refactor `src/app/global-error.tsx` (Client Component autonome)

**Files :**
- Modify: `src/app/global-error.tsx` (refactor design minimal stylé)

⚠️ Contrainte critique : `global-error.tsx` vit **hors** `NextIntlClientProvider`, **hors** fonts `next/font`, **hors** theme provider. Conserver strictement le pattern `useSyncExternalStore` + messages FR/EN hardcodés (garde-fou si next-intl crash). Ne pas importer `Button` shadcn (dépend de tokens CSS injectés via `globals.css` du `[locale]/layout.tsx` — risque de casse en mode crash). Utiliser `<button type="button">` natif stylé manuellement avec classes Tailwind sur tokens utilitaires neutres (`bg-foreground text-background`, etc.).

- [ ] **Step 1 : Remplacer le contenu intégral du fichier**

Remplacer le contenu de `src/app/global-error.tsx` par :

```typescript
'use client'

import { AlertTriangle } from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { routing } from '@/i18n/routing'

type Locale = (typeof routing.locales)[number]

// Messages hardcodés : global-error vit hors de NextIntlClientProvider et
// peut se déclencher quand next-intl lui-même crash. Garder ce fichier
// indépendant du runtime i18n pour rester affichable en dernier recours.
const messages = {
  fr: {
    title: 'Erreur critique',
    description:
      'Une erreur critique est survenue. Veuillez réessayer ou revenir à l\'accueil.',
    retry: 'Réessayer',
    home: 'Retour à l\'accueil',
  },
  en: {
    title: 'Critical error',
    description:
      'A critical error occurred. Please retry or head back home.',
    retry: 'Retry',
    home: 'Back to home',
  },
} satisfies Record<Locale, Record<string, string>>

function getClientLocale(): Locale {
  const segment = window.location.pathname.split('/')[1]
  return routing.locales.find((loc) => loc === segment) ?? routing.defaultLocale
}

// Pas de souscription : global-error ne survit pas à une navigation popstate.
const subscribe = () => () => {}
const getServerLocale = (): Locale => routing.defaultLocale

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  // TODO post-MVP : envoyer error à Sentry (cf. PRODUCTION.md > Monitoring)
  void error
  const locale = useSyncExternalStore(subscribe, getClientLocale, getServerLocale)
  const t = messages[locale]

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
          <AlertTriangle
            aria-hidden
            className="size-16 text-destructive"
            strokeWidth={1.5}
          />
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t.title}
          </h1>
          <p className="text-base text-muted-foreground">{t.description}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
            >
              {t.retry}
            </button>
            <a
              href={`/${locale}`}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
            >
              {t.home}
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
```

Notes :
- Conserve `useSyncExternalStore` + `getClientLocale` + `getServerLocale` + `subscribe` (pattern existant).
- Conserve le commentaire d'invariant sur `messages` hardcodés.
- Ajoute `description` et `home` aux messages FR/EN.
- Body avec `min-h-dvh bg-background text-foreground antialiased` (les tokens CSS sont disponibles via `globals.css` injecté par Next.js même hors `[locale]/layout.tsx` — c'est CSS root layer, pas dépendant des providers).
- `<button>` natif stylé pour retry (pas de `Button` shadcn pour éviter dépendance à `cva` + `Slot` qui peuvent crasher).
- `<a href="/${locale}">` natif (pas de `Link` next-intl, hors providers).
- Icône Lucide OK (Lucide est zero-dep côté provider, fonctionne hors NextIntlClientProvider).
- `font-bold tracking-tight` sur `<h1>` (pas de `font-display` car Sansation n'est pas chargée hors `[locale]/layout.tsx`).

- [ ] **Step 2 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 5 : Création `src/app/not-found.tsx` racine (Server Component autonome)

**Files :**
- Create: `src/app/not-found.tsx`

⚠️ Contrainte critique : ce fichier vit **hors** `[locale]/layout.tsx`, donc hors `NextIntlClientProvider`, hors fonts custom, hors theme provider, hors Navbar/Footer. Layout autonome FR par défaut (`routing.defaultLocale = 'fr'`). Lien `<a href="/fr">` hardcoded.

- [ ] **Step 1 : Créer le fichier**

Créer `src/app/not-found.tsx` avec le contenu suivant :

```typescript
import type { Metadata } from 'next'
import { SearchX } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: false },
}

export default function RootNotFound() {
  return (
    <html lang="fr">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
          <SearchX
            aria-hidden
            className="size-16 text-muted-foreground"
            strokeWidth={1.5}
          />
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">404</h1>
          <p className="text-base text-muted-foreground">
            La page que vous cherchez n&apos;existe pas. Revenez à l&apos;accueil pour
            explorer le portfolio.
          </p>
          <a
            href="/fr"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-medium text-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
          >
            Retour à l&apos;accueil
          </a>
        </main>
      </body>
    </html>
  )
}
```

Notes :
- `<html>` + `<body>` autonomes (App Router : un not-found racine doit fournir son propre wrapper si pas de layout parent applicable).
- Texte FR hardcodé (locale par défaut, pas de fallback EN — c'est un dernier recours pour URLs jamais légitimes).
- `<a href="/fr">` hardcoded (pas de `Link` next-intl).
- Mêmes classes Tailwind utilitaires que `global-error.tsx` pour cohérence (tokens CSS disponibles via `globals.css`).
- `metadata` avec `robots: noindex,nofollow` (cohérent avec la version locale).

- [ ] **Step 2 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 6 : Quality gates statiques (lint + typecheck + build)

**Files :** aucun, lancement des outils.

- [ ] **Step 1 : Lint**

Run : `pnpm lint` (ou `just lint`)
Expected : 0 erreur, 0 warning bloquant.

- [ ] **Step 2 : Typecheck**

Run : `just typecheck` (lance `pnpm next typegen && pnpm typecheck`)
Expected : 0 erreur. Vérifier en particulier que les nouvelles clés i18n (`NotFound.description`, `NotFound.ctaLabel`, `ErrorPage.description`, `ErrorPage.ctaLabel`) sont reconnues par le typegen `next-intl`.

- [ ] **Step 3 : Tests unit (sanity check, ne devraient pas régresser)**

Run : `just test-unit`
Expected : tous les tests unit passent. Aucun test ajouté par ce sub-project (`tdd_scope: none`), mais les tests existants (notamment les 14 tests `buildPageMetadata` du sub-project SEO `metadata-base`) doivent rester verts.

- [ ] **Step 4 : Tests integration (sanity)**

Run : `just test-integration`
Expected : 39/39 verts (aucune régression).

- [ ] **Step 5 : Build prod**

Run : `pnpm build`
Expected : exit 0. Vérifier dans le report `next build` que toutes les routes statiques sont prerendered (`○` ou `◐`) et qu'aucune route ne devient `ƒ` Dynamic à cause d'une erreur de typage ou d'import.

---

## Task 7 : Validation manuelle end-to-end (5 scénarios spec)

**Files :** aucun, vérification visuelle browser. Lancer le serveur en mode prod pour reproduire le comportement réel d'indexation.

> **Pré-requis** : `docker compose up -d --wait postgres` (postgres déjà up), `.env` rempli (`NEXT_PUBLIC_SITE_URL=http://localhost:3000` en local).

- [ ] **Step 1 : Build prod local + start**

Run : `just stop && pnpm build && pnpm start`
Expected : `next start` écoute sur `http://localhost:3000`. `NODE_ENV=production` automatique.

- [ ] **Step 2 : Scénario 1 — Slug projet inexistant FR**

Action : ouvrir `http://localhost:3000/fr/projets/inconnu-xxx-yyy` dans un navigateur (ou via curl pour récupérer le HTML).

Expected (visuel) :
- Navbar sticky en haut (logo + nav + theme toggle + language switcher) hérité de `[locale]/layout.tsx` ;
- titre "404" en `font-display` (Sansation), centré ;
- sous-titre "Page introuvable." en gris atténué ;
- icône `SearchX` 64px ;
- paragraphe description ;
- bouton "Retour à l'accueil" qui redirige vers `/fr` ;
- Footer global en bas ;
- HTML rendu contient `<meta name="robots" content="noindex,nofollow">` (vérifier via `view-source:` ou `curl ... | grep robots`).

Run check meta robots : `curl -s http://localhost:3000/fr/projets/inconnu-aaa-bbb | grep -oE '<meta name="robots"[^>]*>'`
Expected : `<meta name="robots" content="noindex,nofollow"/>`.

- [ ] **Step 3 : Scénario 2 — Slug inexistant EN**

Action : ouvrir `http://localhost:3000/en/projets/inconnu-xxx-yyy`.

Expected :
- tous les textes (`title`, `message`, `description`, `ctaLabel`) en anglais (issus de `messages/en.json`) ;
- bouton "Back to home" → `/en`.

- [ ] **Step 4 : Scénario 3 — URL hors locale → not-found racine**

Action : ouvrir `http://localhost:3000/foo-random-1234` ou `http://localhost:3000/wp-admin`.

Expected :
- page sobre minimale, FR par défaut ;
- **pas de Navbar, pas de Footer** (autonome) ;
- titre "404" + paragraphe FR + lien `<a href="/fr">` hardcoded ;
- icône `SearchX` ;
- design centré mobile-friendly.

Optionnel (vérification status code) : `curl -sI http://localhost:3000/foo-random-1234 | head -1`
Note : selon le comportement Next.js 16 + `localePrefix: 'always'`, le status peut être 404 ou 200. Le 404 status est préférable mais pas bloquant pour ce sub-project (sujet framework indépendant tracé en hors-scope).

- [ ] **Step 5 : Scénario 4 — Erreur runtime → error stylé**

Action : pour tester, modifier temporairement une page (ex: `src/app/[locale]/(public)/services/page.tsx`) en ajoutant `throw new Error('test')` au tout début de la fonction async, puis builder et ouvrir `/fr/services`.

Expected :
- Navbar + Footer hérités ;
- titre "Erreur" en `font-display` ;
- icône `AlertCircle` rouge (`text-destructive`) ;
- description localisée ;
- bouton primaire "Réessayer" + bouton secondaire `outline` "Retour à l'accueil".

Important : revert la modification après le test (`git checkout -- src/app/[locale]/\(public\)/services/page.tsx`).

- [ ] **Step 6 : Scénario 5 — Crash next-intl → global-error stylé**

⚠️ Difficile à reproduire en conditions réelles (next-intl ne crash pas tout seul). Validation acceptée :
- vérification visuelle directe via React DevTools en forçant le composant à rendre, OU
- inspection visuelle du markup généré en faisant simuler la condition (ex: corrompre `messages/fr.json` temporairement).

Si non testable raisonnablement, valider uniquement par revue de code que :
- `<html>` + `<body>` présents ;
- `useSyncExternalStore` conservé pour fallback locale ;
- icône `AlertTriangle` + titre + description hardcodés FR/EN ;
- bouton retry natif stylé + lien retour `/<locale>`.

- [ ] **Step 7 : Validation dark/light + responsive**

Action : sur chaque page d'erreur (locale et racine), tester :
- mode dark (toggle navbar) → tokens CSS doivent switcher (background, foreground, muted, destructive) ;
- viewport mobile 375px (iPhone SE) → boutons en stack vertical, padding correct ;
- viewport desktop 1280px → boutons en row, container `max-w-7xl` ;
- focus clavier (Tab) → ring focus visible sur boutons et liens.

- [ ] **Step 8 : Cleanup**

Run : `just stop` (ou Ctrl+C sur `pnpm start`).

---

## Self-review (post-écriture, fait par l'auteur du plan)

1. **Couverture spec** :
   - Création `src/app/not-found.tsx` racine → Task 5 ✅
   - Refactor design `[locale]/not-found.tsx` → Task 2 ✅
   - Refactor design `[locale]/error.tsx` → Task 3 ✅
   - Refactor design `global-error.tsx` → Task 4 ✅
   - Extension i18n `NotFound` + `ErrorPage` (`description`, `ctaLabel`) → Task 1 ✅
   - Acceptance criteria 5 scénarios → Task 7 (Steps 2-6) ✅
   - Edge cases (URL hors locale, locale invalide, dark mode, mobile responsive, focus clavier) → Task 7 (Step 7) + couvert par tokens CSS ✅
   - Architectural decision A (layout autonome racine) → Task 5 implémente A ✅
   - `tdd_scope: none` respecté (aucune task de test unit) → ✅

2. **Placeholder scan** :
   - Aucun `TBD` / `TODO` / `à compléter` dans les snippets de code (sauf le `// TODO post-MVP : Sentry` qui est un TODO légitime conservé conformément au spec).
   - Les commandes `pnpm` / `just` sont exactes et reproductibles.
   - Aucun "similar to Task N" : chaque task contient son code complet.

3. **Type consistency** :
   - Le type `Props = { error: Error & { digest?: string }; reset: () => void }` est défini Tasks 3 et 4 de manière identique.
   - `Locale = (typeof routing.locales)[number]` cohérent dans `global-error.tsx`.
   - `Metadata` de `next` importé Tasks 2 et 5 avec le même usage (`title` + `robots`).
   - Toutes les clés i18n consommées (Tasks 2-3) correspondent aux clés ajoutées Task 1 (`NotFound.title`, `NotFound.message`, `NotFound.description`, `NotFound.ctaLabel`, `ErrorPage.title`, `ErrorPage.message`, `ErrorPage.description`, `ErrorPage.ctaLabel`, `Common.retry`).

Plan complet.
