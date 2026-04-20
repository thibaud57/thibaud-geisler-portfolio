---
title: "VERSIONS — Thibaud Geisler Portfolio"
description: "Matrice de compatibilité, versions recommandées et configuration pour la stack Next.js + Prisma + PostgreSQL du portfolio (MVP + post-MVP)."
date: "2026-04-13"
keywords: ["versions", "dependencies", "compatibility", "setup", "nextjs", "prisma", "postgresql", "docker", "dokploy"]
scope: ["docs", "config", "setup"]
technologies: ["Node.js", "pnpm", "TypeScript", "Next.js", "React", "Tailwind CSS", "shadcn/ui", "Magic UI", "Aceternity UI", "next-themes", "next-intl", "country-flag-icons", "Zod", "nodemailer", "Pino", "Vitest", "PostgreSQL", "Prisma", "pgvector", "Better Auth", "Docker", "Docker Compose", "Dokploy", "GitHub Actions", "Cloudflare R2", "n8n", "Umami"]
---

# Vue d'ensemble

## Runtime & Tooling

| # | Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|---|
| 1 | Node.js | `24.14.1` | ✅ LTS Active | Node 20 EOL le 30 avril 2026 — migrer en urgence |
| 2 | pnpm | `10.33.0` | ✅ | Lifecycle scripts désactivés par défaut en v10 |
| 3 | TypeScript | `6.0.2` | ✅ | `strict: true` et `module: esnext` par défaut |

## Framework & UI

| # | Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|---|
| 4 | Next.js | `16.2.4` | ✅ | Middleware renommé `proxy.ts`, Turbopack par défaut |
| 5 | React | `19.2.5` | ✅ | Bundlé avec Next.js 16, nombreuses APIs legacy retirées en v19 |
| 6 | Tailwind CSS | `4.2.2` | ✅ | CSS-first config, utilitaires renommés |
| 7 | shadcn/ui (CLI) | `shadcn@4.2.0` | ✅ | Composants copiés localement, style `new-york` |
| 8 | Magic UI | copy-paste (no semver) | ✅ | Installation via `shadcn@latest add` |
| 9 | Aceternity UI | copy-paste (no semver) | ✅ | Utilise `motion` (pas `framer-motion`) |
| 10 | next-themes | `0.4.6` | ✅ | Dark/light mode, `suppressHydrationWarning` requis |
| 11 | next-intl | `4.9.1` | ✅ | Nécessite Next.js >= 16.2 pour `use cache` |
| 12 | @icons-pack/react-simple-icons | `13.13.0` | ✅ | Logos techs/marques pour badges stack projets (DESIGN.md § Mapping Composants). Lucide (inclus shadcn) pour l'UI |
| 13 | country-flag-icons | `1.6.16` | ✅ | Drapeaux SVG pour LanguageSwitcher (ratio 3:2, compatible TS 6 via `typeof FR`) |

## Librairies applicatives

| # | Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|---|
| 14 | Zod | `4.3.6` | ✅ | Validateurs string déplacés en top-level |
| 15 | nodemailer | `8.0.5` | ✅ | CVE CRLF corrigée en 8.0.5 (obligatoire) |
| 16 | Pino | `10.3.1` | ⚠️ | `serverExternalPackages` requis dans `next.config.ts` |
| 17 | dotenv | `17.4.2` | ✅ | Chargement `.env` au runtime requis pour Prisma 7 (non auto-chargé depuis v7) |
| 18 | server-only | `0.0.1` | ✅ | Garde-fou : throw si import côté client (protège Pino, Prisma, secrets côté serveur) |

## Tests

| # | Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|---|
| 19 | Vitest | `4.1.4` | ✅ | Vite >= 6 + Node.js >= 20. Combo `@testing-library/react 16.x` |
| 20 | @vitejs/plugin-react | `6.0.1` | ✅ | Plugin officiel (doc Next 16 Vitest) — JSX transform (Babel, pas SWC) |
| 21 | vite-tsconfig-paths | `6.1.1` | ⚠️ | Résolution alias `@/*` depuis tsconfig.json. Peer dep `typescript@^5` mais fonctionne avec TS 6 |

## Base de données

| # | Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|---|
| 22 | PostgreSQL | `18.3` | ✅ | Checksums activés par défaut, volume Docker changé |
| 23 | Prisma ORM | `7.7.0` | ✅ | ESM-only, driver adapter obligatoire, `.env` non auto-chargé au runtime |
| 24 | pgvector | `0.8.2` | ✅ | **(post-MVP)** — CVE-2026-3172 corrigée en 0.8.2 |

## Auth (post-MVP)

| # | Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|---|
| 25 | Better Auth | `1.6.2` | ✅ | Charger `.env` explicitement côté runtime pour Prisma 7 (dotenv) |

## Infrastructure

| # | Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|---|
| 26 | Docker Engine | `29.4.0` | ✅ | containerd image store par défaut, ulimit réduit |
| 27 | Docker Compose | `v5.1.2` | ✅ | Numérotation v2 → v5 (saut direct), `version:` YAML ignoré |
| 28 | Dokploy | `0.28.8` | ✅ | Rollbacks registry-based (v0.26+), Traefik 3.5 interne |
| 29 | GitHub Actions (runner) | `ubuntu-24.04` | ✅ | Actions v6 (`checkout`, `setup-node`, `pnpm/action-setup`), `cache: 'pnpm'` explicite |
| 30 | Cloudflare R2 | managed service | ✅ | Backups pg_dump + assets, API S3-compatible |

## Services externes (post-MVP)

| # | Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|---|
| 31 | n8n (self-hosted) | `2.15.1` | ✅ | PostgreSQL obligatoire (MySQL supprimé) |
| 32 | Umami (self-hosted) | `3.0.3` | ✅ | PostgreSQL obligatoire (MySQL supprimé) |

---

# Détails par Technologie

## Runtime & Tooling

### 1. Node.js

**Version actuelle** : `24.14.1` (LTS Active — "Krypton")
**Stabilité** : ✅

**Breaking Changes Majeurs (v22 → v24)** :
- OpenSSL 3.5 : clés RSA/DSA < 2048 bits et ECC < 224 bits refusées, RC4 bloqué
- Support 32-bit Linux armv7 supprimé
- macOS minimum : 13.5
- `dirent.path` → `dirent.parentPath` (DEP0178 finalisée)
- `fs.F_OK` etc. doivent passer par `fs.constants.*` (DEP0176 finalisée)
- Erreurs stream/pipe silencieuses deviennent des exceptions
- V8 13.6 : C++20 potentiellement requis pour les addons natifs

**Nouvelles Features Pertinentes** :
- V8 13.6 : améliorations de perf ~30% sur cas réels
- `URLPattern` global sans import
- Undici v7 pour `fetch()` plus rapide
- npm v11 inclus

**Compatibilité Écosystème** :
- Next.js 16 : ✅
- Prisma 7 : ✅ (Node.js >= 20.19 requis)
- pnpm 10 : ✅
- Docker : ✅ (`node:24-alpine` ou `node:24-slim` si addons natifs)

**À noter** : Node.js 20 EOL le **30 avril 2026**. Node.js 22 est en Maintenance LTS.

**Recommandation** : ✅ Node.js 24 LTS. Éviter Node.js 20 (EOL imminent).

### 2. pnpm

**Version actuelle** : `10.33.0`
**Stabilité** : ✅

