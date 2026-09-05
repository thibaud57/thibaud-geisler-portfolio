---
title: "VERSIONS — Thibaud Geisler Portfolio"
description: "Matrice de compatibilité, versions recommandées et configuration pour la stack Next.js + Prisma + PostgreSQL du portfolio (MVP + post-MVP)."
date: "2026-09-04"
keywords: ["versions", "dependencies", "compatibility", "setup", "nextjs", "prisma", "postgresql", "docker", "dokploy"]
scope: ["docs", "config", "setup"]
technologies: ["Node.js", "pnpm", "TypeScript", "Next.js", "React", "Tailwind CSS", "shadcn/ui", "Magic UI", "Aceternity UI", "next-intl", "@icons-pack/react-simple-icons", "country-flag-icons", "Zod", "nodemailer", "Pino", "@next/env", "@t3-oss/env-nextjs", "server-only", "react-calendly", "@c15t/nextjs", "react-markdown", "remark-gfm", "Vitest", "@vitejs/plugin-react", "PostgreSQL", "Prisma", "GitHub Actions"]
---

> **Périmètre : ce que le dépôt déclare.** Versions npm lues dans `pnpm-lock.yaml` (ce qui est résolu, pas les plages de `package.json`), images et actions lues dans le `Dockerfile`, les compose et les workflows. Relevé le **4 septembre 2026**.

> **La plateforme d'hébergement est hors périmètre.** Docker Engine, Docker Compose, Dokploy et Cloudflare R2 ne sont déclarés par aucun fichier versionné ici : ils sont documentés dans [PRODUCTION.md](PRODUCTION.md) § Mises à jour > Plateforme d'hébergement.

---

# Vue d'ensemble

## Runtime & Tooling

| Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|
| Node.js | `24.20.0` | ✅ LTS Active | Ligne 24 « Krypton », **suivie sans patch épinglé** : `node:24-alpine` et `node-version: '24'` résolvent la dernière 24.x à chaque build. La 24 passe en Maintenance LTS le **20 octobre 2026**, la 26 devient Active LTS le **28 octobre 2026** : ne pas migrer avant |
| pnpm | `10.33.0` | ✅ | Lifecycle scripts désactivés par défaut en v10. **pnpm 11 disponible** (`latest` = `11.25.0`), montée non tentée, voir § Montées Bloquées |
| TypeScript | `6.0.3` | ✅ | `strict: true` et `module: esnext` par défaut. **TS 7 bloqué** : `typescript-eslint` (tiré par `eslint-config-next`) plafonne à `typescript <6.1.0` |

## Framework & UI

| Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|
| Next.js | `16.3.3` | ✅ | Middleware renommé `proxy.ts`, Turbopack par défaut. **16.3** : `export const runtime` interdit quand `cacheComponents: true` (retiré des `opengraph-image.tsx`). `16.3.4` disponible |
| React | `19.2.8` | ✅ | Bundlé avec Next.js 16, nombreuses APIs legacy retirées en v19 |
| Tailwind CSS | `4.3.3` | ✅ | CSS-first config, utilitaires renommés |
| shadcn/ui (CLI) | `shadcn@4.19.0` | ✅ | Composants copiés localement, style `radix-nova` |
| Magic UI | copy-paste (no semver) | ✅ | Installation via `shadcn@latest add` |
| Aceternity UI | copy-paste (no semver) | ✅ | Utilise `motion` (pas `framer-motion`) |
| next-intl | `4.14.1` | ✅ | Nécessite Next.js >= 16.3 pour `use cache` |
| @icons-pack/react-simple-icons | `13.15.1` | ✅ | Logos techs/marques pour badges stack projets (DESIGN.md § Mapping Composants). Lucide (inclus shadcn) pour l'UI |
| country-flag-icons | `1.6.20` | ✅ | Drapeaux SVG pour LanguageSwitcher (ratio 3:2, compatible TS 6 via `typeof FR`) |

## Librairies applicatives

| Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|
| Zod | `4.5.4` | ✅ | Validateurs string déplacés en top-level |
| nodemailer | `9.0.6` | ✅ | CVE CRLF corrigée depuis 8.0.5. Montée en v9 le 25 août 2026 |
| Pino | `10.3.1` | ⚠️ | `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']` requis dans `next.config.ts`, les trois. `thread-stream@4.2.0` est installé en dépendance directe |
| @next/env | `16.3.3` | ✅ | Chargement `.env` dans `prisma.config.ts`, `prisma/seed.ts`, `vitest.env-loader.ts` (recommandation officielle Next.js pour env hors runtime Next) |
| @t3-oss/env-nextjs | `0.13.11` | ✅ | Validation runtime des env vars dans `src/env.ts` via Zod, séparation server/client, `skipValidation` flag pour tests/build |
| server-only | `0.0.1` | ✅ | Garde-fou : throw si import côté client (protège Pino, Prisma, secrets côté serveur) |
| react-calendly | `4.4.0` | ✅ | Wrapper React du widget Calendly inline (hook `useCalendlyEventListener` typé) |
| @c15t/nextjs | `2.2.1` | ✅ | CMP de consentement cookies, mode `offline`, juridiction forcée FR. Conditionne le montage de Calendly. Fiche : [knowledges/c15t.md](knowledges/c15t.md) |
| react-markdown | `10.1.0` | ✅ | Rendu du markdown des case studies. Neutralise nativement les URL `javascript:` via `defaultUrlTransform`, ne pas poser de `urlTransform` custom sans revalider ce point |
| remark-gfm | `4.0.1` | ✅ | Plugin GitHub Flavored Markdown de react-markdown (tableaux, checkboxes, autolinks, barré). Paquet distinct, non embarqué par react-markdown |

## Tests

| Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|
| Vitest | `4.1.11` | ✅ | Vite >= 6 + Node.js >= 20. Combo `@testing-library/react 16.x`. `jsdom@30`, `@testing-library/jest-dom@7` |
| @vitejs/plugin-react | `6.1.1` | ✅ | Plugin officiel (doc Next 16 Vitest), JSX transform (Babel, pas SWC) |

## Base de données

| Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|
| PostgreSQL | `18.6` | ✅ | Image `postgres:18-alpine`, aucun patch épinglé. Checksums activés par défaut, volume Docker changé |
| Prisma ORM | `7.10.0` | ✅ | ESM-only, driver adapter obligatoire, `.env` non auto-chargé au runtime |

## CI / CD

| Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|
| GitHub Actions (runner) | `ubuntu-24.04` | ✅ | `checkout@v7`, `setup-node@v7`, `cache@v6`, `pnpm/action-setup`, `cache: 'pnpm'` explicite |

---

# Détails par Technologie

## Runtime & Tooling

### 1. Node.js

**Version actuelle** : `24.20.0` (LTS Active, « Krypton », publiée le 26 août 2026)
**Stabilité** : ✅

**Le patch ci-dessus est celui du jour, pas une contrainte** : `node:24-alpine` dans le Dockerfile et `node-version: '24'` dans les workflows résolvent la dernière 24.x disponible à chaque build. C'est la **ligne 24** qui est la décision, le patch se relit ici à titre indicatif.

**Breaking Changes Majeurs (v22 → v24)** :
- OpenSSL 3.5 : clés RSA/DSA < 2048 bits et ECC < 224 bits refusées, RC4 bloqué
- 32-bit Linux armv7 : « no longer supported » selon le guide de migration v22 → v24, « downgraded to experimental support » selon le blog `v24.0.0`. Les deux sources divergent, sans objet ici (build amd64/arm64)
- macOS minimum : 13.5
- `dirent.path` → `dirent.parentPath` (DEP0178 finalisée)
- `fs.F_OK` etc. doivent passer par `fs.constants.*` (DEP0176 finalisée)
- Erreurs stream/pipe silencieuses deviennent des exceptions
- V8 13.6 : C++20 potentiellement requis pour les addons natifs

**Deux sources, pas une** : le guide de migration officiel ne couvre qu'OpenSSL 3.5, armv7, macOS 13.5 et V8 13.6. Les dépréciations finalisées (`dirent.path`, `fs.F_OK`), `URLPattern`, Undici 7 et npm 11 viennent du blog de release `v24.0.0`.

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

**À noter** : Node.js 20 est EOL depuis le **30 avril 2026**. Node.js 22 est en Maintenance LTS. La ligne 24 y passe à son tour le **20 octobre 2026**, date à laquelle la 26 devient Active LTS (README `nodejs/Release`).

**Recommandation** : ✅ Node.js 24 LTS. Node.js 20 est EOL, ne jamais y redescendre.

### 2. pnpm

**Version actuelle** : `10.33.0`
**Stabilité** : ✅

**Breaking Changes Majeurs (v9 → v10)** :
- Lifecycle scripts des dépendances désactivés par défaut (sécurité) → `allowBuilds`, map pattern → boolean, **ajoutée en 10.26.0** (« Added in: v10.26.0 », doc `settings/build`)
- `public-hoist-pattern` : rien hissé par défaut (eslint/prettier inclus)
- `pnpm link -g` supprimé : le lien global se fait par `pnpm link` depuis le dossier du package. Changement distinct : `pnpm add --global pnpm` échoue désormais et renvoie vers `pnpm self-update`
- Hashing migré vers SHA256 (lockfile, peer deps)

