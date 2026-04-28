# États de chargement — Plan d'implémentation (sub-project 08 / Feature 1 Pages publiques)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec source :** [docs/superpowers/specs/pages-publiques-portfolio/08-loading-states-design.md](../../specs/pages-publiques-portfolio/08-loading-states-design.md)

**Goal :** Polish des états de chargement : installer le primitif `Skeleton` shadcn, refactor les 4 skeletons custom, ajouter un loading dédié pour `/projets/[slug]`, redesigner `[locale]/loading.tsx` en mini-shell brandé.

**Architecture :** `Skeleton` ajouté via CLI shadcn (style new-york). Refactor des 4 skeletons custom pour consommer `<Skeleton>`. Création d'un `loading.tsx` granulaire au niveau `[slug]`. Redesign du loading.tsx global pour cohérence visuelle avec `PageShell`.

**Tech Stack :** Next.js 16 App Router · React 19 · TypeScript 6 strict · Tailwind CSS v4 · shadcn/ui (Skeleton primitif) · next-intl 4.

**Rules à respecter :**
- `.claude/rules/shadcn-ui/setup.md`
- `.claude/rules/shadcn-ui/components.md`
- `.claude/rules/tailwind/conventions.md`
- `.claude/rules/nextjs/routing.md`
- `.claude/rules/nextjs/server-client-components.md`
- `.claude/rules/next-intl/translations.md`

**Politique commits :** Pas de commit en cours de plan. Commit unique en fin de workflow d'implémentation.

---

## File Structure

| Fichier | Action | Rôle |
|---|---|---|
| `src/components/ui/skeleton.tsx` | Créer (CLI shadcn) | Primitif Skeleton (`<div data-slot="skeleton" className="bg-accent animate-pulse rounded-md">`) |
| `src/components/features/projects/ProjectsListSkeleton.tsx` | Modifier | Refactor pour utiliser `<Skeleton>` |
| `src/components/features/home/ProjectsTeaserSkeleton.tsx` | Modifier | Refactor |
| `src/components/features/home/StackMarqueeSkeleton.tsx` | Modifier | Refactor |
| `src/components/features/about/StatsSkeleton.tsx` | Modifier | Refactor (path à confirmer en lecture si fichier différent) |
| `src/app/[locale]/(public)/projets/[slug]/loading.tsx` | Créer | Skeleton dédié case study |
| `src/app/[locale]/loading.tsx` | Modifier | Redesign mini-shell brandé |

---

## Task 1 : Installer le primitif Skeleton shadcn

**Files :**
- Create: `src/components/ui/skeleton.tsx` (via CLI)

- [ ] **Step 1 : Lancer le CLI shadcn pour ajouter Skeleton**

Run : `pnpm dlx shadcn@latest add @shadcn/skeleton`

⚠️ Si le CLI est interactif (prompt overwrite, choix style) : demander à l'utilisateur de le lancer manuellement dans son terminal puis confirmer la création de `src/components/ui/skeleton.tsx`. Ne pas écrire le fichier à la main si le CLI a planté.

Expected : création de `src/components/ui/skeleton.tsx` avec le contenu officiel shadcn (style new-york) :

```typescript
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-accent animate-pulse rounded-md', className)}
      {...props}
    />
  )
}

export { Skeleton }
```

- [ ] **Step 2 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 2 : Refactor `ProjectsListSkeleton.tsx`

**Files :**
- Modify: `src/components/features/projects/ProjectsListSkeleton.tsx`

- [ ] **Step 1 : Lire l'état actuel du fichier**

Run : `Read src/components/features/projects/ProjectsListSkeleton.tsx`

L'état actuel utilise `<div className="h-X w-Y animate-pulse rounded-md bg-muted" />` (vu en audit, fichier 19 lignes).

- [ ] **Step 2 : Remplacer par le primitif Skeleton**

Remplacer le contenu intégral par :