**Breaking Changes Majeurs (v9 → v10)** :
- Lifecycle scripts des dépendances désactivés par défaut (sécurité) → `allowBuilds` dans `pnpm-workspace.yaml` (package.json **silencieusement ignoré** en 10.33+, lister chaque package explicitement car wildcard `"*": true` non supporté — voir [issue #11171](https://github.com/pnpm/pnpm/issues/11171))
- `public-hoist-pattern` : rien hissé par défaut (eslint/prettier inclus)
- `pnpm link -g` supprimé → `pnpm self-update`
- v10.33 : `onlyBuiltDependencies`, `neverBuiltDependencies` supprimés → remplacés par `allowBuilds` (map pattern → boolean)
- Hashing migré vers SHA256 (lockfile, peer deps)

**Nouvelles Features Pertinentes** :
- `dedupePeers` : réduit la duplication des peer deps
- `trustPolicy` / `minimumReleaseAge` : protection supply chain
- Node.js runtime auto-install via `engines.runtime`

**Compatibilité Écosystème** :
- Next.js : ✅
- TypeScript : ⚠️ ne pas activer `preserveSymlinks: true` (résolution des types cassée)
- Node.js : version minimale 18.12 (pnpm v11 abandonnera les versions < Node 22)

**Issues connues** :
- ~1-2% des packages supposent un `node_modules` plat (utiliser `public-hoist-pattern` si besoin)

**Recommandation** : ✅ pnpm 10.33.0 (ADR-008 — package manager du projet).

### 3. TypeScript

**Version actuelle** : `6.0.2`
**Stabilité** : ✅

**Breaking Changes Majeurs (v5 → v6)** :
- `strict: true` par **défaut** (ne pas le forcer à `false`)
- `module` passe à `esnext` par défaut (plus `commonjs`) — peut casser les projets CJS
- `target` passe à `es2025` par défaut
- `--moduleResolution node` (node10) déprécié → `bundler` ou `nodenext`
- `--moduleResolution classic` supprimé
- `--outFile` supprimé (utiliser un bundler externe)
- `esModuleInterop` toujours `true`
- `namespace Foo {}` obligatoire (plus `module Foo {}`)

**Nouvelles Features Pertinentes** :
- Flag `--stableTypeOrdering` aligné sur TypeScript 7.0
- Support `es2025` avec `RegExp.escape()`
- Types pour l'API Temporal (Stage 4)
- `getOrInsert()` / `getOrInsertComputed()` sur `Map`/`WeakMap`

**Compatibilité Écosystème** :
- Next.js 16 : ✅ (TypeScript >= 5.1 requis)
- Prisma 7 : ✅ (TypeScript >= 5.4 requis, config `moduleResolution: "bundler"`)
- Zod 4 : ✅ (TypeScript >= 5.5 requis, `strict: true` obligatoire)

**Config requise pour Prisma 7** :
```json
{
  "module": "ESNext",
  "moduleResolution": "bundler"
}
```

**Recommandation** : ✅ TypeScript 6.0.2. Vérifier les imports CJS à la migration.

## Framework & UI

### 4. Next.js

**Version actuelle** : `16.2.4`
**Stabilité** : ✅

**Breaking Changes Majeurs (v15 → v16)** :
- **Async Request APIs** : accès synchrone à `cookies()`, `headers()`, `params`, `searchParams` supprimé — tout est `async`/`await`
- **`middleware.ts` → `proxy.ts`** : fichier renommé, fonction exportée renommée `proxy`, runtime `edge` non supporté (uniquement `nodejs`)
- **Turbopack par défaut pour `next dev` ET `next build`** (stable depuis Next 16.0 pour le build de production, opt-out via `--webpack` si besoin)
- **`revalidateTag`** : 2e argument requis, nouvelle API `updateTag`
- **`next lint` supprimé** : appeler ESLint directement
- **`serverRuntimeConfig` / `publicRuntimeConfig` supprimés** → `process.env`
- **AMP entièrement retiré**
- **`next/image`** : `minimumCacheTTL` passe de 60s à 4h, `images.domains` déprécié (utiliser `remotePatterns`)
- **Node.js minimum : 20.9.0**, TypeScript minimum : 5.1.0

**Nouvelles Features Pertinentes** :
- React 19.2 intégré : View Transitions, `useEffectEvent`
- React Compiler stable (opt-in via `reactCompiler: true`)
- `updateTag`, `refresh`, `cacheLife`/`cacheTag` stables
- `next typegen` pour générer `PageProps`, `LayoutProps`, `RouteContext`

**Compatibilité Écosystème** :
- React 19.2 : ✅ (inclus)
- shadcn/ui : ✅
- next-intl : ✅ (>= 4.4 requis, 4.9.1 recommandé)
- Prisma 7 : ⚠️ (setup standard fonctionne en dev, mais issue WASM active avec Turbopack build — voir Issues connues section 17)
- Pino : ⚠️ `serverExternalPackages` obligatoire

**Recommandation** : ✅ Next.js 16.2.4. Suivre le guide officiel Prisma + Next.js pour la config client/adapter.

### 5. React

**Version actuelle** : `19.2.5` (8 avril 2026, bundlé avec Next.js 16)
**Stabilité** : ✅

**Breaking Changes Majeurs (v18 → v19)** :
- **APIs supprimées définitivement** : `ReactDOM.render` → `createRoot`, `ReactDOM.hydrate` → `hydrateRoot`, `ReactDOM.unmountComponentAtNode` → `root.unmount()`, `ReactDOM.findDOMNode`, `React.createFactory`
- **`propTypes` et `defaultProps`** sur les function components : retirés définitivement
- **String refs** (`this.refs.input`) : retirées
- **Legacy Context API** (`contextTypes`, `getChildContext`) : retirée
- **`useFormState`** (ReactDOM) → renommé `useActionState` (React)
- **`<Context.Provider>`** déprécié → utiliser `<Context>` directement
- **`forwardRef`** : **déprécié** (fonctionne encore) — `ref` est désormais une prop normale des function components. `element.ref` aussi déprécié → utiliser `element.props.ref`
- **`useRef()`** sans argument : interdit en TypeScript (doit être `useRef(null)`)
- **`ReactElement` props** : type par défaut passe de `any` à `unknown`
- **Erreurs de rendu** : ne sont plus re-throw, rapportées via `window.reportError` / `console.error`
- **Builds UMD** supprimés (utiliser `esm.sh`)
- **URLs `javascript:`** dans `src`/`href` : erreur désormais
- **`react-dom/test-utils`** : `act` déplacé dans `react`, le reste supprimé

**Nouvelles Features Pertinentes** :
- **v19.0** — **Actions / async transitions** : support des fonctions `async` dans `startTransition` avec gestion automatique pending/erreurs/reset
- **v19.0** — `useActionState`, `useOptimistic`, `useFormStatus`
- **v19.0** — `use()` : lire une Promise ou un contexte directement dans le rendu (avec Suspense)
- **v19.0** — Métadonnées document dans les composants (`<title>`, `<meta>`, `<link>` hoistés vers `<head>`)
- **v19.0** — APIs de préchargement : `preload`, `preinit`, `prefetchDNS`, `preconnect`
- **v19.0** — Support des Custom Elements, stylesheets avec `precedence`, scripts async dédupliqués
- **v19.2** — `useEffectEvent` stable (extraire la logique "événement" d'un `useEffect` sans polluer les deps)
- **v19.2** — `Activity` component stable (mode `visible`/`hidden` pour pré-rendre ou sauvegarder l'état de routes cachées)
- **v19.2** — `cacheSignal` (Server Components uniquement)
- **v19.2** — Performance Tracks (pistes custom Chrome DevTools : Scheduler, Components)
- **v19.2** — Partial Pre-rendering stable : `prerender()`, `resume()`, `resumeAndPrerender()`

**À noter** :
- **`<ViewTransition>`** : **uniquement en Canary/Experimental** en 19.2 stable, pas encore GA

**Compatibilité Écosystème** :
- Next.js 16 : ✅ (installé automatiquement)
- shadcn/ui : ✅ (composants mis à jour, `forwardRef` retiré)
- Magic UI / Aceternity UI : ✅
- `eslint-plugin-react-hooks` v6 requis pour le lint `useEffectEvent`

**Recommandation** : ✅ Ne pas installer React manuellement — laisser Next.js gérer la version.

### 6. Tailwind CSS

**Version actuelle** : `4.2.2`
**Stabilité** : ✅

**Breaking Changes Majeurs (v3 → v4)** :
- **CSS-first config** : `tailwind.config.js` remplacé par `@theme` dans le fichier CSS, détection de contenu automatique (plus de `content: []`)
- **Import** : `@tailwind base/components/utilities` → `@import "tailwindcss"`
- **Plugin PostCSS** : `tailwindcss` → `@tailwindcss/postcss`
- **Utilitaires renommés** : `shadow-sm` → `shadow-xs`, `blur-sm` → `blur-xs`, `rounded-sm` → `rounded-xs`, `outline-none` → `outline-hidden`, `ring` (3px) → `ring-3`
- **`bg-gradient-to-*`** → `bg-linear-to-*`
- **Important suffix** : `!flex` → `flex!`
- **Ordre des variants empilés** : gauche-à-droite (au lieu de droite-à-gauche)
- **Couleurs** : OKLCH (au lieu de HSL), `tailwindcss-animate` → `tw-animate-css`
- **Sass/Less/Stylus** : incompatibles
- **Browser minimum** : Chrome 111, Safari 16.4, Firefox 128

**Nouvelles Features Pertinentes** :
- Moteur Oxide (Rust) : builds jusqu'à 5x plus rapides
- 4 nouvelles palettes : mauve, olive, mist, taupe
- Utilitaires de propriétés logiques (padding, margin, border, inset)
- Plugin `@tailwindcss/webpack`

**Compatibilité Écosystème** :
- Next.js 16 : ✅
- shadcn/ui : ✅ (mis à jour pour Tailwind v4, `new-york` par défaut)
- Magic UI : ✅ (Tailwind v4 par défaut depuis avril 2025)
- Aceternity UI : ✅ (Tailwind v4 standard documenté)

**Recommandation** : ✅ Tailwind CSS 4.2.2 avec `@tailwindcss/postcss`.

### 7. shadcn/ui

**Version actuelle** : `shadcn@4.2.0` (CLI)
**Stabilité** : ✅

shadcn/ui n'est pas une lib npm classique — les composants sont copiés localement dans le projet.

**Breaking Changes Majeurs** :
- Style par défaut : **new-york** (ancien style "default" déprécié)
- Composants mis à jour pour React 19 (`forwardRef` retiré)
- Couleurs en OKLCH (à la place de HSL)
- `tailwindcss-animate` remplacé par `tw-animate-css`

**Nouvelles Features Pertinentes** :
- CLI v4 (mars 2026) : flags `--dry-run`, `--diff`, `--view`, `shadcn init --template`, `shadcn info`, `shadcn docs`
- Système de presets partageables + `shadcn apply`
- `shadcn init --base` : choix Radix ou Base UI
- Support namespaces (ex: `@aceternity/hero-highlight`)

**Compatibilité Écosystème** :
- React 19 : ✅
- Tailwind CSS 4 : ✅ (nouveau défaut)
- Next.js 16 : ✅
- Magic UI / Aceternity UI : ✅ (via le CLI shadcn)

**Commande d'init** :
```bash
pnpm dlx shadcn@latest init
```

**Recommandation** : ✅ Utiliser `shadcn@latest`. Ne pas installer `shadcn-ui` (package npm déprécié).

### 8. Magic UI

**Version actuelle** : pas de versioning sémantique (modèle copy-paste via registry shadcn)
**Stabilité** : ✅ actif et maintenu

**Breaking Changes Majeurs** :
- Tailwind v4 + React 19 par défaut depuis avril 2025 — `tailwind.config.ts` n'est plus requis
- Site `v3.magicui.design` conserve la variante Tailwind v3 pour l'ancienne méthode

**Nouvelles Features Pertinentes** :
- Support CLI v4 shadcn
- Package `@magicuidesign/mcp` pour intégration agents IA

**Compatibilité Écosystème** :
- shadcn CLI : ✅ (ajout via `shadcn@latest add`)
- Tailwind CSS 4 : ✅
- React 19 : ✅

**Issues connues** :
- shadcn CLI > 2.8.0 peut générer des imports sans alias `@/` dans certains composants Magic UI → vérifier/ajuster les imports après ajout
- Package npm `magicui-cli` abandonné — ne pas l'utiliser

**Installation** :
```bash
pnpm dlx shadcn@latest add "https://magicui.design/r/<component>.json"
```

**Recommandation** : ✅ Ajouter via `shadcn@latest`, vérifier les chemins d'import après installation.

### 9. Aceternity UI

**Version actuelle** : pas de versioning sémantique (copy-paste via registry shadcn)
**Stabilité** : ✅ actif (dernière mise à jour changelog : 10 avril 2026)

**Breaking Changes Majeurs** :
- **Framer Motion → Motion** : Aceternity utilise désormais le package `motion` (v12+), imports via `motion/react`. **Ne pas installer `framer-motion` séparément**
- Tailwind CSS 4.0 est le standard documenté (ancien standard Tailwind v3 déprécié)
- Support shadcn CLI 3.0+ (`@aceternity/<component>`)

**Nouvelles Features Pertinentes** :
- Webcam Pixel Grid component (janvier 2026)
- Bento Grid with Skeletons (octobre 2025)
- WebGL shaders, 3D transforms, canvas-based animations
- Commandes de discovery CLI : `view @aceternity`, `search @aceternity`, `list @aceternity`
- Templates gratuits : Minimalist Portfolio, Simplistic SaaS

**Compatibilité Écosystème** :
- React 19 : ✅ via `motion` v12+ (non compatible avec `framer-motion` classique sans overrides)
- Tailwind CSS 4 : ✅
- Next.js 15/16 : ✅
- shadcn CLI : ✅

**Issues connues** :
- Package npm `aceternity-ui` (v0.2.2) abandonné — ne pas l'utiliser

**Installation** :
```bash
# Syntaxe namespacée (shadcn CLI 3.0+)
pnpm dlx shadcn@latest add @aceternity/<component>

# Ou URL directe (syntaxe historique)
pnpm dlx shadcn@latest add "https://ui.aceternity.com/registry/<component>.json"
```

**Recommandation** : ✅ Installer `motion` v12+ (pas framer-motion). Utiliser la syntaxe namespacée.

### 10. next-themes

**Version actuelle** : `0.4.6`
**Stabilité** : ✅

**Breaking Changes Majeurs (v0.2 → v0.4)** :
- v0.4.0 : support React 19, `children` rendu optionnel dans `ThemeProvider`
- v0.3.0 : directive `"use client"` ajoutée (plus besoin de wrapper)
- v0.2.0 : passage de `next/script` vers une balise `<script>` standard (retrait de la dépendance `next/script`)

**Nouvelles Features Pertinentes** :
- v0.4.6 : correction null check dans `updateDOM` (prévention flashing)
- v0.4.5 : pré-setting de `resolvedTheme` (moins de renders)
- v0.4.1 : prop `scriptProps` (contourne Cloudflare Rocket Loader)

**Compatibilité Écosystème** :
- React 18/19 : ✅
- Next.js 15/16 : ✅
- TypeScript : ✅ (types ré-exportés depuis v0.4.2)

**Issues connues** :
- `useTheme().theme` toujours `undefined` côté serveur — retarder l'UI théme-dépendante avec `isMounted`
- `suppressHydrationWarning` **obligatoire** sur `<html>`
- Projet peu maintenu (≈1 release/an, mais stable)

**Setup minimal** :
```tsx
// app/layout.tsx
<html lang="fr" suppressHydrationWarning>
  <body>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  </body>
</html>
```

**Recommandation** : ✅ next-themes 0.4.6.

### 11. next-intl

**Version actuelle** : `4.9.1`
**Stabilité** : ✅

**Breaking Changes Majeurs (v3 → v4)** :
- Distribution **ESM-only** (sauf `next-intl/plugin`)
- React 17 minimum, TypeScript 5 minimum
- `localeDetection: false` → `localeCookie: false`
- Configuration `domains` plus stricte
- `NextIntlClientProvider` obligatoire pour tous les Client Components
- `getRequestConfig` : argument `locale` déprécié → `await requestLocale`
- Cookies de locale : expiration par session par défaut

**Nouvelles Features Pertinentes** :
- Locales strictement typées (via `AppConfig`)
- Arguments ICU typés avec autocomplétion IDE
- Utilitaire `hasLocale()` pour narrower un string
- Compatibilité `use cache`, `dynamicIO`, `rootParams`

**Compatibilité Écosystème** :
- Next.js 15.x : ✅
- Next.js 16.x : ✅ (conçu pour PPR, `use cache`, rootParams)
- TypeScript 5+ : ✅

**Issue** :
- Next.js 16.0/16.1 : `getTranslations()` incompatible avec `use cache`. **Résolu sur Next.js >= 16.2** (root params API)

**Recommandation** : ✅ next-intl 4.9.1 avec Next.js 16.2+.

## Librairies applicatives

### 13. Zod

**Version actuelle** : `4.3.6`
**Stabilité** : ✅

**Breaking Changes Majeurs (v3 → v4)** :
- **Validateurs string déplacés en top-level** : `.email()`, `.uuid()`, `.url()` → `z.email()`, `z.uuid()`
- `z.uuid()` enforce RFC 9562 — utiliser `z.guid()` pour l'ancien comportement
- Erreurs : `message`, `invalid_type_error`, `required_error` → `error` unique
- `.strict()`, `.passthrough()`, `.strip()`, `.merge()` sur les objets dépréciés → `z.strictObject()`, `z.looseObject()`, `.extend()`
- Les infinis ne sont plus des nombres valides
- `z.nativeEnum()` déprécié → `z.enum()` surchargé
- `.ip()` séparé en `.ipv4()` et `.ipv6()`

**Nouvelles Features Pertinentes** :
- Parsing 14x plus rapide (strings), 7x (arrays), 6.5x (objets)
- Bundle core réduit de ~57%, Zod Mini -85%
- Compilation TS jusqu'à 100x plus rapide
- Schema `z.file()` pour la validation de fichiers
- Système de metadata registry
- Conversion JSON Schema first-party

**Compatibilité Écosystème** :
- TypeScript 5.5+ : ✅ (`strict: true` obligatoire)
- Next.js Server Actions : ✅
- React : ✅

**Recommandation** : ✅ Zod 4.3.6. Vérifier les usages de `.email()`, `.uuid()` lors de la migration depuis v3.

### 14. nodemailer

**Version actuelle** : `8.0.5`
**Stabilité** : ✅

**Breaking Changes Majeurs (v7 → v8)** :
- Code d'erreur `NoAuth` renommé `ENOAUTH`

**Sécurité** :
- **GHSA-vvjj-xcjg-gr5g** : vulnérabilité CRLF injection corrigée en **8.0.5**. Toute version < 8.0.5 est exposée.

**Nouvelles Features Pertinentes** :
- v8.0.5 : décodage UTF-8 des réponses SMTP à la limite de ligne
- v8.0.4 : sanitisation de la taille d'enveloppe (prévention injection SMTP)
- v7.0.12 : support REQUIRETLS

**Compatibilité Écosystème** :
- Node.js >= 20 : ✅ (compatible depuis v6.0.0 minimum)
- TypeScript : ✅ via `@types/nodemailer@8.0.0` (`esModuleInterop: true` requis)
- SMTP IONOS : ✅ (STARTTLS/TLS/SMTPS)

**Recommandation** : ✅ nodemailer >= **8.0.5 obligatoire** (sécurité).

### 15. Pino

**Version actuelle** : `10.3.1`
**Stabilité** : ⚠️ (setup Next.js spécifique)

**Breaking Changes Majeurs (v9 → v10)** :
- **Unique breaking change** : drop du support Node.js 18 (confirmé par le mainteneur mcollina, issue #2317). Pas de refonte d'API.

**Nouvelles Features Pertinentes** :
- v10.0.0 : nouveau type TypeScript `LogFnFields` (PR #2254)
- v10.1.0 : intégration du package `@pinojs/redact`, signature de `censor` modifiée pour un typage plus sûr
- v10.1.1 : `reportCaller` ajouté à l'implémentation browser, support `%o` pour string/number/null
- v10.3.0 : nommage des worker threads de transport, meilleur return type pour `multistream().clone()`
- v10.3.1 : fix memory leak transport avec `--import preload` (sanitisation `NODE_OPTIONS`)
- Validation documentaire : type stripping Node.js 22.6+ fonctionne avec les transports Pino existants (PR #2347, pas de code modifié)

**Compatibilité Écosystème** :
- Node.js 20/22+ : ✅
- TypeScript : ✅ (types plus stricts en v10)
- Next.js App Router : ⚠️ bundling à contourner

**Issue — Next.js App Router** :
Next.js tente de bundler Pino incorrectement. Solution dans `next.config.ts` :

```ts
serverExternalPackages: ['pino', 'pino-pretty']
```

**Recommandation** : ⚠️ Pino 10.3.1 avec `serverExternalPackages` **obligatoire**.

## Tests

### 16. Vitest

**Version actuelle** : `4.1.4`
**Stabilité** : ✅

**Breaking Changes Majeurs (v3 → v4)** :
- Vite >= 6.0.0 et Node.js >= 20 requis
- `maxThreads`/`maxForks` → `maxWorkers`
- `coverage.include` obligatoire pour cibler des fichiers
- Option `workspace` → `projects`
- Reporter `basic` supprimé (remplacer par `default` + `summary: false`)
- Exclusions par défaut : seuls `node_modules` et `.git`

**Nouvelles Features Pertinentes** :
- Visual regression testing (`toMatchScreenshot`)
- Test tags (organisation + filtrage `and`/`or`/`not`)
- Hooks `aroundEach`/`aroundAll`
- Reporter `agent` optimisé pour LLMs
- Support Vite 8

**Compatibilité Écosystème** :
- `@testing-library/react 16.x` : ✅ (combo officiel)
- `@testing-library/jest-dom`, `@testing-library/user-event` : ✅
- TypeScript : ✅ (support natif via Vite/Oxc)
- Next.js : ✅ — **limitation** : les async Server Components ne sont pas testables en unit tests (passer en E2E via Playwright)

**Setup minimal** :
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Recommandation** : ✅ Vitest 4.1.4, `environment: 'jsdom'` pour les composants React.

## Base de données

### 17. PostgreSQL

**Version actuelle** : `18.3`
**Stabilité** : ✅

**Breaking Changes Majeurs (v17 → v18)** :
- Data checksums activés par défaut dans `initdb`
- Colonnes `GENERATED` sont `VIRTUAL` par défaut (spécifier `STORED` si besoin)
- `VACUUM`/`ANALYZE` traitent les tables partitionnées enfants automatiquement
- MD5 pour l'authentification déprécié (migrer vers SCRAM)
- Full text search : réindexer FTS et pg_trgm après upgrade
- `COPY FROM` ne traite plus `\.` comme EOF en mode CSV

**Breaking change Docker** :
- `PGDATA` version-spécifique pour PG18+ : `/var/lib/postgresql/18/docker`
- `VOLUME` déclaré : `/var/lib/postgresql` (au lieu de `/var/lib/postgresql/data`)

**Nouvelles Features Pertinentes** :
- `pg_upgrade` préserve les statistiques de l'optimiseur
- Colonnes `GENERATED VIRTUAL`
- `VACUUM ONLY` / `ANALYZE ONLY`

**Compatibilité Écosystème** :
- Prisma 7 : ✅ (support officiel depuis Prisma 7.2.0+)
- pgvector 0.8.2 : ✅ (post-MVP)
- Docker : ✅ (`postgres:18`, `postgres:18-alpine`, `postgres:18.3`)
- n8n 2.15 : ⚠️ doc officielle limite à PG 17 (non testé sur PG 18)
- Umami 3 : ⚠️ issue #3888 ouverte avec PG 17.6 (vérifier PG 18)

**Recommandation** : ✅ PostgreSQL 18.3. Vérifier le chemin du volume Docker.

### 18. Prisma ORM

**Version actuelle** : `7.7.0`
**Stabilité** : ✅

**Breaking Changes Majeurs (v6 → v7)** :
- **ESM-only** : `"type": "module"` requis dans `package.json`
- **Provider renommé** : `prisma-client-js` → `prisma-client` dans le `generator`
- **Output obligatoire** : champ `output` requis dans le `generator`
- **Driver adapter obligatoire** : `@prisma/adapter-pg` pour PostgreSQL
- **`prisma.config.ts`** : fichier centralisé, `url` dans `schema.prisma` déprécié
- **`.env` non chargé automatiquement** : dotenv explicite ou via `prisma.config.ts`
- **`prisma migrate dev`** ne lance plus `prisma generate` automatiquement
- **Seeding automatique supprimé** : lancer `pnpm prisma db seed` explicitement
- **API `$use()` supprimée** → `$extends()`
- **Node.js minimum : 20.19.0**, TypeScript minimum : 5.4.0

**Nouvelles Features Pertinentes** :
- Client Rust-free : bundle ~90% plus petit, queries ~3x plus rapides, perf TS ~70% plus rapide
- Génération dans le code source (plus dans `node_modules`)
- `prisma.config.ts` centralisé
- `prisma bootstrap` : setup interactif Prisma Postgres (v7.7.0)
- Nested transaction rollbacks via savepoints (v7.5.0)

**Compatibilité Écosystème** :
- PostgreSQL 18 : ✅ (support officiel depuis 7.2.0)
- Next.js 16 : ✅ (setup standard, starter officiel `prisma/nextjs-auth-starter` valide la combo)
- TypeScript 5.4+ : ✅ (`moduleResolution: bundler` requis)
- Node.js 20.19+/22+/24+ : ✅
- Better Auth : ✅ (charger `.env` explicitement au runtime, voir section Better Auth)

**Issues connues & gotchas** :
- **`.env` non chargé automatiquement au runtime** : Prisma 7 a supprimé le chargement auto. Charger via `dotenv.config()` ou centraliser dans `prisma.config.ts`. Cause de l'erreur P1010 si oublié.
- **Turbopack build + Prisma 7 WASM** : Turbopack est le bundler **par défaut** de `next build` en Next 16 (plus Webpack). Issue active : la résolution du module WASM `query_compiler_fast_bg.postgresql.mjs` échoue en build Turbopack avec le provider `prisma-client` v7. **Workaround** : opt-out via `next build --webpack` dans le Dockerfile/CI jusqu'à correction upstream. Surveiller l'état de l'issue avant chaque upgrade.
- **CI/CD avec build séparé du déploiement** (issue #29025) : si tu buildes en CI puis déploies les artifacts ailleurs en relançant `prisma generate`, hash mismatch possible. Workaround : `transpilePackages: ['@prisma/client', '@prisma/adapter-pg', 'pg']` dans `next.config.ts`. **Dokploy build directement sur le serveur**, donc non concerné.
- **Server Components** : après upgrade v6→v7, ajouter `await connection()` dans les pages utilisant Prisma
- **`postinstall: "prisma generate"`** obligatoire dans `package.json` (convention standard Prisma)

**Recommandation** : ✅ Prisma 7.7.0 avec le guide officiel `prisma/nextjs-auth-starter`. **Ne pas upgrader Prisma et Next.js simultanément** (règle PRODUCTION.md).

### 19. pgvector (post-MVP)

**Version actuelle** : `0.8.2`
**Stabilité** : ✅

**Breaking Changes Majeurs** :
- v0.8.0 : abandon du support PostgreSQL 12 (support maintenu pour PG 13+)

**Sécurité** :
- **CVE-2026-3172** : buffer overflow dans les builds HNSW parallèles, corrigé en **0.8.2**

**Nouvelles Features Pertinentes** :
- v0.8.2 : correctif EXPLAIN pour PostgreSQL 18
- v0.8.1 : compatibilité PostgreSQL 18 RC1, accélération `binary_quantize`
- v0.8.0 : iterative index scan, meilleures performances HNSW

**Compatibilité Écosystème** :
- PostgreSQL 18 : ✅ (depuis 0.8.1)
- Prisma 7 : ⚠️ support partiel — `Unsupported("vector")` + migrations SQL manuelles (`CREATE EXTENSION IF NOT EXISTS vector`) + TypedSQL pour les queries. Pas de support natif GA.
- Docker : ✅ image `pgvector/pgvector:pg18`

**Recommandation** : ✅ pgvector 0.8.2 au moment de l'activation du chatbot RAG.

## Auth (post-MVP)

### 20. Better Auth

**Version actuelle** : `1.6.2`
**Stabilité** : ✅

**Breaking Changes Majeurs (v1.5 → v1.6)** :
- `freshAge` basé sur `createdAt` au lieu de `updatedAt`
- Validation `InResponseTo` activée par défaut (SAML)
- Package `@better-auth/api-key` extrait en package séparé
- Types `InferUser` et `InferSession` supprimés
- Hooks "after" DB s'exécutent post-transaction

**Nouvelles Features Pertinentes** :
- OpenTelemetry : distributed tracing sur endpoints/hooks/DB
- Passkey pre-auth registration
- Case-insensitive queries (`mode: 'insensitive'`)
- Hachage scrypt non-bloquant
- Joins natifs Prisma adapter (`experimental.joins: true`)
- Package size réduit de 46%

**Compatibilité Écosystème** :
- Next.js 15 : ✅
- Next.js 16 : ✅ (workaround `use cache` + `getServerSession` : extraire les cookies avant le scope cache et les passer en argument — Issue #5584 fermée NOT_PLANNED, c'est une contrainte Next.js pas un bug Better Auth)
- PostgreSQL : ✅
- Prisma v7 + `@prisma/adapter-pg` : ✅ à condition de **charger `.env` explicitement au runtime** (`dotenv.config()` ou via `prisma.config.ts`). L'erreur P1010 "User was denied access" vient d'une `DATABASE_URL` manquante, pas d'un bug Prisma 7
- Google OAuth : ✅ (provider built-in)

**Gotcha `.env` Prisma 7** :
```ts
// src/lib/prisma.ts
import 'dotenv/config'  // ← obligatoire en Prisma 7 au runtime
import { PrismaClient } from '@/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
export const prisma = new PrismaClient({ adapter })
```

**Recommandation** : ✅ Better Auth 1.6.2 utilisable dès l'implémentation du dashboard post-MVP. Suivre le guide officiel [Prisma + Better Auth + Next.js](https://www.prisma.io/docs/guides/authentication/better-auth/nextjs).

## Infrastructure

### 21. Docker Engine

**Version actuelle** : `29.4.0`
**Stabilité** : ✅

**Breaking Changes Majeurs (v28 → v29)** :
- API minimale v1.44 : clients Docker < v25 incompatibles avec le daemon
- **containerd image store** par défaut sur les nouvelles installations
- Suppression des chaînes iptables `DOCKER-ISOLATION-STAGE-1/2`
- Backend nftables expérimental disponible
- ulimit open files : `1048576` → `1024` par défaut
- Docker Content Trust (DCT) retiré du CLI (plugin séparé)
- cgroup v1 déprécié (support jusqu'à mai 2029 minimum)
- Packages Raspbian 32-bit abandonnés

**Nouvelles Features Pertinentes** :
- Nouveau champ `health status` dans les réponses API
- HTTP keep-alive pour les connexions aux registres
- Amélioration de la fiabilité des overlay networks

**Compatibilité Écosystème** :
- PostgreSQL : ✅
- Node.js : ✅ (images officielles `node:24-alpine` à jour)
- Dokploy : ✅ (vérifier que Dokploy est à jour avant upgrade Docker 29)

**Recommandation** : ✅ Docker Engine 29.4.0.

### 22. Docker Compose

**Version actuelle** : `v5.1.2`
**Stabilité** : ✅

**Breaking Changes Majeurs (v2 → v5)** :
- **Docker Compose v1** (`docker-compose`) entièrement supprimé depuis avril 2025 — utiliser `docker compose` (plugin CLI)
- **Build délégué à Docker Bake** (v5.0) : le builder interne est retiré
- **Champ `version:` dans le YAML** désormais ignoré
- **Numérotation v2 → v5** : saut direct pour éviter la confusion avec les formats de fichier v2/v3

**Nouvelles Features Pertinentes** :
- SDK Go officiel pour les intégrations tierces
- Compose Specification v5.0.0

**Compatibilité Écosystème** :
- PostgreSQL : ✅
- Node.js : ✅
- Dokploy : ✅ (utilise Docker Compose pour les déploiements)

**Recommandation** : ✅ Docker Compose v5.1.2, syntaxe `docker compose` obligatoire.

### 23. Dokploy

**Version actuelle** : `0.28.8`
**Stabilité** : ✅

**Breaking Changes Majeurs** :
- v0.26.0 : **rollbacks registry-based uniquement** — un registre externe (Docker Hub, Quay.io, etc.) est obligatoire pour la fonctionnalité de rollback
- v0.26.6 : script de sécurité obligatoire à exécuter **avant tout upgrade vers v0.28.x** (sinon mismatch mot de passe PostgreSQL au démarrage)
- v0.25.0 : Traefik interne upgradé à **v3.5.0** (la mise à jour n'est PAS automatique à l'upgrade Dokploy)
- v0.28.6 → v0.28.8 : fix du bug healthcheck Docker au démarrage (PR #4167)

**Nouvelles Features Pertinentes** :
- Environments multi-environnements par projet (v0.25)
- Custom build servers, multi-admin (v0.26)
- Railpack (successeur Nixpacks) comme build type
- Notifications Microsoft Teams (v0.28)
- Patches fonctionnality, Node.js 24.4.0 (v0.28.0)

**Compatibilité Écosystème** :
- Docker : ✅ (natif)
- Docker Compose : ✅ (syntaxe `docker compose`)
- Traefik 3.5 : ✅ (bundlé, upgrade manuel)
- Nixpacks / Railpack : ✅

**Issues connues** :
- Auto-update via l'UI parfois défaillant → préférer `curl -sSL https://dokploy.com/install.sh | sh -s update`
- Upgrade depuis v0.25 vers v0.28.x sans script de sécurité → mismatch mot de passe PostgreSQL

**Recommandation** : ✅ Dokploy 0.28.8. Exécuter le script de sécurité v0.26.6 si migration depuis v0.25.

### 24. GitHub Actions

**Version actuelle** : `ubuntu-24.04` (runner Noble Numbat)
**Actions officielles** : `actions/checkout@v6.0.2`, `actions/setup-node@v6.3.0`, `pnpm/action-setup@v6.0.0`
**Stabilité** : ✅

**Breaking Changes Majeurs** :
- **Runner Ubuntu** :
  - `ubuntu-latest` repointé sur `ubuntu-24.04` le **17 janvier 2025** (rollout initié le 5 décembre 2024)
  - `ubuntu-20.04` retiré définitivement le **15 avril 2025** — toute référence à ce label échoue
  - Différences de packages pré-installés sur ubuntu-24.04 vs 22.04 (certains outils retirés pour respecter le SLA de disk space)
- **actions/setup-node v5 → v6** : **cache automatique retiré pour pnpm/yarn** — le cache auto est désormais limité à npm uniquement. Pour pnpm, ajouter `cache: 'pnpm'` explicitement. Source : [PR #1374](https://github.com/actions/setup-node/pull/1374). Retrait aussi de `always-auth`. Runtime Node 20 → Node 24
- **actions/checkout v5 → v6** : credentials ne sont plus écrits inline dans `.git/config`, stockés dans un fichier séparé (impact potentiel sur les outils qui lisent `.git/config` directement)
- **pnpm/action-setup v3 → v4** : erreur levée si la version `packageManager` du `package.json` contredit celle spécifiée dans l'action (avant : conflit ignoré silencieusement)
- **Immutable Actions (février 2025)** : nouveaux domaines à autoriser pour les self-hosted runners (`pkg.actions.githubusercontent.com`, `ghcr.io`)

**Nouvelles Features Pertinentes** :
- **actions/setup-node v6.3.0** : support du champ `devEngines.runtime` dans `package.json` (prioritaire sur `engines.node`)
- **actions/checkout v6** : support des git worktrees avec `persist-credentials` + `includeIf`, correction du comportement `fetch-tags` sur les tags annotés
- **pnpm/action-setup v6** : support pnpm v11
- **ubuntu-24.04** : Node.js 24.14.1 disponible en cache natif sur le runner (versions cachées : 20.20.2, 22.22.2, 24.14.1)

**Compatibilité Écosystème** :
- Node.js 24 : ✅ via `actions/setup-node@v6` (nécessite override car défaut ubuntu-latest = Node 20)
- pnpm 10.33 : ✅ via `pnpm/action-setup@v6` + `cache: 'pnpm'` explicite dans setup-node
- PostgreSQL 18 : ✅ via service container (image Docker `postgres:18`)

**Points d'attention** :
- `ubuntu-latest` pointe actuellement sur `ubuntu-24.04` mais peut basculer sans préavis — **épingler explicitement la version**
- Node 24 **pas défaut** sur ubuntu-24.04 : Node 20.20.2 est le défaut au lancement du runner (issue ouverte GitHub), utiliser `setup-node@v6` avec `node-version: 24`
- Node.js 20 EOL sur runner le 30 avril 2026

**Recommandation** : ✅ Épingler `ubuntu-24.04` + `actions/checkout@v6` + `actions/setup-node@v6` + `pnpm/action-setup@v6`, avec `cache: 'pnpm'` explicite.

### 25. Cloudflare R2

**Version actuelle** : managed service (API S3-compatible, pas de versioning sémantique)
**Stabilité** : ✅

**Breaking Changes Majeurs (API S3-compatible)** :
- 2023-06-21 : les ETags multipart sont désormais des hash MD5 (changement de format)
- `x-purpose` request parameter : ignoré
- OPTIONS sans header `origin` : retourne HTTP 400 (au lieu de 401)
- `ListObjectsV1` : `nextMarker` n'est défini que si `truncated = true`
- `PutBucketCors` : accepte uniquement des origines valides
- **Opérations S3 non supportées** : `GetBucketVersioning`/`PutBucketVersioning` (pas de versioning natif S3), `GetBucketAcl`/`PutBucketAcl`, `GetObjectLockConfiguration`/`PutObjectLockConfiguration`, `GetObjectTagging`/`PutObjectTagging`, analytics, intelligent tiering, bucket notifications S3 natives, access logging S3
- **Rclone / clients S3** : restent compatibles, mais toute stratégie dépendant du versioning S3 natif ne fonctionne pas

**Nouvelles Features Pertinentes** :
- **Object Lifecycle Management** (GA depuis **mai 2023**) : règles natives dans le dashboard pour expirer les objets après N jours et abandonner les uploads multipart incomplets. **Pas** de transition entre classes de stockage via lifecycle rule
- **Infrequent Access storage class** (beta mai 2024) : `$0.01/GB-mois` stockage, `$0.01/GB` retrieval, durée minimale 30 jours
- **Event Notifications** (GA **26 septembre 2024**) : attention, ce ne sont **pas** des webhooks directs. Les notifications passent par Cloudflare Queues → Consumer Worker (pas d'endpoint externe sans Worker)
- **Bucket Locks** (**6 mars 2025**) : rétention au niveau bucket/préfixe (durée définie, jusqu'à date précise, ou indéfini). Jusqu'à 1 000 règles par bucket. **Ce n'est PAS** le S3 Object Lock WORM natif (pas de mode Compliance/Governance, pas de `x-amz-object-lock-*`)
- **R2 Data Catalog** (avril 2025) : catalogue Apache Iceberg managé intégré
- **R2 Local Uploads** (beta février 2026) : amélioration perf upload global
- **Mount R2 buckets in Containers** (novembre 2025)
- **Free tier confirmé 2026** : 10 GB storage/mois, 1M Class A ops/mois, 10M Class B ops/mois, **egress gratuit sans limite**

**Usage dans le projet** :
- Backups PostgreSQL quotidiens (pg_dump)
- Backups assets Docker volumes
- Rétention 7 jours (voir PRODUCTION.md)
- Outil de transfert : **rclone** (latest stable, installé sur le VPS)

**Compatibilité Écosystème** :
- rclone : ✅ via API S3-compatible (limitation : pas de versioning S3)
- Dokploy : ✅ (secrets R2 via Environment Variables)
- PostgreSQL pg_dump : ✅

**Points d'attention** :
- Configurer une règle de lifecycle R2 (Bucket → Settings → Lifecycle rules → delete after 7 days) — plus fiable que `rclone delete --min-age 7d`
- API tokens à gérer dans Dokploy (variables d'env)
- Endpoint : `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- Pas de versioning S3 natif : la rotation des backups doit être gérée côté rclone ou lifecycle rules
- Facturation arrondie à l'unité supérieure (1.1 GB → 2 GB facturé)

**Recommandation** : ✅ R2 pour le MVP (free tier 10 GB storage + egress illimité gratuit).

## Services externes (post-MVP)

### 26. n8n (self-hosted)

**Version actuelle** : `2.15.1`
**Stabilité** : ✅

**Breaking Changes Majeurs (v1 → v2)** :
- **MySQL et MariaDB supprimés** — PostgreSQL obligatoire en production
- SQLite legacy supprimé (déconseillé en prod)
- Mode binaire en mémoire supprimé
- Task runner retiré de l'image Docker principale → image séparée `n8nio/runners`
- Node Python (Pyodide) supprimé
- `--tunnel` CLI supprimé
- Node Start supprimé
- Nodes `ExecuteCommand` et `LocalFileTrigger` désactivés par défaut
- Accès aux variables d'env depuis Code Nodes bloqué par défaut

**Nouvelles Features Pertinentes** :
- v2.15 : endpoints archivage workflows, canvas-only mode, OpenTelemetry workflow tracing
- v2.14 : correctifs OAuth/SSO, optimisation cache webhook

**Compatibilité Écosystème** :
- PostgreSQL 13-17 : ✅ (à confirmer pour PG 18)
- Node.js 20.19 à 24.x : ✅ (via image Docker)
- Docker : ✅ (image `n8nio/n8n` + sidecar `n8nio/runners` si Python/Code Nodes)

**Recommandation** : ✅ n8n 2.15.1 avec une **base PostgreSQL dédiée** (pas celle du portfolio). Valider PG 18 en staging avant déploiement post-MVP.

### 27. Umami Analytics (self-hosted)

**Version actuelle** : `3.0.3`
**Stabilité** : ✅

**Breaking Changes Majeurs (v2 → v3)** :
- **MySQL/MariaDB supprimés** — PostgreSQL obligatoire
- Dashboard unifié retiré (remplacé par système "Boards")
- Changements API `/metrics/` non documentés (clients v2 → 400)
- Migration automatique peut perdre des event data (seuls les websites préservés)

**Nouvelles Features Pertinentes** :
- Interface redesignée avec nouvelle navigation
- Segments & Cohorts : filtres sauvegardables
- Filtres universels via query strings (URLs partageables)
- Tracking Links et Pixels

**Compatibilité Écosystème** :
- PostgreSQL : ⚠️ minimum v12.14, `docker-compose.yml` officiel utilise PG 15. **Issue ouverte #3888 avec PG 17.6** → à vérifier avec PG 18
- Docker : ✅ image `ghcr.io/umami-software/umami`
- Next.js : ✅ (Umami v3 lui-même en Next.js 15.5.7, patch CVE-2025-66478 en 3.0.3)

**Issues connues** :
- Géolocalisation "Unknown" depuis v2 → v3 (issue #3701)
- Dashboard parfois inaccessible "Server Action was not found" (issue #3859)
- Migration MySQL → PostgreSQL problématique

**Intégration Next.js** :
```tsx
import Script from 'next/script'

<Script
  src="https://umami.example.com/script.js"
  data-website-id="<UUID>"
  strategy="afterInteractive"
/>
```

**CSP** : ajouter le domaine Umami dans `script-src` (voir PRODUCTION.md).

**Recommandation** : ✅ Umami 3.0.3 avec **base PostgreSQL dédiée**. Valider PG 18 en staging (issue #3888).

---

# Matrice de Compatibilité Croisée

| A | B | Compatibilité | Notes |
|---|---|---|---|
| Next.js 16.2.4 | Prisma 7.7.0 | ⚠️ | Setup standard fonctionne en dev. En build : Turbopack est le défaut Next 16, issue WASM active avec `prisma-client` v7 (`query_compiler_fast_bg.postgresql.mjs` not found) — workaround `next build --webpack` |
| Next.js 16.2.4 | next-intl 4.9.1 | ✅ | Nécessite Next.js >= 16.2 pour `use cache` |
| Next.js 16.2.4 | TypeScript 6.0.2 | ✅ | TypeScript >= 5.1 requis |
| Next.js 16.2.4 | Pino 10.3.1 | ⚠️ | `serverExternalPackages` requis |
| Next.js 16.2.4 | Vitest 4.1.4 | ✅ | Async Server Components non testables en unit |
| Next.js 16.2.4 | Better Auth 1.6.2 | ✅ | `getServerSession` + `use cache` : extraire les cookies avant le scope cache (workaround trivial, Issue #5584) |
| Next.js 16.2.4 | next-themes 0.4.6 | ✅ | `suppressHydrationWarning` obligatoire |
| Next.js 16.2.4 | Magic UI | ✅ | Via shadcn CLI (vérifier imports `@/`) |
| Next.js 16.2.4 | Aceternity UI | ✅ | Utiliser `motion` v12+, pas `framer-motion` |
| Prisma 7.7.0 | PostgreSQL 18.3 | ✅ | Support officiel depuis 7.2.0 |
| Prisma 7.7.0 | pgvector 0.8.2 | ⚠️ | Support partiel : `Unsupported("vector")` + SQL manuel |
| Prisma 7.7.0 | Better Auth 1.6.2 | ✅ | Charger `.env` explicitement au runtime (`dotenv.config()`) pour éviter P1010 "DATABASE_URL manquante" |
| Prisma 7.7.0 | TypeScript 6.0.2 | ✅ | `moduleResolution: bundler` requis |
| Tailwind 4.2.2 | shadcn/ui | ✅ | Composants mis à jour pour v4 |
| Tailwind 4.2.2 | Magic UI | ✅ | Tailwind v4 par défaut depuis avril 2025 |
| Tailwind 4.2.2 | Aceternity UI | ✅ | Tailwind v4 standard documenté |
| Zod 4.3.6 | TypeScript 6.0.2 | ✅ | TypeScript >= 5.5 requis |
| pnpm 10.33.0 | TypeScript 6.0.2 | ⚠️ | Ne pas activer `preserveSymlinks: true` |
| Node.js 24.x | Prisma 7.7.0 | ✅ | Node.js >= 20.19 requis |
| Node.js 24.x | Next.js 16.2.4 | ✅ | Node.js >= 20.9 requis |
| Node.js 24.x | Pino 10.3.1 | ✅ | Node.js >= 20 requis |
| Docker 29.4.0 | Dokploy 0.28.8 | ✅ | Vérifier que Dokploy est à jour avant upgrade |
| Docker 29.4.0 | PostgreSQL 18.3 | ✅ | Adapter le chemin de volume PGDATA |
| Docker Compose v5 | Dokploy 0.28.8 | ✅ | Syntaxe `docker compose` (plus de `docker-compose`) |
| Dokploy 0.28.8 | Traefik 3.5 | ✅ | Upgrade Traefik non automatique |
| PostgreSQL 18.3 | pgvector 0.8.2 | ✅ | Support PG 18 depuis 0.8.1 |
| PostgreSQL 18.3 | n8n 2.15.1 | ⚠️ | PG 18 non officiellement testé (doc n8n : PG 13-17) |
| PostgreSQL 18.3 | Umami 3.0.3 | ⚠️ | Issue #3888 ouverte avec PG 17.6 — vérifier PG 18 |

---

# Conflits Potentiels

| Conflit | Risque | Solution |
|---|---|---|
| nodemailer < 8.0.5 + CRLF injection | 🔴 Critique | Pinner nodemailer >= 8.0.5 dans `package.json` |
| pgvector < 0.8.2 + CVE-2026-3172 | 🔴 Critique | Utiliser pgvector 0.8.2 minimum dès l'activation du RAG |
| Node.js 20 EOL (30 avril 2026) | 🔴 Critique | Migrer vers Node.js 24 LTS avant cette date (image Docker) |
| Prisma 7 `.env` non chargé au runtime | 🟡 Moyen | `dotenv.config()` explicite dans le fichier d'instantiation Prisma, ou via `prisma.config.ts`. Cause de l'erreur P1010 si oublié |
| Pino + Next.js App Router (bundling) | 🟡 Moyen | `serverExternalPackages: ['pino', 'pino-pretty']` dans `next.config.ts` |
| next-intl + `use cache` (Next 16.0/16.1) | 🟡 Moyen | Utiliser Next.js >= 16.2.4 (version cible du projet) |
| TypeScript 6 `module: esnext` par défaut | 🟡 Moyen | Vérifier les imports CJS — migrer les `require()` si présents |
| Umami + PostgreSQL 18 | 🟡 Moyen | Valider en staging avant prod post-MVP (issue #3888 sur PG 17.6) |
| n8n + PostgreSQL 18 | 🟡 Moyen | Doc officielle limite à PG 17 — tester avant prod post-MVP |
| Docker 29 + Dokploy | 🟡 Moyen | Vérifier que Dokploy est à jour avant d'upgrader Docker |
| Better Auth + `use cache` (Next.js 16) | 🟢 Faible | Extraire les cookies via `(await cookies()).toString()` **avant** le scope cache, passer en argument à `getServerSession` (Issue #5584) |
| Prisma 7 + Turbopack build (défaut Next 16) | 🟡 Moyen | Turbopack est le **défaut** de `next build` en Next 16. Issue WASM active avec `prisma-client` v7 : opt-out via `next build --webpack` dans le Dockerfile jusqu'à correction upstream |
| Prisma 7 + CI/CD avec build séparé | 🟢 Faible | Si build en CI puis déploiement séparé avec `prisma generate` au runtime : hash mismatch possible (issue #29025). Dokploy build directement sur le serveur → non concerné |
| Magic UI + shadcn CLI > 2.8.0 | 🟢 Faible | Vérifier les imports `@/lib/utils` après ajout des composants |
| Aceternity UI + framer-motion legacy | 🟢 Faible | Installer `motion` v12+, pas `framer-motion` |
| next-themes + Server Component | 🟢 Faible | `suppressHydrationWarning` sur `<html>` + pattern `isMounted` |

---

# Configuration Recommandée

## package.json

```json
{
  "name": "thibaud-geisler-portfolio",
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=10.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "postinstall": "prisma generate",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "next": "^16.2.4",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "next-intl": "^4.9.1",
    "next-themes": "^0.4.6",
    "motion": "^12.0.0",
    "zod": "^4.3.6",
    "nodemailer": "^8.0.5",
    "pino": "^10.3.1",
    "@prisma/client": "^7.7.0",
    "@prisma/adapter-pg": "^7.7.0",
    "pg": "^8.16.0",
    "server-only": "^0.0.1"
  },
  "devDependencies": {
    "typescript": "^6.0.2",
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/nodemailer": "^8.0.0",
    "@types/pg": "^8.16.0",
    "prisma": "^7.7.0",
    "tailwindcss": "^4.2.2",
    "@tailwindcss/postcss": "^4.2.2",
    "tw-animate-css": "^1.0.0",
    "shadcn": "^4.2.0",
    "vitest": "^4.1.4",
    "@vitejs/plugin-react": "^6.0.1",
    "vite-tsconfig-paths": "^6.1.1",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jsdom": "^26.0.0",
    "eslint": "^9.0.0",
    "dotenv": "^16.0.0"
  }
}
```

## pnpm-workspace.yaml

```yaml
# allowBuilds DOIT être ici en pnpm 10.33+ (package.json silencieusement ignoré).
# Lister chaque package explicitement, wildcard `"*": true` non supporté.
allowBuilds:
  "@parcel/watcher": true
  "@prisma/engines": true
  "@swc/core": true
  msw: true
  prisma: true
  sharp: true
  unrs-resolver: true
```

## prisma.config.ts

```ts
import { defineConfig } from 'prisma/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  adapter: new PrismaPg(pool),
})
```

## prisma/schema.prisma (generator)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## tsconfig.json (points critiques)

```json
{
  "compilerOptions": {
    "target": "es2025",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "incremental": true,
    "jsx": "preserve",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

> `moduleResolution: "bundler"` requis par Prisma 7. Ne pas activer `preserveSymlinks: true` (incompatible pnpm).

## next.config.ts (points critiques)

```ts
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {
  // Pino doit rester côté serveur, pas être bundlé
  serverExternalPackages: ['pino', 'pino-pretty'],

  // Retire X-Powered-By
  poweredByHeader: false,
}

export default withNextIntl(nextConfig)
```

## docker-compose.yml (production, schéma type)

```yaml
services:
  nextjs:
    image: node:24-alpine
    # ... build et config via Dokploy
    depends_on:
      - postgres

  postgres:
    image: postgres:18-alpine
    volumes:
      - portfolio_pgdata:/var/lib/postgresql  # Attention : PG18+ change le chemin par défaut
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"

volumes:
  portfolio_pgdata:
```

## .github/workflows/ci.yml (schéma minimal)

```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-24.04
    services:
      postgres:
        image: postgres:18-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: portfolio_test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v6
        with:
          version: 10.33.0
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: pnpm  # Explicit : le cache auto pnpm a été retiré en setup-node v6
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

## Post-Install / Setup

```bash
# 1. Installer les dépendances
pnpm install

# 2. Générer le Prisma Client
pnpm db:generate

# 3. Initialiser la base de données
pnpm db:migrate

# 4. Initialiser shadcn/ui (style new-york, Tailwind v4)
pnpm dlx shadcn@latest init

# 5. Ajouter des composants Magic UI / Aceternity UI au besoin
pnpm dlx shadcn@latest add "https://magicui.design/r/marquee.json"
pnpm dlx shadcn@latest add @aceternity/hero-highlight

# 6. Vérifier la configuration
pnpm typecheck
pnpm lint

# 7. Lancer les tests
pnpm test
```

## Checklist Validation Compatibilité

- [ ] `"type": "module"` dans `package.json` (requis Prisma 7 ESM-only)
- [ ] `postinstall: "prisma generate"` dans `package.json` (convention Prisma standard)
- [ ] `serverExternalPackages: ['pino', 'pino-pretty']` dans `next.config.ts`
- [ ] `prisma.config.ts` présent avec driver adapter `PrismaPg`
- [ ] Champ `output` défini dans le bloc `generator` de `schema.prisma`
- [ ] `dotenv.config()` ou `prisma.config.ts` charge la `DATABASE_URL` au runtime (Prisma 7 ne la charge plus auto)
- [ ] `moduleResolution: "bundler"` dans `tsconfig.json`
- [ ] `preserveSymlinks: false` (ou omis) dans `tsconfig.json`
- [ ] nodemailer >= 8.0.5 dans `package.json`
- [ ] Image Docker Node.js : `node:24-alpine` (pas `node:20-*`)
- [ ] Image Docker Postgres : `postgres:18-alpine` avec PGDATA adapté
- [ ] `pnpm.allowBuilds` configuré si des packages avec lifecycle scripts sont ajoutés
- [ ] next-intl >= 4.4 avec Next.js >= 16.2
- [ ] `suppressHydrationWarning` sur `<html>` pour next-themes
- [ ] Package `motion` installé (pas `framer-motion`) si Aceternity UI
- [ ] Runner CI `ubuntu-24.04` (pas `ubuntu-latest`)
- [ ] Dokploy >= 0.28.8 + script de sécurité v0.26.6 exécuté
- [ ] Registre externe Docker configuré pour les rollbacks Dokploy (v0.26+)
- [ ] Si pgvector activé : version >= 0.8.2 (CVE-2026-3172)
- [ ] Better Auth : `dotenv.config()` au runtime + workaround `cookies()` avant `use cache` si dashboard cache activé
- [ ] n8n / Umami post-MVP : base PostgreSQL dédiée (pas celle du portfolio), validation PG 18 en staging
- [ ] Build Docker : utiliser `next build --webpack` (opt-out Turbopack) tant que l'issue Prisma 7 WASM n'est pas corrigée upstream

---

# Recommandation Finale

Verdict : Stack compatible et production-ready. Prisma 7 + Next.js 16 + PostgreSQL fonctionne en setup standard (le starter officiel `prisma/nextjs-auth-starter` valide la combo). Les gotchas principaux sont des points de configuration (chargement `.env`, `serverExternalPackages` Pino, `postinstall prisma generate`), pas des bugs bloquants. Les services post-MVP (n8n, Umami) avec PostgreSQL 18 nécessitent une validation staging compte tenu du décalage de support officiel.

## Points Critiques

1. **Node.js 20 EOL (30 avril 2026)** : basculer l'image Docker sur `node:24-alpine` avant cette date
2. **nodemailer < 8.0.5** : vulnérabilité CRLF, ne jamais déployer une version antérieure
3. **pgvector CVE-2026-3172** : pinner >= 0.8.2 dès l'activation du RAG
4. **Prisma 7 `.env` runtime** : charger explicitement (`dotenv.config()` ou `prisma.config.ts`) — la cause principale de l'erreur P1010 "User was denied access"
5. **Umami + n8n + PostgreSQL 18** : compatibilité non officiellement validée, tester en staging avant production post-MVP (bases séparées de celle du portfolio)
6. **Dokploy 0.26+** : rollbacks registry-based — configurer un registre externe (Docker Hub / GHCR) dès le MVP pour garder la fonctionnalité
7. **Pino + Next.js App Router** : `serverExternalPackages: ['pino', 'pino-pretty']` obligatoire dans `next.config.ts`

## ROI / Avantages

1. **Prisma 7 Rust-free** : bundle ~90% plus petit, queries ~3x plus rapides
2. **TypeScript 6 strict par défaut** : moins de config manuelle, meilleure sécurité de types
3. **Zod 4** : parsing 14x plus rapide, bundle ~57% réduit, compilation TS jusqu'à 100x plus rapide
4. **Tailwind v4 (moteur Oxide)** : builds jusqu'à 5x plus rapides
5. **Node.js 24 LTS** : V8 13.6, ~30% de perf sur cas réels
6. **Vitest 4.1** : support Vite 8, reporter agent optimisé pour IA, test tags
7. **Dokploy 0.28** : Environments multi-environnements, intégration Railpack (successeur Nixpacks)

---

# 🔗 Ressources

## Documentation Officielle

### Runtime & Tooling

- [Node.js — Releases](https://nodejs.org/en/about/previous-releases)
- [Node.js v22 → v24 Migration Guide](https://nodejs.org/en/blog/migrations/v22-to-v24)
- [pnpm — Installation](https://pnpm.io/installation)
- [pnpm — Working with TypeScript](https://pnpm.io/next/typescript)
- [TypeScript 6.0 Release](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)

### Framework & UI

- [Next.js — Upgrade v16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16 Blog](https://nextjs.org/blog/next-16)
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [Tailwind CSS — Upgrade Guide v4](https://tailwindcss.com/docs/upgrade-guide)
- [shadcn/ui — Installation Next.js](https://ui.shadcn.com/docs/installation/next)
- [shadcn/ui — Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [shadcn/ui — React 19](https://ui.shadcn.com/docs/react-19)
- [Magic UI — Docs](https://magicui.design/docs)
- [Aceternity UI — Install Next.js](https://ui.aceternity.com/docs/install-nextjs)
- [next-themes — GitHub](https://github.com/pacocoursey/next-themes)
- [next-intl 4.0 Blog](https://next-intl.dev/blog/next-intl-4-0)

### Librairies applicatives

- [Zod v4 Migration](https://zod.dev/v4/changelog)
- [nodemailer — Documentation](https://nodemailer.com/)
- [nodemailer — GitHub Releases](https://github.com/nodemailer/nodemailer/releases)
- [Pino — getpino.io](https://getpino.io)
- [pino-nextjs-example](https://github.com/pinojs/pino-nextjs-example)

### Tests

- [Vitest 4.0 Blog](https://vitest.dev/blog/vitest-4)
- [Vitest — Migration Guide](https://main.vitest.dev/guide/migration)
- [Testing: Vitest | Next.js](https://nextjs.org/docs/app/guides/testing/vitest)

### Base de données

- [PostgreSQL 18 — Release Notes](https://www.postgresql.org/docs/current/release-18.html)
- [Prisma — Migration v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Prisma + Next.js](https://www.prisma.io/docs/guides/frameworks/nextjs)
- [Prisma — Supported Databases](https://www.prisma.io/docs/orm/reference/supported-databases)
- [prisma/nextjs-auth-starter](https://github.com/prisma/nextjs-auth-starter) — starter officiel Prisma 7 + Next.js 16 + Better Auth
- [pgvector — GitHub](https://github.com/pgvector/pgvector)
- [pgvector 0.8.2 Release](https://www.postgresql.org/about/news/pgvector-082-released-3245/)

### Auth (post-MVP)

- [Better Auth — Changelog](https://better-auth.com/changelog)
- [Better Auth + Prisma + Next.js](https://www.prisma.io/docs/guides/authentication/better-auth/nextjs)
- [Google Cloud Console — OAuth 2.0](https://console.cloud.google.com/apis/credentials)

### Infrastructure

- [Docker Engine v29](https://docs.docker.com/engine/release-notes/29/)
- [Docker Compose v5 Release Notes](https://docs.docker.com/compose/releases/release-notes/)
- [Dokploy — Installation](https://docs.dokploy.com/docs/core/installation)
- [Dokploy — Troubleshooting](https://docs.dokploy.com/docs/core/troubleshooting)
- [Dokploy v0.28.8 — Release](https://github.com/Dokploy/dokploy/releases/tag/v0.28.8)
- [GitHub Actions — ubuntu-24.04 runner](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [rclone — Cloudflare R2](https://rclone.org/s3/#cloudflare-r2)

### Services externes (post-MVP)

- [n8n — Self-hosting Docker](https://docs.n8n.io/hosting/installation/docker/)
- [n8n v2.0 Breaking Changes](https://docs.n8n.io/2-0-breaking-changes/)
- [Umami — Installation](https://docs.umami.is/docs/install)
- [Umami v3 Blog](https://umami.is/blog/umami-v3)

## Ressources Complémentaires

- [endoflife.date — Node.js](https://endoflife.date/nodejs)
- [endoflife.date — PostgreSQL](https://endoflife.date/postgresql)
- [endoflife.date — Docker Engine](https://endoflife.date/docker-engine)
- [endoflife.date — pnpm](https://endoflife.date/pnpm)
- [Docker Hub — node:24-alpine](https://hub.docker.com/_/node)
- [Docker Hub — postgres:18](https://hub.docker.com/_/postgres)
- [GHSA-vvjj-xcjg-gr5g — nodemailer CRLF](https://github.com/advisories/GHSA-vvjj-xcjg-gr5g)
- [The Twelve-Factor App](https://12factor.net/)