**Breaking Change (v10 → v11)** :
- `onlyBuiltDependencies` et `neverBuiltDependencies` **supprimés** en 11.0 (blog 11.0, 28 avril 2026) : ils restent acceptés sur toute la ligne 10.x, `allowBuilds` est le remplaçant

**`allowBuilds` va dans `pnpm-workspace.yaml`** : c'est le seul emplacement documenté par pnpm, et le seul où le projet l'a vu pris en compte (constat projet, une déclaration dans `package.json` reste sans effet). Lister chaque package explicitement, les patterns glob ne sont pas supportés — c'est l'objet de l'[issue #11171](https://github.com/pnpm/pnpm/issues/11171), ouverte le 2 avril 2026.

**Nouvelles Features Pertinentes** (au fil de la ligne 10.x) :
- `minimumReleaseAge` (10.16) et `trustPolicy` (10.21) : protection supply chain
- Node.js runtime auto-install via `engines.runtime` (10.21)
- `dedupePeers` (10.33) : réduit la duplication des peer deps

**Compatibilité Écosystème** :
- Next.js : ✅
- TypeScript : ⚠️ ne pas activer `preserveSymlinks: true` (résolution des types cassée)
- Node.js : version minimale 18.12 en 10.x, `>=22.13` en 11.x (le projet est en Node 24, sans objet)

**Issues connues** :
- ~1-2% des packages supposent un `node_modules` plat (utiliser `public-hoist-pattern` si besoin)

**Recommandation** : ✅ pnpm 10.33.0 (ADR-008, package manager du projet).

### 3. TypeScript

**Version actuelle** : `6.0.3`
**Stabilité** : ✅

**Breaking Changes Majeurs (v5 → v6)** :
- `strict: true` par **défaut** (ne pas le forcer à `false`)
- `module` passe à `esnext` par défaut (plus `commonjs`), peut casser les projets CJS
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

**Recommandation** : ✅ TypeScript 6.0.3. Vérifier les imports CJS à la migration. **TS 7 bloqué** par `typescript-eslint`, voir § Montées Bloquées.

## Framework & UI

### 1. Next.js

**Version actuelle** : `16.3.3`
**Stabilité** : ✅

**Breaking Changes Majeurs (v15 → v16)** :
- **Async Request APIs** : accès synchrone à `cookies()`, `headers()`, `params`, `searchParams` supprimé, tout est `async`/`await`
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

**Depuis la 16.3** :
- `export const runtime` devient interdit quand `cacheComponents: true`. **Constat projet** (commit `8a2b1d8`, le build rejette ce segment config) et non règle documentée upstream : la release 16.3.0 ne mentionne que la dépréciation du runtime edge, et le guide Cache Components se limite à « requires the Node.js runtime ». Le projet l'a retiré des `opengraph-image.tsx`

**Compatibilité Écosystème** :
- React 19.2 : ✅ (inclus)
- shadcn/ui : ✅
- next-intl : ✅ (>= 4.4 requis, 4.14.1 installée)
- Prisma 7 : ✅ (setup standard, build Turbopack vérifié, voir § Prisma ORM > Issues connues)
- Pino : ⚠️ `serverExternalPackages` obligatoire

**Dernière publiée** : `16.3.4`. `next`, `@next/env`, `@next/bundle-analyzer` et `eslint-config-next` suivent la même numérotation et se montent ensemble.

**Recommandation** : ✅ Next.js 16.3.3. Suivre le guide officiel Prisma + Next.js pour la config client/adapter.

### 2. React

**Version actuelle** : `19.2.8` (21 juillet 2026, bundlé avec Next.js 16)
**Stabilité** : ✅

**Breaking Changes Majeurs (v18 → v19)** :
- **APIs supprimées définitivement** : `ReactDOM.render` → `createRoot`, `ReactDOM.hydrate` → `hydrateRoot`, `ReactDOM.unmountComponentAtNode` → `root.unmount()`, `ReactDOM.findDOMNode`, `React.createFactory`
- **`propTypes` et `defaultProps`** sur les function components : retirés définitivement
- **String refs** (`this.refs.input`) : retirées
- **Legacy Context API** (`contextTypes`, `getChildContext`) : retirée
- **`useFormState`** (ReactDOM) → renommé `useActionState` (React)
- **`<Context.Provider>`** déprécié → utiliser `<Context>` directement
- **`forwardRef`** : **déprécié** (fonctionne encore), `ref` est désormais une prop normale des function components. `element.ref` aussi déprécié → utiliser `element.props.ref`
- **`useRef()`** sans argument : interdit en TypeScript (doit être `useRef(null)`)
- **`ReactElement` props** : type par défaut passe de `any` à `unknown`
- **Erreurs de rendu** : ne sont plus re-throw, rapportées via `window.reportError` / `console.error`
- **Builds UMD** supprimés (utiliser `esm.sh`)
- **URLs `javascript:`** dans `src`/`href` : erreur désormais
- **`react-dom/test-utils`** : `act` déplacé dans `react`, le reste supprimé