```typescript
import { Skeleton } from '@/components/ui/skeleton'

export function ProjectsListSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-lg border border-border" />
        ))}
      </div>
    </div>
  )
}
```

Notes :
- `<Skeleton>` applique déjà `animate-pulse` + `rounded-md` + `bg-accent` par défaut.
- Le `border border-border` est conservé sur les cards pour préserver le visuel de bordure (pas couvert par Skeleton).
- `rounded-lg` override le `rounded-md` du primitif (cohérent avec DESIGN.md cards radius).

- [ ] **Step 3 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 3 : Refactor `ProjectsTeaserSkeleton.tsx`

**Files :**
- Modify: `src/components/features/home/ProjectsTeaserSkeleton.tsx`

- [ ] **Step 1 : Lire l'état actuel et identifier les `<div animate-pulse bg-muted>`**

- [ ] **Step 2 : Remplacer chaque occurrence par `<Skeleton className="...dimensions..." />`**

Conserver la structure (grid, gap, padding) inchangée. Importer `Skeleton` depuis `@/components/ui/skeleton`.

- [ ] **Step 3 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 4 : Refactor `StackMarqueeSkeleton.tsx`

**Files :**
- Modify: `src/components/features/home/StackMarqueeSkeleton.tsx`

- [ ] **Step 1 : Lire l'état actuel**

- [ ] **Step 2 : Remplacer les `<div animate-pulse bg-muted>` par `<Skeleton>`**

- [ ] **Step 3 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 5 : Refactor `StatsSkeleton` (path à confirmer)

**Files :**
- Modify: chemin du fichier `StatsSkeleton.tsx` à identifier en lecture (probablement `src/components/features/about/StatsSkeleton.tsx` ou colocalisé avec `NumberTickerStats`)

- [ ] **Step 1 : Identifier le fichier**

Run : `Glob src/components/features/about/*Skeleton*.tsx`

- [ ] **Step 2 : Lire et refactor avec `<Skeleton>`**

- [ ] **Step 3 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 6 : Créer `[locale]/(public)/projets/[slug]/loading.tsx` dédié

**Files :**
- Create: `src/app/[locale]/(public)/projets/[slug]/loading.tsx`

- [ ] **Step 1 : Lire la structure actuelle de `CaseStudyLayout`**

Run : `Read src/components/features/projects/CaseStudyLayout.tsx` (pour identifier les zones principales : header avec titre + meta, content markdown, links GitHub/démo).

- [ ] **Step 2 : Créer le loading.tsx avec un placeholder structuré**

```typescript
import { Skeleton } from '@/components/ui/skeleton'

export default function CaseStudyLoading() {
  return (
    <main
      role="status"
      aria-busy="true"
      className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14"
    >
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
      <div className="mt-10 flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </main>
  )
}
```

Notes :
- `max-w-4xl` typique d'un article markdown (prose).
- `role="status" aria-busy="true"` pour accessibilité.
- Pas de `aria-label` localisé (CSS-only loading, l'utilisateur de screen reader entend déjà l'annonce de transition de route via Next.js).
- 3 zones : header (titre + meta + tags) → contenu markdown (5 lignes) → links (2 boutons GitHub/démo).

- [ ] **Step 3 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 7 : Redesign `[locale]/loading.tsx`

**Files :**
- Modify: `src/app/[locale]/loading.tsx` (remplacement intégral)

- [ ] **Step 1 : Remplacer le contenu intégral**

Remplacer le contenu actuel (Loader2 spinner) par :

```typescript
import { getTranslations } from 'next-intl/server'

import { Skeleton } from '@/components/ui/skeleton'

export default async function Loading() {
  const tCommon = await getTranslations('Common')

  return (
    <main
      role="status"
      aria-busy="true"
      aria-label={tCommon('loading')}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14"
    >
      <header className="mb-8 flex flex-col items-center gap-2 lg:mb-10">
        <Skeleton className="h-12 w-2/3 sm:w-1/2" />
        <Skeleton className="h-6 w-1/2 sm:w-1/3" />
      </header>
      <Skeleton className="h-96 w-full" />
    </main>
  )
}
```

