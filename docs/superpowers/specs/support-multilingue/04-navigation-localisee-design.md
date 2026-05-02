---
feature: "Feature 6 — Support multilingue (FR / EN)"
subproject: "APIs de navigation localisées"
goal: "Configurer les APIs de navigation localisées (Link, redirect, useRouter, usePathname) et remplacer les imports natifs Next.js dans les composants existants"
status: "implemented"
complexity: "S"
tdd_scope: "none"
depends_on: ["01-config-routing-types-design.md"]
date: "2026-04-16"
---

# APIs de navigation localisées

## Scope

Créer `src/i18n/navigation.ts` via `createNavigation(routing)` exportant `Link`, `redirect`, `useRouter`, `usePathname` et `getPathname`. Remplacer tous les imports de `next/link` et `next/navigation` dans les composants et pages par les versions localisées depuis `@/i18n/navigation`. Exclut le sélecteur de langue (sub-project `selecteur-langue`).

### État livré

À la fin de ce sub-project, on peut : naviguer entre les pages du site et constater que tous les liens internes préservent le préfixe locale (`/fr/...` ou `/en/...`) dans l'URL.

## Dependencies

- `01-config-routing-types-design.md` (statut: implemented), fournit `routing` pour `createNavigation`

## Files touched

- **À créer** : `src/i18n/navigation.ts`
- **À modifier** : tous les fichiers importants `Link` depuis `next/link` (remplacement par `@/i18n/navigation`)
- **À modifier** : tous les fichiers importants `useRouter`, `usePathname`, `redirect` depuis `next/navigation` (remplacement par `@/i18n/navigation`)

## Architecture approach

- `createNavigation(routing)` dans `src/i18n/navigation.ts` : génère des versions localisées de `Link`, `redirect`, `useRouter`, `usePathname`, `getPathname` qui injectent automatiquement le préfixe locale dans les URLs. Respect de `.claude/rules/next-intl/setup.md`
- Remplacement systématique des imports : `import Link from 'next/link'` → `import { Link } from '@/i18n/navigation'`, `import { useRouter } from 'next/navigation'` → `import { useRouter } from '@/i18n/navigation'`. Respect de `.claude/rules/typescript/conventions.md` (alias `@/*`)
- Les composants qui utilisent `Link` pour des liens externes (URLs absolues commençant par `http`) ne sont pas impactés : le `Link` localisé de next-intl gère uniquement les chemins internes
- `redirect` localisé : utilisé dans les Server Components et Server Actions pour rediriger en préservant la locale
- `getPathname` : version serveur de `usePathname`, utilisable dans les Server Components async

## Acceptance criteria

### Scénario 1 : Lien interne préserve la locale

**GIVEN** un visiteur sur `/fr/a-propos`
**WHEN** il clique sur un lien vers la page projets
**THEN** il est redirigé vers `/fr/projets` (la locale `/fr` est préservée)

### Scénario 2 : Navigation côté client préserve la locale

**GIVEN** un Client Component utilisant `useRouter` localisé
**WHEN** `router.push('/contact')` est appelé depuis `/en/a-propos`
**THEN** la navigation mène à `/en/contact`

### Scénario 3 : Aucun import next/link résiduel

**GIVEN** le codebase après les modifications
**WHEN** on recherche `from 'next/link'` ou `from "next/link"` dans `src/`
**THEN** aucun résultat n'est trouvé (sauf éventuellement dans `node_modules/`)