**Nouvelles Features Pertinentes** :
- **v19.0** : **Actions / async transitions** : support des fonctions `async` dans `startTransition` avec gestion automatique pending/erreurs/reset
- **v19.0** : `useActionState`, `useOptimistic`, `useFormStatus`
- **v19.0** : `use()` : lire une Promise ou un contexte directement dans le rendu (avec Suspense)
- **v19.0** : Métadonnées document dans les composants (`<title>`, `<meta>`, `<link>` hoistés vers `<head>`)
- **v19.0** : APIs de préchargement : `preload`, `preinit`, `prefetchDNS`, `preconnect`
- **v19.0** : Support des Custom Elements, stylesheets avec `precedence`, scripts async dédupliqués
- **v19.2** : `useEffectEvent` stable (extraire la logique "événement" d'un `useEffect` sans polluer les deps)
- **v19.2** : `Activity` component stable (mode `visible`/`hidden` pour pré-rendre ou sauvegarder l'état de routes cachées)
- **v19.2** : `cacheSignal` (Server Components uniquement)
- **v19.2** : Performance Tracks (pistes custom Chrome DevTools : Scheduler, Components)
- **v19.2** : Partial Pre-rendering stable : `prerender()`, `resume()`, `resumeAndPrerender()`

**À noter** :
- **`<ViewTransition>`** : **uniquement en Canary/Experimental** en 19.2 stable, pas encore GA

**Compatibilité Écosystème** :
- Next.js 16 : ✅ (installé automatiquement)
- shadcn/ui : ✅ (composants mis à jour, `forwardRef` retiré)
- Magic UI / Aceternity UI : ✅
- `eslint-plugin-react-hooks` v6 requis pour le lint `useEffectEvent`

**Recommandation** : ✅ Ne pas installer React manuellement, laisser Next.js gérer la version.

### 3. Tailwind CSS

**Version actuelle** : `4.3.3`
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
- v4.0 : moteur Oxide (Rust), builds jusqu'à 5x plus rapides
- v4.2 : 4 nouvelles palettes (mauve, olive, mist, taupe), utilitaires de propriétés logiques (padding, margin, border, inset), plugin `@tailwindcss/webpack`
- v4.3 (installée) : utilitaires `scrollbar-*`, `@container-size`, `zoom-*`, `tab-*`, variants `@variant` empilables

**Compatibilité Écosystème** :
- Next.js 16 : ✅
- shadcn/ui : ✅ (mis à jour pour Tailwind v4)
- Magic UI : ✅ (Tailwind v4 par défaut depuis avril 2025)
- Aceternity UI : ✅ (Tailwind v4 standard documenté)

**Plugins montés** :
- `@tailwindcss/typography` (`0.5.20`) : fournit la classe `prose`, qui stylise en bloc le HTML produit par react-markdown (§ Librairies applicatives). Indispensable là où le balisage est généré et ne peut pas porter de classes utilitaires. Chargé par `@plugin "@tailwindcss/typography"` dans `src/app/globals.css`
- `tw-animate-css` (`1.4.0`) : remplaçant de `tailwindcss-animate`, incompatible v4

**Recommandation** : ✅ Tailwind CSS 4.3.3 avec `@tailwindcss/postcss`.

### 4. shadcn/ui

**Version actuelle** : `shadcn@4.19.0` (CLI)
**Stabilité** : ✅

shadcn/ui n'est pas une lib npm classique, les composants sont copiés localement dans le projet.

**Breaking Changes Majeurs** :
- Nouveau système de styles, format `{base}-{style}` : `nova`, `vega`, `maia`, `lyra`, `mira`, sur les bases `radix` ou `base`. Le défaut du CLI est désormais le preset `nova` (`shadcn init -d` = `--template=next --preset=nova`) ; `new-york` reste disponible et pris en charge, seul `default` est déprécié. Style retenu par le projet : voir `DESIGN.md` § Style shadcn
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

### 5. Magic UI

**Version actuelle** : pas de versioning sémantique (modèle copy-paste via registry shadcn)
**Stabilité** : ✅ actif et maintenu

**Breaking Changes Majeurs** :
- Tailwind v4 + React 19 par défaut depuis avril 2025, `tailwind.config.ts` n'est plus requis
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
- Deux paquets npm à ne pas confondre : `magicui-cli` est dormant (dernière publication en juillet 2024, ne pas l'utiliser), `@magicuidesign/cli` reste documenté sur magicui.design comme installeur du serveur MCP

**Installation** :
```bash
pnpm dlx shadcn@latest add "https://magicui.design/r/<component>.json"
```

**Recommandation** : ✅ Ajouter via `shadcn@latest`, vérifier les chemins d'import après installation.

### 6. Aceternity UI

**Version actuelle** : pas de versioning sémantique (copy-paste via registry shadcn)
**Stabilité** : ✅ actif (dernière entrée de changelog : 17 août 2026, « Chromatic Image »)

**Breaking Changes Majeurs** :
- **Framer Motion → Motion** : Aceternity utilise désormais le package `motion` (v12+), imports via `motion/react`. **Ne pas installer `framer-motion` séparément**. Le remplacement a été étendu à tous les templates le 15 juillet 2026
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
- Package npm `aceternity-ui` (v0.2.2) abandonné, ne pas l'utiliser

**Installation** :
```bash
# Syntaxe namespacée (shadcn CLI 3.0+)
pnpm dlx shadcn@latest add @aceternity/<component>

# Ou URL directe (syntaxe historique)
pnpm dlx shadcn@latest add "https://ui.aceternity.com/registry/<component>.json"
```

**Recommandation** : ✅ Installer `motion` v12+ (pas framer-motion), `13.1.1` installée. Utiliser la syntaxe namespacée.

### 7. next-intl

**Version actuelle** : `4.14.1`
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
- Next.js 16.0 à 16.2 : `getTranslations()` incompatible avec `use cache`. **Résolu sur Next.js >= 16.3** : c'est la 16.3.0 qui active les root params par défaut (PR #93863) et génère leurs types (PR #91019). L'issue [amannn/next-intl#1493](https://github.com/amannn/next-intl/issues/1493) est fermée le 4 août 2026 en citant « nextjs 16.3 root-params ». Aucune peer ne l'impose : `next-intl@4.14.1` déclare `next: ^12 || … || ^16`

**Recommandation** : ✅ next-intl 4.14.1 avec Next.js 16.3+.

### 8. @icons-pack/react-simple-icons

**Version actuelle** : `13.15.1`
**Stabilité** : ✅

Wrapper React de Simple Icons. Les icônes sont importées nommément depuis le barrel dans `src/lib/icons.tsx`, le tree-shaking reste à la charge du bundler.

**Périmètre d'usage** :
- Logos de technos et de marques pour les badges de stack des projets (voir `DESIGN.md` § Mapping Composants)
- L'UI générale utilise Lucide, fourni avec shadcn/ui. Ne pas mélanger les deux sur un même rôle

**Compatibilité Écosystème** :
- React 19 : ✅ (peer `^16.13 || ^17 || ^18 || ^19`)
- Next.js 16 : ✅

**À surveiller** : les noms d'export suivent le nommage upstream de Simple Icons (`Si<Marque>`). Une montée majeure peut donc retirer un export si la marque a disparu en amont, ce que `tsc --noEmit` attrape.

**Recommandation** : ✅ 13.15.1.

### 9. country-flag-icons

**Version actuelle** : `1.6.20`
**Stabilité** : ✅

Drapeaux SVG en composants React, importés fichier par fichier : `country-flag-icons/react/3x2/FR`. Le projet n'utilise que FR et GB, dans `src/components/layout/LanguageSwitcher.tsx`.

**Gotcha TypeScript 6** : le package n'expose pas de type public pour ses composants. Le mapping locale vers drapeau se type en dérivant le type d'un import concret plutôt qu'en le déclarant :

```tsx
} satisfies Record<Locale, typeof FR>
```

**Compatibilité Écosystème** :
- React 19 : ✅ (aucune peer dependency déclarée)
- Ratio 3:2 retenu, cohérent avec le gabarit des boutons du switcher

**Recommandation** : ✅ 1.6.20.

## Librairies applicatives

### 1. Zod

**Version actuelle** : `4.5.4`
**Stabilité** : ✅

**Breaking Changes Majeurs (v3 → v4)** :
- **Validateurs string déplacés en top-level** : `.email()`, `.uuid()`, `.url()` → `z.email()`, `z.uuid()`
- `z.uuid()` enforce RFC 9562, utiliser `z.guid()` pour l'ancien comportement
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

**Recommandation** : ✅ Zod 4.5.4. Vérifier les usages de `.email()`, `.uuid()` lors de la migration depuis v3.

### 2. nodemailer

**Version actuelle** : `9.0.6`
**Stabilité** : ✅

**Breaking Changes Majeurs (v8 → v9)** :
- **Validation TLS par défaut sur le contenu distant** : les requêtes HTTPS émises par nodemailer lui-même (URLs `href`/`path` de pièces jointes, endpoints de token OAuth2, `CONNECT` via proxy HTTP/HTTPS) valident désormais le certificat du serveur. Un hôte en certificat auto-signé, expiré ou au nom non concordant, qui passait avant, échoue maintenant. Opt-out par requête via `tls.rejectUnauthorized: false`
- `url.parse` déprécié remplacé par un wrapper WHATWG URL

**Sans effet sur le projet** : le transport IONOS est un SMTP direct sans proxy, sans OAuth2 et sans pièce jointe distante. Aucune des trois surfaces concernées n'est utilisée.

**Breaking Changes (v7 → v8)** :
- Code d'erreur `NoAuth` renommé `ENOAUTH`

**Sécurité** :
- **GHSA-vvjj-xcjg-gr5g** : vulnérabilité CRLF injection corrigée en **8.0.5**. Toute version < 8.0.5 est exposée.

**Nouvelles Features Pertinentes** :
- v8.0.5 : décodage UTF-8 des réponses SMTP à la limite de ligne
- v8.0.4 : sanitisation de la taille d'enveloppe (prévention injection SMTP)
- v7.0.12 : support REQUIRETLS

**Compatibilité Écosystème** :
- Node.js >= 20 : ✅ (compatible depuis v6.0.0 minimum)
- TypeScript : ✅ via `@types/nodemailer@8.0.1` (`esModuleInterop: true` requis). **La majeure des types ne suit plus celle de la lib** : DefinitelyTyped n'a pas publié de 9.x, `^8.0.1` reste la version correcte face à `nodemailer@9`
- SMTP IONOS : ✅ (STARTTLS/TLS/SMTPS)

**Recommandation** : ✅ nodemailer 9.0.6, avec le plancher de sécurité **>= 8.0.5** à ne jamais franchir à la baisse.

### 3. Pino

**Version actuelle** : `10.3.1`
**Stabilité** : ⚠️ (setup Next.js spécifique)

**Breaking Changes Majeurs (v9 → v10)** :
- **Unique breaking change** : drop du support Node.js 18 (confirmé par le mainteneur mcollina, issue #2317). Pas de refonte d'API.

**Nouvelles Features Pertinentes** :
- v10.0.0 : nouveau type TypeScript `LogFnFields` (PR #2254)
- v10.1.0 : intégration du package `@pinojs/redact`, signature de `censor` modifiée pour un typage plus sûr
- v10.1.1 : `reportCaller` ajouté à l'implémentation browser, support `%o` pour string/number/null
- v10.2.0 : fix memory leak des transports lancés avec `--import preload` (PR #2374)
- v10.3.0 : nommage des worker threads de transport, meilleur return type pour `multistream().clone()`
- v10.3.1 : sanitisation des preloads `NODE_OPTIONS` invalides pour les workers (PR #2391)
- Validation documentaire : type stripping Node.js 22.6+ fonctionne avec les transports Pino existants (PR #2347, pas de code modifié)

**Compatibilité Écosystème** :
- Node.js 20/22+ : ✅
- TypeScript : ✅ (types plus stricts en v10)
- Next.js App Router : ⚠️ bundling à contourner

**Issue : Next.js App Router** :
Next.js tente de bundler Pino incorrectement. Solution dans `next.config.ts` :

```ts
serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']
```

**Les trois, pas deux.** `thread-stream` est le worker thread sous-jacent de Pino : l'omettre casse le runtime même quand `pino` et `pino-pretty` sont déclarés. Il est en plus installé en dépendance directe (`thread-stream@4.2.0`), Pino ne le résout pas toujours seul.

**Recommandation** : ⚠️ Pino 10.3.1 avec `serverExternalPackages` **obligatoire**, les trois packages.

### 4. @next/env

**Version actuelle** : `16.3.3`
**Stabilité** : ✅

Charge les fichiers de configuration d'environnement avec la même cascade que Next.js, mais **hors du runtime Next**. Utilisé dans `prisma.config.ts`, `prisma/seed.ts` et le loader de tests Vitest.

**Pourquoi il est là** : Prisma 7 a supprimé le chargement automatique. Sans ce paquet, la CLI Prisma et le seed tournent sans `DATABASE_URL`, ce qui se manifeste par une erreur P1010. C'est la recommandation officielle Next.js pour ce cas, et il n'ajoute aucune dépendance nouvelle puisque `next` le tire déjà.

**Épinglé sur la version exacte de Next** : `16.3.3`, sans accent circonflexe, comme `next` lui-même. Le paquet est publié au même rythme que Next et suit sa numérotation, les deux se montent ensemble. La dernière publiée est `16.3.4`.

**Ordre d'appel** : `loadEnvConfig(process.cwd())` doit s'exécuter **avant** tout import qui lit `process.env`, d'où les deux lignes isolées en tête de `prisma.config.ts`, au-dessus des autres imports.

**Compatibilité Écosystème** :
- Next.js 16 : ✅ publié par l'équipe Next, versions solidaires
- Prisma 7 : ✅ c'est le mécanisme recommandé pour charger la configuration hors runtime Next
- Aucune peer dependency déclarée

**Recommandation** : ✅ monter en même temps que Next.js, jamais seul.

### 5. @t3-oss/env-nextjs

**Version actuelle** : `0.13.11`
**Stabilité** : ✅

Validation des variables d'environnement au boot, dans `src/env.ts`, avec séparation stricte `server` et `client` : les secrets serveur sont exclus du bundle client par construction.

**Compatibilité Écosystème** :
- Zod : ✅ peer `^3.24.0 || ^4.0.0`, le projet est en Zod 4.5.4
- TypeScript : ✅ peer `>=5.0.0`
- Next.js 16 : ✅

**`skipValidation`, non négociable** : `skipValidation: !!process.env.SKIP_ENV_VALIDATION` laisse le build tourner sans les secrets de production. La CI pose `SKIP_ENV_VALIDATION: 'true'` dans `ci.yml`, sinon `just build` échoue avant même de compiler.

**Version `0.x`** : pas de garantie semver sur les mineures, relire le changelog même pour une montée mineure.

**Recommandation** : ✅ 0.13.11.

### 6. server-only

**Version actuelle** : `0.0.1`
**Stabilité** : ✅

Un seul rôle : faire échouer la compilation si un module serveur est importé depuis un Client Component. Où le poser est une convention de code, décrite dans `.claude/rules/nextjs/data-fetching.md`.

**Gotcha tests** : le paquet n'a pas d'implémentation utilisable hors du bundler Next. Vitest le résout via un alias vers `__mocks__/server-only.ts`, un module vide, déclaré dans `resolve.alias` de `vitest.config.ts`. Sans cet alias, tout test qui touche un module protégé échoue dès l'import.

**Version figée depuis septembre 2022** : normal, le paquet n'a pas de surface à faire évoluer.

**Compatibilité Écosystème** :
- Next.js 16 : ✅ le garde-fou est implémenté par le bundler, pas par le paquet
- Vitest : ⚠️ nécessite l'alias vers le mock, sinon échec à l'import
- Aucune peer dependency déclarée

**Recommandation** : ✅ 0.0.1.

### 7. react-calendly

**Version actuelle** : `4.4.0`
**Stabilité** : ✅

Wrapper React du widget Calendly. Le projet utilise `InlineWidget` et le hook typé `useCalendlyEventListener`, dans `src/components/features/contact/CalendlyWidget.tsx`.

**Compatibilité Écosystème** :
- React 19 : ✅ (peers `react >= 16.8.0`, `react-dom >= 16.8.0`)
- Next.js 16 : ✅ en Client Component

**Contraintes qui ne viennent pas du paquet** : le widget est un iframe, la CSP doit l'autoriser ([PRODUCTION.md](PRODUCTION.md) § Sécurité & Configuration > Security Headers), et son montage est conditionné au consentement marketing (§ @c15t/nextjs).

**À noter** : dernière publication en mai 2025. Stable mais peu actif, vérifier son état avant d'en dépendre davantage.

**Recommandation** : ✅ 4.4.0.

### 8. @c15t/nextjs

**Version actuelle** : `2.2.1` (avec `@c15t/translations` à la même version)
**Stabilité** : ✅

CMP (Consent Management Platform) headless, sous licence Apache 2.0. `ConsentManagerProvider`, `ConsentBanner` et `ConsentDialog` sont montés dans `src/app/providers.tsx`. Fiche détaillée : [knowledges/c15t.md](knowledges/c15t.md).

**Ce que le consentement conditionne** : `useConsentManager` gouverne le montage de Calendly (§ react-calendly). Sans accord marketing, un placeholder est rendu à la place du widget.

Configuration retenue (mode `offline`, `overrides.country: 'FR'`) et gotcha de theming : [knowledges/c15t.md](knowledges/c15t.md).

**Compatibilité Écosystème** :
- Next.js 16 / React 19 : ✅ en Client Component
- next-intl : ✅ traductions FR/EN via `@c15t/translations/all`

**Recommandation** : ✅ 2.2.1. Monter `@c15t/nextjs` et `@c15t/translations` ensemble, ils partagent la numérotation.

### 9. react-markdown

**Version actuelle** : `10.1.0` (avec `remark-gfm` en `4.0.1`)
**Stabilité** : ✅

Moteur de rendu du contenu éditorial : il transforme le markdown des case studies (`project.caseStudyMarkdown`, stocké en base) et des pages légales en éléments React. Monté dans `src/components/markdown/MarkdownContent.tsx`, stylé par le plugin `@tailwindcss/typography` (§ Tailwind CSS).

`remark-gfm` est un paquet **distinct**, à installer et monter séparément : react-markdown embarque le cœur de remark mais pas cette extension. Elle active tableaux, listes à cocher, liens automatiques et texte barré — sans elle, un tableau markdown en base se rend en texte brut.

**Sécurité** : react-markdown applique `defaultUrlTransform` à tout `href`/`src` avant d'appeler les composants custom, avec une allowlist de protocoles. Un `[texte](javascript:…)` présent en base est donc neutralisé sans configuration. Le rendu de HTML brut est désactivé par défaut, `rehype-raw` n'est pas installé. **Ne pas passer de prop `urlTransform` ni ajouter `rehype-raw` sans revalider ces deux garanties.**

**Compatibilité Écosystème** :
- Next.js 16 / React 19 : ✅ en Server Component
- Tailwind 4 : ✅ via `@tailwindcss/typography` (classe `prose`)

**Recommandation** : ✅ 10.1.0 + `remark-gfm` 4.0.1. Les monter ensemble, `remark-gfm` suivant les majeures de react-markdown.

## Tests

### 1. Vitest

**Version actuelle** : `4.1.11`
**Stabilité** : ✅

**Breaking Changes Majeurs (v3 → v4)** :
- Vite >= 6.0.0 et Node.js >= 20 requis
- `maxThreads`/`maxForks` → `maxWorkers`
- `coverage.include` obligatoire pour cibler des fichiers
- Option `workspace` → `projects`
- Reporter `basic` supprimé (remplacer par `default` + `summary: false`)

**Nouvelles Features Pertinentes** :
- v4.0 : visual regression testing (`toMatchScreenshot`)
- v4.1 : test tags (organisation + filtrage `and`/`or`/`not`), hooks `aroundEach`/`aroundAll`, reporter `agent` optimisé pour LLMs, support Vite 8

**Compatibilité Écosystème** :
- `@testing-library/react 16.x` : ✅ (combo officiel)
- `@testing-library/jest-dom`, `@testing-library/user-event` : ✅
- TypeScript : ✅ (support natif via Vite/Oxc)
- Next.js : ✅, **limitation** : les async Server Components ne sont pas testables en unit tests (passer en E2E via Playwright)

**Setup minimal** :
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Vitest 5.0.0 publiée le 3 septembre 2026** (`engines`: `node ^22.12 || ^24 || >=26`, Vite >= 6.4) : non évaluée, voir § Montées Bloquées.

**Recommandation** : ✅ Vitest 4.1.11, `environment: 'jsdom'` pour les composants React.

### 2. @vitejs/plugin-react

**Version actuelle** : `6.1.1`
**Stabilité** : ✅

Plugin JSX officiel, celui que documente Next.js pour un setup Vitest. Transform via Babel, pas SWC.

**Compatibilité Écosystème** :
- Vite : peer `^8.0.0`, le projet est sur Vite 8.0.8, tiré par Vitest 4
- React 19 : ✅

**À noter** : `6.1.1` est disponible.

**Recommandation** : ✅ 6.1.1.

## Base de données

### 1. PostgreSQL

**Version actuelle** : `18.6` (publiée le 13 août 2026, batch 14.24 / 15.19 / 16.15 / 17.11, source `postgresql.org/versions.json`)
**Stabilité** : ✅

Comme pour Node, **aucun patch n'est épinglé** : l'image est `postgres:18-alpine` aux trois endroits où elle apparaît (`compose.override.yaml`, service container de `ci.yml`, service container de `deploy.yml`).

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
- Prisma 7 : ✅ PostgreSQL 18 est listé dans les bases supportées depuis décembre 2025. Aucune version de Prisma n'a introduit de changement spécifique à PG 18, la ligne a été ajoutée à la documentation après la discussion [#28937](https://github.com/prisma/prisma/discussions/28937)
- Docker : ✅ (`postgres:18`, `postgres:18-alpine`, ou un patch précis type `postgres:18.6`)

**Recommandation** : ✅ PostgreSQL 18, tag `18-alpine`. Vérifier le chemin du volume Docker.

### 2. Prisma ORM

**Version actuelle** : `7.10.0`
**Stabilité** : ✅

**Breaking Changes Majeurs (v6 → v7)** :
- **ESM-only** : `"type": "module"` requis dans `package.json`
- **Provider renommé** : `prisma-client-js` → `prisma-client` dans le `generator`
- **Output obligatoire** : champ `output` requis dans le `generator`
- **Driver adapter obligatoire** : `@prisma/adapter-pg` pour PostgreSQL
- **`prisma.config.ts`** : fichier centralisé, `url` dans `schema.prisma` déprécié
- **`.env` non chargé automatiquement** : utiliser `@next/env` (`loadEnvConfig(process.cwd())`) en tête de `prisma.config.ts`, recommandation officielle Next.js pour charger les env vars hors runtime Next
- **`prisma migrate dev`** ne lance plus `prisma generate` automatiquement
- **Seeding automatique supprimé** : lancer `pnpm prisma db seed` explicitement
- **API `$use()` supprimée** → `$extends()`
- **Node.js minimum : 20.19.0**, TypeScript minimum : 5.4.0. Le champ `engines` de `prisma@7.10.0` est plus strict que ce plancher : `^20.19 || ^22.12 || >=24.0`, les lignes impaires 21 et 23 sont exclues

**Nouvelles Features Pertinentes** :
- Client Rust-free : bundle ~90% plus petit, queries ~3x plus rapides, perf TS ~70% plus rapide
- Génération dans le code source (plus dans `node_modules`)
- `prisma.config.ts` centralisé
- `prisma bootstrap` : setup interactif Prisma Postgres (v7.7.0)
- Nested transaction rollbacks via savepoints (v7.5.0)

**Compatibilité Écosystème** :
- PostgreSQL 18 : ✅ (listé dans les bases supportées depuis décembre 2025, voir § PostgreSQL)
- Next.js 16 : ✅ (setup standard, starter officiel `prisma/nextjs-auth-starter` valide la combo)
- TypeScript 5.4+ : ✅ (`moduleResolution: bundler` requis)
- Node.js 20.19+/22+/24+ : ✅

**Issues connues & gotchas** :
- **`.env` non chargé automatiquement au runtime** : Prisma 7 a supprimé le chargement auto. Charger via `@next/env` (`loadEnvConfig(process.cwd())`) dans `prisma.config.ts`, recommandation officielle Next.js. Cause de l'erreur P1010 si oublié.
- **Turbopack build + Prisma 7 WASM** : Turbopack est le bundler **par défaut** de `next build` en Next 16 (plus Webpack). L'opt-out `next build --webpack`, posé pour une erreur de résolution du module WASM `query_compiler_fast_bg.postgresql.mjs`, **a été retiré du Dockerfile le 3 septembre 2026** : sur Next 16.3.3 + Prisma 7.10.0, le build Turbopack compile, prerende l'intégralité des pages contre une base réelle, et l'image finale sert les routes qui interrogent la base (vérifié en CI et sur un build Docker complet). Aucune issue upstream ouverte n'a pu être retrouvée côté `prisma/orm` ou `vercel/next.js`. À revérifier à chaque montée de Next ou de Prisma, le workaround tient en un flag.
- **CI/CD avec build séparé du déploiement** (issue #29025) : hash mismatch possible quand `prisma generate` est relancé au déploiement sur une machine ou une base Node différente de celle du build. Workaround : `transpilePackages: ['@prisma/client', '@prisma/adapter-pg', 'pg']` dans `next.config.ts`. **Le projet n'est pas concerné** : build et client Prisma sortent de la même base `node:24-alpine`, `.dockerignore` exclut `node_modules` et `src/generated`, et Dokploy est en pull-only. Détail des stages et du pipeline : [PRODUCTION.md](PRODUCTION.md) § CI/CD & Déploiement. À revérifier si `.dockerignore` change ou si le déploiement cesse d'être en pull-only.
- **Server Components + `'use cache'` au prerender** : la base doit être joignable au build, ce qui conditionne le pipeline de déploiement. Règle et gotcha `connection()` : `.claude/rules/nextjs/data-fetching.md`, pipeline : [PRODUCTION.md](PRODUCTION.md) § CI/CD & Déploiement
- **`postinstall: "prisma generate"`** obligatoire dans `package.json` (convention standard Prisma)

**Recommandation** : ✅ Prisma 7.10.0 avec le guide officiel `prisma/nextjs-auth-starter`. **Ne pas upgrader Prisma et Next.js simultanément** (règle PRODUCTION.md).

## CI / CD

### 1. GitHub Actions

**Version actuelle** : `ubuntu-24.04` (runner Noble Numbat)
**Stabilité** : ✅

**Actions épinglées** (inventaire au 3 septembre 2026, toutes sur leur dernière majeure ; source de vérité : `.claude/rules/github-actions/workflows.md`) :

| Action | Épinglée | Dernière publiée |
|---|---|---|
| `actions/checkout` | `@v7` | 7.0.1 (20 juillet 2026) |
| `actions/setup-node` | `@v7` | 7.0.0 (14 juillet 2026) |
| `actions/cache` | `@v6` | 6.1.0 (26 juin 2026) |
| `pnpm/action-setup` | `@v6` | 6.0.10 (3 août 2026) |
| `dorny/paths-filter` | `@v4` | 4.0.3 (5 août 2026) |
| `extractions/setup-just` | `@v4` | v4 (5 avril 2026) |
| `googleapis/release-please-action` | `@v5` | 5.0.0 (22 avril 2026) |
| `actions/create-github-app-token` | `@v3` | 3.2.0 (12 mai 2026) |
| `docker/build-push-action` | `@v7` | 7.3.0 (1er juillet 2026) |
| `docker/login-action` | `@v4` | 4.6.0 (29 juillet 2026) |
| `docker/metadata-action` | `@v6` | 6.2.0 (2 juillet 2026) |
| `docker/setup-buildx-action` | `@v4` | 4.3.0 (19 août 2026) |

**Breaking Changes Majeurs** :
- **Runner Ubuntu** :
  - `ubuntu-latest` repointé sur `ubuntu-24.04` le **17 janvier 2025** (rollout initié le 5 décembre 2024)
  - `ubuntu-20.04` retiré définitivement le **15 avril 2025**, toute référence à ce label échoue
  - Différences de packages pré-installés sur ubuntu-24.04 vs 22.04 (certains outils retirés pour respecter le SLA de disk space)
- **actions/checkout v6 → v7** : le checkout d'une PR issue d'un fork est **bloqué** sur `pull_request_target` et `workflow_run`. Sans objet pour ce dépôt (aucun de ces deux déclencheurs), mais c'est le changement de comportement de la majeure. L'action est aussi passée en ESM
- **actions/setup-node v6 → v7** : passage en ESM, retrait de l'export factice `NODE_AUTH_TOKEN`, nouvelles sorties `cache-primary-key` et `cache-matched-key`. Aucun breaking change annoncé par l'upstream
- **actions/setup-node v5 → v6** : **cache automatique retiré pour pnpm/yarn**, le cache auto est désormais limité à npm uniquement. Pour pnpm, ajouter `cache: 'pnpm'` explicitement. Source : [PR #1374](https://github.com/actions/setup-node/pull/1374). Retrait aussi de `always-auth`. Runtime Node 20 → Node 24
- **actions/checkout v5 → v6** : credentials ne sont plus écrits inline dans `.git/config`, stockés dans un fichier séparé (impact potentiel sur les outils qui lisent `.git/config` directement)
- **pnpm/action-setup v3 → v4** : erreur levée si la version `packageManager` du `package.json` contredit celle spécifiée dans l'action (avant : conflit ignoré silencieusement)
- **Immutable Actions (février 2025)** : nouveaux domaines à autoriser pour les self-hosted runners (`pkg.actions.githubusercontent.com`, `ghcr.io`)

**Nouvelles Features Pertinentes** :
- **actions/setup-node v6.3.0** : support du champ `devEngines.runtime` dans `package.json` (prioritaire sur `engines.node`)
- **actions/checkout v6** : support des git worktrees avec `persist-credentials` + `includeIf`, correction du comportement `fetch-tags` sur les tags annotés
- **pnpm/action-setup v6** : support pnpm v11

**Compatibilité Écosystème** :
- Node.js 24 : ✅ via `actions/setup-node@v7` (override requis, le défaut du runner n'est pas Node 24)
- pnpm 10.33 : ✅ via `pnpm/action-setup@v6` + `cache: 'pnpm'` explicite dans setup-node
- PostgreSQL 18 : ✅ via service container (image Docker `postgres:18`)

**Points d'attention** :
- `ubuntu-latest` pointe actuellement sur `ubuntu-24.04` mais peut basculer sans préavis, **épingler explicitement la version**
- **Node par défaut sur le runner ≠ Node du projet** : sur l'image `20260831.293.1`, le Node système est `22.23.2` et le tool cache contient `22.23.2` et `24.20.0`. Ces valeurs bougent à chaque image runner, ne pas s'y fier : toujours `node-version: '24'` dans `setup-node`
- **Ne pas pinner `version:` dans `pnpm/action-setup`** : l'action déduit la version depuis `packageManager` du `package.json`, seule source de vérité. Un pin en double diverge silencieusement au prochain bump de pnpm
- **`pnpm/action-setup` a un successeur** : la release 6.0.10 ajoute « docs(README): point users to the successor `pnpm/setup` action » (PR #282). Aucune dépréciation formelle à ce jour, à trancher avant la prochaine montée majeure
- Node.js 20 est EOL sur runner depuis le 30 avril 2026

**Recommandation** : ✅ Épingler `ubuntu-24.04` + `actions/checkout@v7` + `actions/setup-node@v7` + `pnpm/action-setup@v6`, avec `cache: 'pnpm'` explicite.

---

# Matrice de Compatibilité Croisée

| A | B | Compatibilité | Notes |
|---|---|---|---|
| Next.js 16.3.3 | Prisma 7.10.0 | ✅ | Setup standard. Build Turbopack (défaut Next 16) vérifié en CI et en image Docker, l'opt-out `--webpack` posé pour l'erreur WASM `query_compiler_fast_bg.postgresql.mjs` a été retiré |
| Next.js 16.3.3 | next-intl 4.14.1 | ✅ | Nécessite Next.js >= 16.3 pour `use cache` (root params) |
| Next.js 16.3.3 | TypeScript 6.0.3 | ✅ | TypeScript >= 5.1 requis |
| Next.js 16.3.3 | Pino 10.3.1 | ⚠️ | `serverExternalPackages` requis |
| Next.js 16.3.3 | Vitest 4.1.11 | ✅ | Async Server Components non testables en unit |
| Next.js 16.3.3 | Magic UI | ✅ | Via shadcn CLI (vérifier imports `@/`) |
| Next.js 16.3.3 | Aceternity UI | ✅ | Utiliser `motion` v12+, pas `framer-motion` |
| Prisma 7.10.0 | PostgreSQL 18.6 | ✅ | PG 18 listé dans les bases supportées depuis décembre 2025 |
| Prisma 7.10.0 | TypeScript 6.0.3 | ✅ | `moduleResolution: bundler` requis |
| Tailwind 4.3.3 | shadcn/ui | ✅ | Composants mis à jour pour v4 |
| Tailwind 4.3.3 | Magic UI | ✅ | Tailwind v4 par défaut depuis avril 2025 |
| Tailwind 4.3.3 | Aceternity UI | ✅ | Tailwind v4 standard documenté |
| Zod 4.5.4 | TypeScript 6.0.3 | ✅ | TypeScript >= 5.5 requis |
| pnpm 10.33.0 | TypeScript 6.0.3 | ⚠️ | Ne pas activer `preserveSymlinks: true` |
| Node.js 24.20.0 | Prisma 7.10.0 | ✅ | Node.js >= 20.19 requis |
| Node.js 24.20.0 | Next.js 16.3.3 | ✅ | Node.js >= 20.9 requis |
| Node.js 24.20.0 | Pino 10.3.1 | ✅ | Node.js >= 20 requis |
| `postgres:18-alpine` | Volume Docker | ⚠️ | PG18+ change le chemin par défaut : monter `/var/lib/postgresql`, pas `/var/lib/postgresql/data` |

---

# Conflits Potentiels

| Conflit | Risque | Solution |
|---|---|---|
| nodemailer < 8.0.5 + CRLF injection | 🔴 Critique | Pinner nodemailer >= 8.0.5 dans `package.json` |
| Node.js 20 EOL (30 avril 2026) | ✅ Traité | Échéance passée, le projet est en `node:24-alpine` et `node-version: '24'`. Ne jamais redescendre sur `node:20-*` |
| Prisma 7 `.env` non chargé au runtime | 🟡 Moyen | `@next/env` (`loadEnvConfig`) dans `prisma.config.ts`, recommandation Next.js. Cause de l'erreur P1010 si oublié |
| Pino + Next.js App Router (bundling) | 🟡 Moyen | `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']` dans `next.config.ts` |
| next-intl + `use cache` (Next 16.0 à 16.2) | 🟡 Moyen | Utiliser Next.js >= 16.3 (le projet est en 16.3.3) |
| TypeScript 6 `module: esnext` par défaut | 🟡 Moyen | Vérifier les imports CJS, migrer les `require()` si présents |
| Prisma 7 + Turbopack build (défaut Next 16) | ✅ Traité | Erreur WASM non reproduite sur 16.3.3 + 7.10.0 : opt-out `--webpack` retiré du Dockerfile. Revérifier le build Docker à chaque montée de Next ou de Prisma |
| Prisma 7 + CI/CD avec build séparé | 🟢 Faible | Hash mismatch possible si `prisma generate` est rejoué au déploiement sur une base Node différente de celle du build (issue #29025). Le projet **est** en build séparé (GitHub Actions), mais reste non concerné : Dokploy est en pull-only et ne régénère rien. Détail en § Prisma ORM |
| Magic UI + shadcn CLI > 2.8.0 | 🟢 Faible | Vérifier les imports `@/lib/utils` après ajout des composants |
| Aceternity UI + framer-motion legacy | 🟢 Faible | Installer `motion` v12+, pas `framer-motion` |

---

# Configuration Recommandée

## package.json

Le fichier réel est la source de vérité, ne pas dupliquer la liste des dépendances ici : elle diverge à chaque montée. Seuls les points structurels imposés par la stack sont listés.

```jsonc
{
  "version": "<bumpé par release-please>", // jamais à la main
  "type": "module",                // requis : Prisma 7 est ESM-only
  "packageManager": "pnpm@10.33.0",// seule déclaration de la version de pnpm (lue par corepack ET par pnpm/action-setup)
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=10.0.0"
  },
  "scripts": {
    "postinstall": "prisma generate" // convention Prisma standard, sans quoi le client n'existe pas après un install propre
  }
}
```

## pnpm-workspace.yaml

```yaml
# allowBuilds vit ici (seul emplacement documenté par pnpm depuis la 10.26).
# Lister chaque package explicitement, les patterns glob ne sont pas supportés.
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
import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    path: 'prisma/migrations',
    // seed.js bundlé par esbuild au build Docker, tsx en dev : tsx reste devDep
    seed: process.env.NODE_ENV === 'production' ? 'node prisma/seed.js' : 'tsx prisma/seed.ts',
  },
})
```

Trois points qui se trompent facilement :

- **L'adapter n'est pas ici.** `PrismaPg` se configure à l'instanciation du client, dans `src/lib/prisma.ts`. Ce fichier ne porte que la config CLI.
- **`process.env.DATABASE_URL!`, pas le helper `env()` de `prisma/config`.** Ce dernier throw `PrismaConfigEnvError` **au chargement du fichier**, ce qui casse toute commande CLI, `prisma generate` compris, alors même qu'elle n'a pas besoin de l'URL. Position officielle Prisma ([issue #28590](https://github.com/prisma/prisma/issues/28590)). `process.env` est lu paresseusement.
- **Les deux lignes `@next/env` passent avant les autres imports**, sinon `defineConfig` s'évalue sur un `process.env` encore vide.

## prisma/schema.prisma (generator)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

> Le bloc `datasource` ne porte **plus** de `url` en Prisma 7 : elle vient de `prisma.config.ts`. La laisser ici contredit la config et fait diverger les deux sources.

## tsconfig.json (points critiques)

```json
{
  "compilerOptions": {
    "target": "es2025",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "allowJs": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "incremental": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "types": ["node", "vitest/globals"],
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- `moduleResolution: "bundler"` requis par Prisma 7. Ne pas activer `preserveSymlinks: true`, incompatible pnpm.
- `allowJs` élargit ce que `tsc --noEmit` vérifie (le seed bundlé et les configs JS entrent dans le périmètre), `resolveJsonModule` autorise les imports de JSON. Les deux sont actifs dans le fichier réel.
- `types` est **explicite** : TypeScript 6 a retiré l'auto-discovery des `@types/*`, ce qui n'est pas déclaré ici n'est pas chargé.
- `jsx: "react-jsx"` (runtime automatique) et non le `preserve` du template Next par défaut. Le bundler fait la transformation dans les deux cas, la valeur ne joue que sur ce que `tsc --noEmit` vérifie. Ne pas la « corriger » vers `preserve` en croyant s'aligner sur Next.

## next.config.ts (points critiques)

```ts
import bundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })

const nextConfig: NextConfig = {
  output: 'standalone',
  cacheComponents: true,
  experimental: {
    globalNotFound: true,
  },
  typedRoutes: true,
  poweredByHeader: false,
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  // outputFileTracingIncludes, env, headers de sécurité et CSP : voir le fichier réel
}

export default withBundleAnalyzer(withNextIntl(nextConfig))
```

- **L'ordre des wrappers est porteur.** `withNextIntl` au plus près de la config, les plugins d'analyse par-dessus.
- `cacheComponents: true` remplace `experimental.ppr` et `experimental.dynamicIO`, supprimés en Next 16. Conséquence en 16.3 : `export const runtime` devient interdit dans l'arbre concerné.
- `experimental.globalNotFound: true` conditionne la structure des routes : le root layout vivant sous `[locale]`, c'est lui qui rend `global-not-found.tsx` joignable. Le retirer casse le 404 des URLs hors routes.
- `createNextIntlPlugin` reçoit le chemin du fichier de requête, il ne le devine pas.

## compose.override.yaml (ce que la version impose)

Le Postgres de dev local est le seul endroit où une contrainte de version entre dans les compose :

```yaml
services:
  postgres:
    image: postgres:18-alpine
    volumes:
      - portfolio_pgdata:/var/lib/postgresql  # PG18+ : plus /var/lib/postgresql/data
```

Topologie des deux fichiers, partage local/Dokploy, profils et healthcheck : [PRODUCTION.md](PRODUCTION.md) § CI/CD & Déploiement.

## .github/workflows/ci.yml (schéma minimal)

> Schéma d'illustration des versions d'actions, **pas la structure du fichier réel**. Celui du dépôt utilise le pattern agrégateur en trois jobs (`changes` → `quality` → `ci`) imposé par le required check de branch protection, et déclenche sur `pull_request: [main, develop]` plutôt que sur toutes les PR. Voir `.claude/rules/github-actions/workflows.md`.

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main, develop]

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
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6   # pas de `version:` : déduite de `packageManager`
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
          cache: 'pnpm'  # explicite : le cache auto pnpm a été retiré en setup-node v6
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

# 4. Initialiser shadcn/ui (style radix-nova, Tailwind v4)
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
- [ ] `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']` dans `next.config.ts`
- [ ] `prisma.config.ts` présent avec driver adapter `PrismaPg`
- [ ] Champ `output` défini dans le bloc `generator` de `schema.prisma`
- [ ] `prisma.config.ts` charge la `DATABASE_URL` via `@next/env` (Prisma 7 ne la charge plus auto)
- [ ] `src/env.ts` valide les env vars runtime via `@t3-oss/env-nextjs` + Zod (server vs client séparés, `skipValidation: !!process.env.SKIP_ENV_VALIDATION` pour tests/build)
- [ ] `moduleResolution: "bundler"` dans `tsconfig.json`
- [ ] `preserveSymlinks: false` (ou omis) dans `tsconfig.json`
- [ ] nodemailer >= 8.0.5 dans `package.json`
- [ ] Image Docker Node.js : `node:24-alpine` (pas `node:20-*`)
- [ ] Image Docker Postgres : `postgres:18-alpine` avec PGDATA adapté
- [ ] `pnpm.allowBuilds` configuré si des packages avec lifecycle scripts sont ajoutés
- [ ] next-intl >= 4.4 avec Next.js >= 16.3
- [ ] Package `motion` installé (pas `framer-motion`) si Aceternity UI
- [ ] Runner CI `ubuntu-24.04` (pas `ubuntu-latest`), actions épinglées à la majeure (§ GitHub Actions)
- [ ] Build Docker en Turbopack (défaut Next 16, aucun `--webpack`) : revalider après chaque montée de Next ou de Prisma

---

## Montées Bloquées (état au 3 septembre 2026)

Ces mises à jour majeures ont été testées puis écartées, ou identifiées et non tentées. Ne pas les rejouer sans que la contrainte listée soit levée.

| Paquet | Actuel | Disponible | Blocage | Levée attendue |
|---|---|---|---|---|
| Node.js | `24.20.0` | `26.8.1` | Node 26 est **Current**, pas LTS. Le projet suit la règle « runtime sur LTS uniquement » (`engines.node: >=24.0.0`) | Bascule LTS de la ligne 26, le 28 octobre 2026 |
| @types/node | `24.13.3` | `26.4.1` | Doit rester aligné sur le runtime réellement exécuté | En même temps que Node 26 |
| pnpm | `10.33.0` | `11.25.0` | **Aucun blocage technique identifié** : Node 24 satisfait le `>=22.13` de la v11, `pnpm/action-setup@v6` la supporte. Montée non tentée, elle touche `packageManager`, le lockfile et la CI d'un seul geste. Seul breaking à traiter : `onlyBuiltDependencies` et `neverBuiltDependencies` sont supprimés en 11.0, le projet est déjà en `allowBuilds` | À planifier, pas à subir |
| Vitest | `4.1.11` | `5.0.0` | Publiée le 3 septembre 2026, non évaluée. Exige Vite >= 6.4 et `node ^22.12 \|\| ^24 \|\| >=26` | Après lecture du guide de migration v5 |
| ESLint | `9.39.5` | `10.9.1` | `eslint-plugin-react@7.37.5` (dernière version publiée, tirée par `eslint-config-next`) déclare `peerDependencies.eslint: ^3 \|\| ... \|\| ^9.7`. Sous ESLint 10 : `TypeError: contextOrFilename.getFilename is not a function` | Publication d'un `eslint-plugin-react` compatible ESLint 10 |
| TypeScript | `6.0.3` | `7.0.2` | `typescript-eslint@8.68.0` (installée via `eslint-config-next`) déclare `peerDependencies.typescript: >=4.8.4 <6.1.0`. La 8.69.0, dernière stable, garde le même plafond : monter `typescript-eslint` ne débloque rien. `tsc --noEmit` passe, mais `eslint` casse au chargement de la config | Publication d'un `typescript-eslint` stable supportant TS 7 (seules des alphas existent). Piste intermédiaire proposée par le blog TS 7 : l'alias `typescript@npm:@typescript/typescript6` pour les outils qui ont encore besoin de l'API 6 |
| Prisma | `7.10.0` | `8.0.0-rc.12` | Release candidate, jamais en production. **Attention** : cette rc est publiée sur le dist-tag `latest` de `prisma` (la 7.10.0 est sur `prev`), un `pnpm add prisma` ou un `pnpm dlx prisma@latest` la tire. `@prisma/client` et `@prisma/adapter-pg` restent en `latest: 7.10.0` | Publication de la 8.0.0 stable |

> Les blocages ESLint et TypeScript proviennent tous deux de `eslint-config-next`. La montée de Next.js 16.2.4 vers 16.3.3, faite depuis, ne les a pas levés : la 16.3.3 tire les mêmes versions de plugins.

---

# Recommandation Finale

Verdict : Stack compatible et production-ready. Prisma 7 + Next.js 16 + PostgreSQL fonctionne en setup standard (le starter officiel `prisma/nextjs-auth-starter` valide la combo). Les gotchas principaux sont des points de configuration (chargement `.env`, `serverExternalPackages` Pino, `postinstall prisma generate`), pas des bugs bloquants. Les technologies prévues mais non installées sont traitées à part, en annexe Post-MVP.

## Points Critiques

1. **Node.js : rester sur la LTS** : image Docker `node:24-alpine` (ligne 24 « Krypton », LTS active). La 24 passe en Maintenance le 20 octobre 2026, la 26 devient Active LTS le 28 octobre 2026 : ne pas migrer avant
2. **nodemailer** : v9 depuis le 25 août 2026. La CVE CRLF (GHSA-vvjj-xcjg-gr5g) est corrigée depuis 8.0.5, ne jamais déployer une version antérieure
3. **Prisma 7 `.env` runtime** : charger via `@next/env` (`loadEnvConfig`) dans `prisma.config.ts`, la cause principale de l'erreur P1010 "User was denied access"
4. **Pino + Next.js App Router** : `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']` obligatoire dans `next.config.ts`

## ROI / Avantages

1. **Prisma 7 Rust-free** : bundle ~90% plus petit, queries ~3x plus rapides
2. **TypeScript 6 strict par défaut** : moins de config manuelle, meilleure sécurité de types
3. **Zod 4** : parsing 14x plus rapide, bundle ~57% réduit, compilation TS jusqu'à 100x plus rapide
4. **Tailwind v4 (moteur Oxide)** : builds jusqu'à 5x plus rapides
5. **Node.js 24 LTS** : V8 13.6, ~30% de perf sur cas réels
6. **Vitest 4.1** : support Vite 8, reporter agent optimisé pour IA, test tags

---

# Post-MVP : technologies non installées

Rien de ce qui suit n'existe dans le dépôt : ni dans `package.json`, ni dans les compose, ni dans les migrations. Ces entrées sont le résultat d'une recherche de compatibilité menée en amont, conservée pour ne pas la refaire, **pas un état vérifié**.

Elles sont hors du tableau principal et hors numérotation, pour une raison précise : aucun lockfile, aucun workflow, aucun fichier de config ne peut les contredire, donc rien ne signale quand elles périment. Les versions ci-dessous sont à **revalider intégralement au moment de l'implémentation**, et l'entrée rejoint alors le tableau principal avec son numéro.

> Même règle pour Sentry, absent de ce fichier : sa spec prévoit explicitement l'ajout de l'entrée au moment de l'implémentation.

## Better Auth

**Version étudiée** : `1.7.2` (relevée le `2026-09-03`, publiée le 26 août 2026 ; la 1.7.0 date du 18 août 2026)
**Stabilité** : ✅

**Breaking Changes Majeurs (v1.5 → v1.6)** :
- `freshAge` basé sur `createdAt` au lieu de `updatedAt`
- Validation `InResponseTo` activée par défaut (SAML)
- Plugin OIDC Provider déprécié au profit de `@better-auth/oauth-provider`

> Les breaking changes de la ligne 1.7 n'ont pas été relevés : à faire au moment de l'implémentation, en même temps que la revalidation de version.

**Nouvelles Features Pertinentes** :
- OpenTelemetry : distributed tracing sur endpoints/hooks/DB
- Passkey pre-auth registration
- Case-insensitive queries (`mode: 'insensitive'`)
- Hachage scrypt non-bloquant
- Joins natifs Prisma adapter (`experimental.joins: true`)
- Package size réduit de 46%

**Compatibilité Écosystème** :
- Next.js 15 : ✅
- Next.js 16 : ✅ (workaround `use cache` + `getServerSession` : extraire les cookies avant le scope cache et les passer en argument, Issue #5584 fermée NOT_PLANNED, c'est une contrainte Next.js pas un bug Better Auth)
- PostgreSQL : ✅
- Prisma v7 + `@prisma/adapter-pg` : ✅ à condition de **charger `.env` explicitement** dans `prisma.config.ts` via `@next/env` (`loadEnvConfig(process.cwd())`). L'erreur P1010 "User was denied access" vient d'une `DATABASE_URL` manquante, pas d'un bug Prisma 7
- Google OAuth : ✅ (provider built-in)

**Gotcha `.env` Prisma 7** : le chargement par `@next/env` en tête de `prisma.config.ts` est déjà en place, voir § Configuration Recommandée > prisma.config.ts.

**Recommandation** : ✅ Better Auth utilisable dès l'implémentation de l'espace admin post-MVP, sur la version courante du jour. Suivre le guide officiel [Prisma + Better Auth + Next.js](https://www.prisma.io/docs/guides/authentication/better-auth/nextjs).


## pgvector

**Version étudiée** : `0.8.6` (relevée le `2026-09-03`, taguée le 29 juillet 2026 ; 0.8.7 en préparation dans le CHANGELOG)
**Stabilité** : ✅

**Breaking Changes Majeurs** :
- v0.8.0 : abandon du support PostgreSQL 12 (support maintenu pour PG 13+)

**Sécurité** :
- **CVE-2026-3172** : buffer overflow dans les builds HNSW parallèles, corrigé en **0.8.2**

**Nouvelles Features Pertinentes** :
- v0.8.2 : correctif EXPLAIN pour PostgreSQL 18
- v0.8.1 : compatibilité PostgreSQL 18 RC1, accélération `binary_quantize`
- v0.8.0 : iterative index scan, meilleures performances HNSW

> Le contenu des versions 0.8.3 à 0.8.6 n'a pas été relevé : à lire dans le CHANGELOG au moment de l'implémentation.

**Compatibilité Écosystème** :
- PostgreSQL 18 : ✅ (depuis 0.8.1)
- Prisma 7 : ⚠️ support partiel : `Unsupported("vector")` + migrations SQL manuelles (`CREATE EXTENSION IF NOT EXISTS vector`) + TypedSQL pour les queries. Pas de support natif GA.
- Docker : ✅ image `pgvector/pgvector:pg18`

**Recommandation** : ✅ pgvector au moment de l'activation du chatbot RAG, avec un plancher de sécurité à **0.8.2** (CVE-2026-3172, versions affectées 0.6.0 à 0.8.1).


## Umami Analytics (self-hosted)

**Version étudiée** : `3.3.1` (relevée le `2026-09-03`, publiée le 20 août 2026)
**Stabilité** : ✅

**Breaking Changes Majeurs (v2 → v3)** :
- **MySQL/MariaDB supprimés**, PostgreSQL obligatoire
- Dashboard unifié retiré (remplacé par système "Boards")
- Changements API `/metrics/` non documentés (clients v2 → 400)
- Migration automatique peut perdre des event data (seuls les websites préservés)

**Nouvelles Features Pertinentes** :
- Interface redesignée avec nouvelle navigation
- Segments & Cohorts : filtres sauvegardables
- Filtres universels via query strings (URLs partageables)
- Tracking Links et Pixels

**Sécurité** :
- **CVE-2025-66478** patchée en **3.0.2** (4 décembre 2025) ; la 3.0.3 (12 décembre 2025) corrige l'advisory Next.js du 11 décembre

> Le contenu des versions 3.1 à 3.3 n'a pas été relevé : à lire dans les releases au moment de l'implémentation.

**Compatibilité Écosystème** :
- PostgreSQL : ⚠️ minimum v12.14, le compose officiel utilise PG 15. L'issue #3888 (PG 17.6) est **fermée `not_planned`** depuis le 22 février 2026 : PG 18 reste à valider en staging, sans issue upstream ouverte pour l'appuyer
- Docker : ✅ image `ghcr.io/umami-software/umami`
- Next.js : ✅ Umami est lui-même en Next.js 16.3.0 sur `master`

**Issues connues** :
- Géolocalisation "Unknown" depuis v2 → v3 (issue #3701)
- Dashboard parfois inaccessible "Server Action was not found" (issue #3859)
- Migration MySQL → PostgreSQL problématique

**Recommandation** : ✅ Umami avec **base PostgreSQL dédiée**, plancher de sécurité **>= 3.0.2**. Valider PG 18 en staging.


## Compatibilité croisée, à revalider

| A | B | Compatibilité | Notes |
|---|---|---|---|
| Next.js 16.3.3 | Better Auth 1.7.2 | ✅ | `getServerSession` + `use cache` : extraire les cookies avant le scope cache (workaround trivial, Issue #5584) |
| Prisma 7.10.0 | Better Auth 1.7.2 | ✅ | L'URL de base est disponible au runtime via les variables d'environnement. `prisma.config.ts` concerne uniquement la CLI Prisma, pas le runtime Better Auth |
| Prisma 7.10.0 | pgvector 0.8.6 | ⚠️ | Support partiel : `Unsupported("vector")` + SQL manuel |
| PostgreSQL 18.6 | pgvector 0.8.6 | ✅ | Support PG 18 depuis 0.8.1 |
| PostgreSQL 18.6 | Umami 3.3.1 | ⚠️ | Aucun retour upstream sur PG 18 (issue #3888, PG 17.6, fermée `not_planned`), à valider en staging |

## Conflits à anticiper

| Conflit | Risque | Solution |
|---|---|---|
| pgvector < 0.8.2 + CVE-2026-3172 | 🔴 Critique | Utiliser pgvector 0.8.2 minimum dès l'activation du RAG |
| Umami + PostgreSQL 18 | 🟡 Moyen | Valider en staging avant prod, base dédiée séparée de celle du portfolio |
| Better Auth + `use cache` (Next.js 16) | 🟢 Faible | Extraire les cookies via `(await cookies()).toString()` **avant** le scope cache, passer en argument à `getServerSession` (Issue #5584) |

## Checklist au moment de l'implémentation

- [ ] Revalider la version courante et les breaking changes intervenus depuis
- [ ] Créer l'entrée numérotée dans la vue d'ensemble et dans les détails, en fin de sa catégorie
- [ ] Reporter les lignes de compatibilité et de conflit ci-dessus dans les tableaux principaux
- [ ] pgvector : version >= 0.8.2 (CVE-2026-3172)
- [ ] Umami : version >= 3.0.2 (CVE-2025-66478), base PostgreSQL dédiée, validation PG 18 en staging


## Ressources post-MVP

- [pgvector : GitHub](https://github.com/pgvector/pgvector)
- [pgvector 0.8.2 Release](https://www.postgresql.org/about/news/pgvector-082-released-3245/)
- [Better Auth : Changelog](https://better-auth.com/changelog)
- [Better Auth + Prisma + Next.js](https://www.prisma.io/docs/guides/authentication/better-auth/nextjs)
- [Google Cloud Console : OAuth 2.0](https://console.cloud.google.com/apis/credentials)
- [Umami : Installation](https://docs.umami.is/docs/install)
- [Umami v3 Blog](https://umami.is/blog/umami-v3)

---

# 🔗 Ressources

## Documentation Officielle

### Runtime & Tooling

- [Node.js : Releases](https://nodejs.org/en/about/previous-releases)
- [Node.js v22 → v24 Migration Guide](https://nodejs.org/en/blog/migrations/v22-to-v24)
- [pnpm : Installation](https://pnpm.io/installation)
- [pnpm : Working with TypeScript](https://pnpm.io/next/typescript)
- [TypeScript 6.0 Release](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)

### Framework & UI

- [Next.js : Upgrade v16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16 Blog](https://nextjs.org/blog/next-16)
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [Tailwind CSS : Upgrade Guide v4](https://tailwindcss.com/docs/upgrade-guide)
- [shadcn/ui : Installation Next.js](https://ui.shadcn.com/docs/installation/next)
- [shadcn/ui : Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [shadcn/ui : React 19](https://ui.shadcn.com/docs/react-19)
- [Magic UI : Docs](https://magicui.design/docs)
- [Aceternity UI : Install Next.js](https://ui.aceternity.com/docs/install-nextjs)
- [next-intl 4.0 Blog](https://next-intl.dev/blog/next-intl-4-0)

### Librairies applicatives

- [Zod v4 Migration](https://zod.dev/v4/changelog)
- [nodemailer : Documentation](https://nodemailer.com/)
- [nodemailer : GitHub Releases](https://github.com/nodemailer/nodemailer/releases)
- [Pino : getpino.io](https://getpino.io)
- [pino-nextjs-example](https://github.com/pinojs/pino-nextjs-example)

### Tests

- [Vitest 4.0 Blog](https://vitest.dev/blog/vitest-4)
- [Vitest : Migration Guide](https://main.vitest.dev/guide/migration)
- [Testing: Vitest | Next.js](https://nextjs.org/docs/app/guides/testing/vitest)

### Base de données

- [PostgreSQL 18 : Release Notes](https://www.postgresql.org/docs/current/release-18.html)
- [Prisma : Migration v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Prisma + Next.js](https://www.prisma.io/docs/guides/frameworks/nextjs)
- [Prisma : Supported Databases](https://www.prisma.io/docs/orm/reference/supported-databases)
- [prisma/nextjs-auth-starter](https://github.com/prisma/nextjs-auth-starter), starter officiel Prisma 7 + Next.js 16 + Better Auth

### CI / CD

- [GitHub Actions : ubuntu-24.04 runner](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)

## Ressources Complémentaires

- [endoflife.date : Node.js](https://endoflife.date/nodejs)
- [endoflife.date : PostgreSQL](https://endoflife.date/postgresql)
- [endoflife.date : pnpm](https://endoflife.date/pnpm)
- [Docker Hub : node:24-alpine](https://hub.docker.com/_/node)
- [Docker Hub : postgres:18](https://hub.docker.com/_/postgres)
- [GHSA-vvjj-xcjg-gr5g : nodemailer CRLF](https://github.com/advisories/GHSA-vvjj-xcjg-gr5g)
- [The Twelve-Factor App](https://12factor.net/)