Notes :
- Mime la structure de `PageShell` (container `max-w-7xl`, padding standard, header centré avec titre + sous-titre).
- Skeleton de header (`h-12` titre + `h-6` sous-titre) + skeleton de contenu (`h-96 w-full`).
- ARIA conservé via `aria-label` localisé (`Common.loading` = "Chargement…" / "Loading…", déjà existant dans `messages/{fr,en}.json`).
- Server Component async (le `Loader2` actuel était un Server Component synchrone, le passage à async pour `getTranslations` est compatible Next.js).

- [ ] **Step 2 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 8 : Quality gates statiques

**Files :** aucun, lancement des outils.

- [ ] **Step 1 : Lint**

Run : `pnpm lint`
Expected : 0 erreur.

- [ ] **Step 2 : Typecheck**

Run : `just typecheck`
Expected : 0 erreur.

- [ ] **Step 3 : Tests unit (sanity)**

Run : `just test-unit`
Expected : 74/74 verts (aucune régression).

- [ ] **Step 4 : Build prod**

Run : `pnpm build`
Expected : exit 0. Toutes les routes prerendered (`○` ou `◐`).

---

## Task 9 : Validation manuelle (3 scénarios)

**Files :** aucun.

> **Pré-requis** : `just dev` ou `pnpm dev` (le mode dev déclenche les loading.tsx visibles à chaque navigation).

- [ ] **Step 1 : Démarrer le serveur dev**

Run : `just dev`
Expected : serveur sur `http://localhost:3000`.

- [ ] **Step 2 : Scénario 1 — Refactor skeletons identique visuellement**

Action : ouvrir `/fr/projets` (Network throttle "Slow 3G" via DevTools) → observer le `ProjectsListSkeleton` pendant le chargement.

Expected : skeleton 3 chips (filtres) + grid 6 cards `h-64`. Animation de pulse identique au comportement avant refactor.

Action similaire sur `/fr/a-propos` (StatsSkeleton + StackSkeleton dans Suspense in-page) et `/` (ProjectsTeaserSkeleton + StackMarqueeSkeleton).

- [ ] **Step 3 : Scénario 2 — Loading dédié `/projets/[slug]`**

Action : ouvrir `/fr/projets/<slug-existant>` avec Network throttle → observer le skeleton dédié `CaseStudyLayout` (header + 5 lignes content + 2 boutons) pendant la transition de route.

Expected : pas de `Loader2` global brut, mais bien le skeleton structuré.

- [ ] **Step 4 : Scénario 3 — Loading global redesigné**

Action : naviguer entre 2 pages publiques (ex: `/fr` → `/fr/services`) avec Network throttle.

Expected : mini-shell brandé (header skeleton + contenu skeleton) cohérent avec `PageShell`, ARIA `role="status"` + `aria-busy="true"` + `aria-label="Chargement…"` présents dans le DOM.

- [ ] **Step 5 : Dark/light + responsive**

Action : toggle dark mode + viewport mobile 375px.

Expected : skeletons s'adaptent (background-accent switch dark/light, grid responsive, padding correct).

- [ ] **Step 6 : Cleanup**

Run : `just stop`.

---

## Self-review

1. **Couverture spec** :
   - Primitif `Skeleton` ajouté → Task 1 ✅
   - 4 refactors skeletons → Tasks 2-5 ✅
   - `[slug]/loading.tsx` dédié → Task 6 ✅
   - `[locale]/loading.tsx` redesign → Task 7 ✅
   - Acceptance criteria 4 scénarios → Task 9 ✅
   - Edge cases (dark mode, mobile, ARIA) → Task 9 Step 5 ✅
   - `tdd_scope: none` respecté → ✅

2. **Placeholder scan** : aucun TBD/TODO dans les snippets de code.

3. **Type consistency** : `Skeleton` importé depuis `@/components/ui/skeleton` partout.

Plan complet.
