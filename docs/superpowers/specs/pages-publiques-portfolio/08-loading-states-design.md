---
feature: "Feature 1 MVP — Pages publiques portfolio"
subproject: "loading-states"
goal: "Installer le primitif Skeleton shadcn, refactor les 4 skeletons custom pour l'utiliser, ajouter un loading dédié sur /projets/[slug] et redesigner [locale]/loading.tsx en mini-shell branding"
status: "implemented"
complexity: "S"
tdd_scope: "none"
depends_on: ["07-error-states-design.md"]
date: "2026-04-28"
---

# États de chargement — Skeleton primitif + loading dédiés

## Scope

Polish des états de chargement à 4 niveaux :

1. **Installer le primitif `Skeleton`** de shadcn/ui dans `src/components/ui/skeleton.tsx` (manquant aujourd'hui).
2. **Refactor des 4 skeletons custom** existants (`ProjectsListSkeleton`, `ProjectsTeaserSkeleton`, `StackMarqueeSkeleton`, `StatsSkeleton`) pour consommer `<Skeleton>` au lieu de `<div className="animate-pulse bg-muted ...">`.
3. **Créer `src/app/[locale]/(public)/projets/[slug]/loading.tsx`** dédié au case study (skeleton du `CaseStudyLayout`) — actuellement c'est le `[locale]/loading.tsx` global générique qui s'affiche.
4. **Redesigner `src/app/[locale]/loading.tsx`** : remplacer le spinner Loader2 brut par un mini-shell brandé (container + skeleton de header + skeleton de contenu) cohérent avec `PageShell`.

**Exclu** : modification des 3 Suspense in-page existants (déjà fonctionnels dans `/projets`, `/a-propos` et `/`), ajout d'un Suspense sur `/projets/[slug]` (non nécessaire — le `loading.tsx` file-based suffit pour la transition de route), animation custom de pulse (le `animate-pulse` Tailwind suffit).

### État livré

À la fin de ce sub-project, on peut :
- importer `<Skeleton>` shadcn depuis `@/components/ui/skeleton` dans n'importe quel composant ;
- voir les 4 skeletons custom refactorés utiliser `<Skeleton>` (markup unifié, classes auto-pulse + bg-muted appliquées par le primitif) ;
- naviguer vers `/fr/projets/<slug>` en mode dev avec ralenti réseau et observer le skeleton dédié `CaseStudyLayout` (header + content placeholder) au lieu du `Loader2` global brut ;
- naviguer entre n'importe quelles 2 pages publiques en mode dev avec ralenti réseau et observer le `[locale]/loading.tsx` redesigné (mini-shell branding cohérent visuellement avec le `PageShell` de la page cible).

## Dependencies

- `07-error-states-design.md` (statut: implemented) — ce sub-project est topologiquement après 07 (même feature, même branche `feature/error-states`). Pas de dépendance fonctionnelle directe, juste l'ordre de la feature.

## Files touched

- **À créer** : `src/components/ui/skeleton.tsx` (primitif shadcn ajouté via `pnpm dlx shadcn@latest add @shadcn/skeleton`)
- **À modifier** : `src/components/features/projects/ProjectsListSkeleton.tsx` (refactor pour utiliser `<Skeleton>`)
- **À modifier** : `src/components/features/home/ProjectsTeaserSkeleton.tsx` (refactor)
- **À modifier** : `src/components/features/home/StackMarqueeSkeleton.tsx` (refactor)
- **À modifier** : `src/components/features/about/StatsSkeleton.tsx` (refactor — fichier à confirmer en lecture)
- **À créer** : `src/app/[locale]/(public)/projets/[slug]/loading.tsx` (skeleton dédié case study)
- **À modifier** : `src/app/[locale]/loading.tsx` (redesign mini-shell branding)

## Architecture approach

- **Primitif `Skeleton` shadcn** : ajout du composant officiel via le CLI shadcn (style `new-york`, copie du source dans `src/components/ui/skeleton.tsx`). Le composant standard est un `<div>` qui applique `data-slot="skeleton"` + `bg-accent animate-pulse rounded-md` via `cn(className)`. Voir `.claude/rules/shadcn-ui/setup.md` (CLI add) et `.claude/rules/shadcn-ui/components.md` (philosophie ownership : modifiable directement).
- **Refactor des 4 skeletons custom** : remplacer `<div className="h-X w-Y animate-pulse rounded-md bg-muted">` par `<Skeleton className="h-X w-Y" />`. La classe `bg-muted` actuelle migre vers `bg-accent` (default shadcn) — cohérent avec DESIGN.md (token sémantique). Conserver la structure (grid, gap, layout) inchangée. Voir `.claude/rules/tailwind/conventions.md` (`cn()` obligatoire pour la composition classes, tokens sémantiques).
- **`/projets/[slug]/loading.tsx` dédié** : Server Component synchrone, retourne un placeholder du `CaseStudyLayout` (header avec skeleton de titre + meta + skeleton du contenu markdown + skeleton des liens GitHub/démo). Layout : `<main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14">` (mêmes paddings que `PageShell` avec `max-w-4xl` typique d'un article). Voir `.claude/rules/nextjs/routing.md` (loading.tsx file-based) et DESIGN.md (typo + spacing).
- **`[locale]/loading.tsx` redesign** : remplacer le `<main aria-busy>` + `<Loader2>` brut par un mini-shell qui mime la structure d'un `PageShell` : container + skeleton de titre `font-display` (`<Skeleton className="h-12 w-64" />`) + skeleton de sous-titre + skeleton de contenu (`<Skeleton className="h-64 w-full" />`). Conserver les ARIA `role="status"` + `aria-busy="true"` + `aria-label` localisé via `getTranslations('Common.loading')`. Voir DESIGN.md (`PageShell` typo) et `.claude/rules/next-intl/translations.md` (`getTranslations` async dans Server Component).
- **Pas de tests** : `tdd_scope: none`. C'est du chrome routing/UI pur, aucune règle métier projet à protéger contre régression (cf. `~/.claude/CLAUDE.md` § Code > Tests, no-lib-test). Validation manuelle visuelle uniquement (browser avec Network throttle).

## Acceptance criteria

### Scénario 1 : Primitif Skeleton importable
**GIVEN** le composant `Skeleton` ajouté via shadcn CLI
**WHEN** un autre composant fait `import { Skeleton } from '@/components/ui/skeleton'`
**THEN** l'import fonctionne, `pnpm typecheck` passe à 0 erreur
**AND** `<Skeleton className="h-10 w-20" />` rend un `<div>` avec `data-slot="skeleton"` + classes pulse + bg-accent

### Scénario 2 : Refactor skeletons existants
**GIVEN** les 4 skeletons custom (`ProjectsListSkeleton`, `ProjectsTeaserSkeleton`, `StackMarqueeSkeleton`, `StatsSkeleton`)
**WHEN** ils utilisent `<Skeleton>` au lieu de `<div className="animate-pulse bg-muted">`
**THEN** le rendu visuel reste identique (animation de pulse cohérente, dimensions inchangées)
**AND** aucune occurrence de `animate-pulse rounded-md bg-muted` n'est laissée hardcodée dans ces 4 fichiers

### Scénario 3 : Loading dédié `/projets/[slug]`
**GIVEN** un visiteur qui navigue vers `/fr/projets/<slug>` avec ralenti réseau (DevTools throttle)
**WHEN** la page case study charge
**THEN** le HTML affiche un placeholder structuré du `CaseStudyLayout` (header + meta + content + links) au lieu du `Loader2` global générique
**AND** la transition vers le contenu chargé est fluide (pas de saut de layout)

### Scénario 4 : Loading global redesigné
**GIVEN** un visiteur qui navigue entre 2 pages publiques avec ralenti réseau
**WHEN** la transition de route s'exécute
**THEN** le HTML affiche un mini-shell brandé (skeleton de header `font-display` + skeleton de contenu) cohérent avec `PageShell`, au lieu du spinner `Loader2` brut isolé
**AND** les ARIA `role="status"` + `aria-busy="true"` + `aria-label` localisé sont conservés (accessibilité non régressée)

## Edge cases

- **Cas sombre** : `<Skeleton>` shadcn utilise `bg-accent` (token sémantique) → switch automatique dark/light via les tokens CSS. Vérification visuelle dark mode requise.
- **Skeleton trop visible vs trop discret** : `bg-accent` (light = `#F0F5F0`, dark = `#1A2E1A`) plus subtil que `bg-muted`. Si trop discret en dark, ajuster vers `bg-muted` via override `<Skeleton className="bg-muted h-10 w-20" />` au cas par cas.
- **`/projets/[slug]/loading.tsx` rendu hors contexte projet** : ce fichier ne peut pas accéder au `project` (pas de params disponibles), donc le skeleton est générique (pas de title préchargé). Acceptable.
- **Mobile responsive** : skeletons doivent s'adapter (grid responsive, padding, etc.). Test à 375px requis.
