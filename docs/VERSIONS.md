---
title: "VERSIONS : Thibaud Geisler Portfolio"
description: "Matrice de compatibilité, versions recommandées et configuration pour la stack Next.js + Prisma + PostgreSQL du portfolio (MVP + post-MVP)."
date: "2026-10-29"
keywords: ["versions", "dependencies", "compatibility", "setup", "nextjs", "prisma", "postgresql", "docker", "dokploy"]
scope: ["docs", "config", "setup"]
technologies: ["Node.js", "pnpm", "TypeScript", "Next.js", "React", "Tailwind CSS", "shadcn/ui", "cn", "Magic UI", "Aceternity UI", "ReUI", "dnd-kit", "@date-fns/tz", "motion", "next-intl", "@icons-pack/react-simple-icons", "country-flag-icons", "Zod", "nodemailer", "Pino", "@next/env", "@t3-oss/env-nextjs", "server-only", "react-calendly", "c15t", "react-markdown", "remark-gfm", "Sentry", "@aws-sdk/client-s3", "Better Auth", "sharp", "decode-ico", "Tiptap", "tippy.js", "Vitest", "@vitejs/plugin-react", "PostgreSQL", "Prisma", "GitHub Actions"]
---

> **Périmètre : ce que le dépôt déclare.** Versions npm lues dans `pnpm-lock.yaml` (ce qui est résolu, pas les plages de `package.json`), images et actions lues dans le `Dockerfile`, les compose et les workflows. Relevé le **9 octobre 2026**, versions npm remontées en patch et mineure le **27 octobre 2026** (Node.js, `@types/node`, better-auth, `@aws-sdk/client-s3`, lucide-react, motion et shadcn : **29 octobre 2026**) (pnpm et Prettier : **11 octobre 2026**), sauf les lignes dnd-kit (**8 octobre 2026**), sharp et decode-ico (**12 octobre 2026**), Tiptap et tippy.js (**14 octobre 2026**).

> **La plateforme d'hébergement est hors périmètre.** Docker Engine, Docker Compose, Dokploy et Cloudflare R2 ne sont déclarés par aucun fichier versionné ici : ils sont documentés dans [PRODUCTION.md](PRODUCTION.md) § Mises à jour > Plateforme d'hébergement.

---

# Vue d'ensemble

## Runtime & Tooling

| Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|
| Node.js | `26.13.0` | ✅ LTS Active | Ligne 26 « Lithium », patch épinglé par `devEngines.runtime` (`onFail: download`), repris par le tag `node:26.13.0-alpine`. Montée manuelle : Dependabot ne monte pas `devEngines.runtime` (dependabot-core#13722, relevé le 2026-10-29). Active LTS depuis le **28 octobre 2026** (`nodejs.org/dist/index.json`, relevé le 29 octobre 2026) |
| pnpm | `12.15.0` | ⚠️ | Épinglé par `devEngines.packageManager` (`onFail: download`) depuis le 15 octobre 2026, lu par le Dockerfile, la CI et chaque poste. Lockfile à deux documents : alertes de sécurité npm de GitHub non fiables tant que [dependabot-core#15904](https://github.com/dependabot/dependabot-core/issues/15904) est ouverte. Détail : § pnpm |
| TypeScript | `6.0.3` | ✅ | **TS 7 bloqué** : `typescript-eslint` plafonne à `typescript <6.1.0`, cf. § Montées Bloquées |
| ESLint | `10.13.0` | ✅ | Typed linting **adopté le 2026-09-06** : `typescript-eslint@8.72.1` en devDependency directe, `strictTypeChecked` + `stylisticTypeChecked`, `projectService: true`. Parti de 92 erreurs, ramené à 0. Deux réglages en portent 78 : `restrict-template-expressions` avec `allowNumber: true` (67, retour au défaut de la règle, `allowAny`/`allowNullish`/`allowBoolean` restent à `false`) et `unbound-method` désactivée sur `**/*.test.ts(x)` seulement (11, un mock se lit par référence et n'est jamais appelé ; `vi.mocked()` déclenche la même erreur, mesuré). ESLint 10 depuis le 9 octobre 2026, cf. § Conflits Potentiels |
| Prettier | `3.9.10` | ✅ | `eslint-config-prettier` `10.1.8` en dernier bloc de la flat config ; `prettier-plugin-tailwindcss` `0.8.1` trie les classes (`.prettierrc`, feuille `src/app/globals.css`) |
| just | `1.58.0` (plancher) | ✅ | `set minimum-version := "1.58.0"` dans le `Justfile`, pas une version épinglée : la composite `.github/actions/setup-just` lit ce plancher et installe cette version en CI (relevé le 29 octobre 2026) |
| tsx | `4.23.15` | ✅ | Scripts TypeScript hors Next (relevé le 29 octobre 2026) |
| @types/node | `26.6.5` | ✅ | Même ligne majeure que le runtime (relevé le 29 octobre 2026) |

## Framework & UI

| Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|
| Next.js | `16.4.3` | ✅ | Publiée le 23 octobre 2026, installée le 27 octobre 2026 (date du registre npm, la date de relevé est celle de vérification dans ce dépôt). `next`, `@next/env` et `eslint-config-next` se montent ensemble. Pièges 16.3 et 16.4 : § Next.js |
| React | `19.3.1` | ✅ | Bundlé avec Next.js 16. `<ViewTransition>` et Fragment Refs stables depuis la 19.3 (blog react.dev du 9 septembre 2026). `@types/react` et `@types/react-dom` en `19.3.0` |
| Tailwind CSS | `4.3.3` | ✅ | `@tailwindcss/typography` `0.5.20` (classe `prose` pour le HTML de react-markdown, chargé par `@plugin` dans `src/app/globals.css`), `tw-animate-css` `1.4.0` (remplace `tailwindcss-animate`, incompatible v4) |
| shadcn/ui (CLI) | `shadcn@4.23.0` | ✅ | Composants copiés localement, style `radix-nova`. Détail : § shadcn/ui et registries |
| cn | `0.5.0` | ⚠️ | Merge des classes Tailwind importé par les composants du registry shadcn depuis septembre 2026. Remplace `clsx` + `tailwind-merge` depuis le 9 octobre 2026 (`shadcn migrate cn`), `src/lib/utils.ts` le réexporte. Pré-1.0 : son README annonce la même sortie que `tailwind-merge` v3 (356 000 tests différentiels). 0.4.0 → 0.5.0 (16 octobre 2026) : aucun breaking sur `cn()`, Node 22 minimum ([changelog](https://github.com/shadcn-ui/cn/releases/tag/cn%400.5.0)) |
| Magic UI | copy-paste (no semver) | ✅ | Installation via `shadcn@latest add` |
| Aceternity UI | copy-paste (no semver) | ✅ | Actif (dernière entrée de changelog : 17 août 2026). Utilise `motion`, pas `framer-motion` |
| ReUI | copy-paste (no semver) | ✅ | Registre `@reui` via le CLI shadcn, style `radix-nova`. `Kanban` et `EventCalendar` installés (9 octobre 2026) |
| dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`) | `6.3.1`, `10.0.0`, `3.2.2` | ✅ | Glisser-déposer du `Kanban` ReUI, seul code qui les importe (8 octobre 2026) : ne pas les monter isolément du composant, qui en épouse l'API. `sortable` 10.0.0 exige `core` `^6.3.0` |
| @date-fns/tz | `1.5.0` | ✅ | Fuseaux de l'`EventCalendar` ReUI, compagnon de `date-fns` (`4.4.0`), relevé le 9 octobre 2026 |
| motion | `14.7.1` | ✅ | Animations Magic UI et Aceternity (`motion/react`, v12+ requise). v14 depuis le 9 octobre 2026 : « There are no breaking changes in Motion for React in version 14 » (guide de migration officiel) |
| next-intl | `4.14.9` | ✅ | Nécessite Next.js >= 16.3 pour `use cache`. `alternateLinks: false` : les hreflang viennent des seules métadonnées. Détail : § next-intl |
| @icons-pack/react-simple-icons | `13.15.1` | ✅ | Logos techs/marques des badges de stack (DESIGN.md § Mapping Composants), imports nommés dans `src/lib/icons.tsx`. Un export peut disparaître à une majeure si la marque disparaît de Simple Icons : `tsc --noEmit` l'attrape. Lucide pour l'UI, ne pas mélanger sur un même rôle |
| country-flag-icons | `1.6.20` | ✅ | Drapeaux SVG du LanguageSwitcher (FR et GB, ratio 3:2). Pas de type public : le mapping se type par `satisfies Record<Locale, typeof FR>` (TS 6) |
| lucide-react | `1.63.0` | ✅ | Icônes de l'UI, fournies avec shadcn/ui (relevé le 29 octobre 2026) |
| radix-ui | `1.8.1` | ✅ | Primitives des composants shadcn `radix-nova` |
| class-variance-authority | `0.7.1` | ✅ | Variantes (`cva`) des composants shadcn |
| cmdk | `1.1.1` | ✅ | Composant shadcn `command` |
| react-day-picker | `10.0.2` | ✅ | Composant shadcn `calendar` |
| sonner | `2.0.8` | ✅ | Composant shadcn `sonner` |

## Librairies applicatives

| Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|
| Zod | `4.6.7` | ✅ | Validateurs string en top-level (`z.email()`) |
| nodemailer | `10.2.1` | ✅ | v10 le 3 octobre 2026 : types embarqués, `@types/nodemailer` retiré (DefinitelyTyped n'a publié ni 9.x ni 10.x, ne pas le réinstaller). Planchers : **>= 8.0.5** (GHSA-vvjj-xcjg-gr5g, CRLF injection) et **>= 10.0.11** (10.0.0 à 10.0.10 cassaient l'entrée CommonJS et la forme des types, rétablies le 27 septembre 2026). v9 (TLS validé sur le contenu distant) et v8 (`ENOAUTH`) sans effet : le transport IONOS est un SMTP direct sans proxy, OAuth2 ni pièce jointe distante |
| Pino | `10.4.0` | ✅ | `pino-pretty` `13.2.0`. `pino`, `pino-pretty` et `thread-stream` sont dans la liste `serverExternalPackages` par défaut de Next (`node_modules/next/dist/lib/server-external-packages.jsonc`), que `next.config.ts` redéclare pour documenter la dépendance. `thread-stream@4.2.0` en dépendance directe : Pino ne le résout pas toujours seul sous pnpm strict |
| @next/env | `16.4.3` | ✅ | Épinglé à la version exacte de Next. Charge `.env` hors runtime Next (`prisma.config.ts`, `vitest.env-loader.ts`) : Prisma 7 ne le fait plus, sans lui la CLI tourne sans `DATABASE_URL` (erreur P1010). `loadEnvConfig(process.cwd())` avant tout import qui lit `process.env` |
| @t3-oss/env-nextjs | `0.13.11` | ✅ | Validation Zod des env vars dans `src/env.ts`, séparation server/client. `skipValidation: !!process.env.SKIP_ENV_VALIDATION` : la CI pose `SKIP_ENV_VALIDATION: 'true'` dans `ci.yml`, sinon `just build` échoue. Version `0.x` : relire le changelog même pour une mineure |
| server-only | `0.0.1` | ✅ | Garde-fou client/serveur (convention : `.claude/rules/nextjs/data-fetching.md`). Sans implémentation hors bundler Next : Vitest l'alias vers `__mocks__/server-only.ts` (`resolve.alias` de `vitest.config.ts`), sans quoi tout test d'un module protégé échoue à l'import. Figé depuis septembre 2022, normal |
| react-calendly | `4.4.0` | ✅ | `InlineWidget` et `useCalendlyEventListener` (`CalendlyWidget.tsx`). Iframe : la CSP doit l'autoriser ([PRODUCTION.md](PRODUCTION.md) § Sécurité & Configuration > Security Headers), montage conditionné au consentement marketing (§ c15t). Dernière publication en mai 2025 : peu actif |
| c15t | `3.1.0` | ✅ | CMP de consentement cookies. Monté en v3 le 27 octobre 2026. Détail : § c15t |
| react-markdown | `10.1.0` | ✅ | Markdown des case studies et pages légales (`MarkdownContent.tsx`). `defaultUrlTransform` neutralise `javascript:`, HTML brut désactivé, `rehype-raw` absent : **ne pas poser de `urlTransform` ni ajouter `rehype-raw` sans revalider**. `remark-gfm` `4.0.1`, paquet distinct à monter avec lui (sans lui un tableau markdown se rend en texte brut) |
| pg | `8.23.1` | ✅ | Driver consommé par `@prisma/adapter-pg` (relevé le 29 octobre 2026). `@types/pg` même version |
| Sentry (`@sentry/nextjs`) | `11.9.0` | ⚠️ | ADR-017. **v11 : un `dataCollection` absent collecte tout**, d'où `SENTRY_DATA_COLLECTION` dans les trois `Sentry.init`. Spans des Server Actions absents sous Turbopack (relevé en 11.1.0, non revalidé en 11.9.0). Détail : § Sentry |
| @aws-sdk/client-s3 | `3.1158.0` | ✅ | Client S3 pour Cloudflare R2 (ADR-011). `requestChecksumCalculation: 'WHEN_REQUIRED'` obligatoire, R2 rejette le CRC32 par défaut du SDK. Détail : [knowledges/cloudflare-r2.md](knowledges/cloudflare-r2.md) |
| Better Auth | `1.7.14` | ✅ | Admin, Google OAuth unique provider, aucun Credentials (ADR-002). Détail : § Better Auth |
| sharp | `0.35.5` | ✅ | Conversion PNG des logos récupérés (ADR-023). Même version que la dépendance optionnelle de Next 16.4.3 (`^0.35.5`), épinglée sans `^` pour garder une seule copie (binaires natifs) : l'aligner sur Next à chaque montée de Next (épingle passée à 0.35.5 le 12 octobre 2026) |
| decode-ico | `0.4.1` | ✅ | Plus grande image d'un conteneur ICO, que sharp ne lit pas (spec `domaine-freelance-crm/06`, amendement du 12 octobre 2026). JavaScript pur, trois dépendances du même auteur, dernière publication en novembre 2022 : sur alerte de sécurité sans correctif, le remplacer par un parseur maison des seules entrées PNG et DIB 32 bits. Épinglé sans `^` |
| Tiptap (15 paquets `@tiptap/*`) | `3.32.0` | ⚠️ | Moteur du « Pages CMS Editor » (ADR-024). Épinglés sans `^`, à monter ensemble. Détail : § Tiptap |
| tippy.js | `6.3.7` | ✅ | Popup du menu `/` de l'éditeur (`slash-command/suggestion.tsx`), importé par le code copié et non par Tiptap 3 (Floating UI). Reste tant que ce fichier l'importe |

## Tests

| Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|
| Vitest | `5.0.5` | ✅ | `vite` est une peer obligatoire depuis la v5 (>= 6.4, résolu en `8.2.2`). `clearMocks: true` par défaut, `vi.mock` hors top-level lève une erreur. Suite passée sans modification de code ni de config (CI verte, PR #155, 3 octobre 2026). Les async Server Components ne sont pas testables en unit (E2E Playwright). `jsdom@30`, `@testing-library/react 16.x`, `@testing-library/dom` `10.4.2` (peer déclarée, relevé le 29 octobre 2026), `@testing-library/jest-dom@7` |
| @vitejs/plugin-react | `6.1.2` | ✅ | Plugin documenté par Next 16 pour Vitest, transform Babel (pas SWC). Peer `vite ^8.0.0` |

## Base de données

| Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|
| PostgreSQL | `18.6` | ✅ | Publiée le 13 août 2026 (`postgresql.org/versions.json`). Image `postgres:18-alpine` (`compose.override.yaml`, service containers de `ci.yml` et `deploy.yml`), aucun patch épinglé. PG18+ : `PGDATA` versionné, monter `/var/lib/postgresql` et non `/var/lib/postgresql/data` |
| Prisma ORM | `7.10.1` | ✅ | ESM-only, driver adapter obligatoire, `.env` non auto-chargé. Détail : § Prisma ORM |

## CI / CD

| Technologie | Version Recommandée | Statut Production | Notes Critiques |
|---|---|---|---|
| GitHub Actions (runner) | `ubuntu-24.04` | ✅ | Actions épinglées par SHA, inventaire en § GitHub Actions |
| actionlint | `1.7.12` | ✅ | Appelé par `just lint`, absent des runners : `ci.yml` télécharge le script épinglé au commit du tag, en lui passant `1.7.12` (relevé le 29 octobre 2026). Local : `winget install rhysd.actionlint` |

---

# Détails par Technologie

## Runtime & Tooling

### 1. Node.js

**Version actuelle** : `26.13.0` (LTS Active, « Lithium », publiée le 28 octobre 2026, V8 14.6, npm 11.20.0 : `nodejs.org/dist/index.json`, relevé le 29 octobre 2026)
**Stabilité** : ✅

**Le patch est épinglé** : `devEngines.runtime` (poste et CI) et le tag `node:26.13.0-alpine` du Dockerfile se montent ensemble, à la main pour le premier, par PR Dependabot (`docker`) pour le second. Image alpine : `sharp` et les moteurs Prisma publient des binaires musl (aucun `libc6-compat` depuis le 9 octobre 2026).

**Breaking Changes** : notes `v26.0.0` du 2026-05-05 relues le 2026-10-29, aucune ne touche le code du projet (grep du 2026-10-29).

**Compatibilité Écosystème** :
- Prisma 7 : `engines` de `prisma@7.10.1` = `^20.19 || ^22.12 || >=24.0` (les lignes impaires 21 et 23 sont exclues)
- pnpm 12 : `engines.node >=18` (métadonnées npm, relevé le 11 octobre 2026)

**Calendrier** : Node.js 20 EOL depuis le **30 avril 2026**, 22 en Maintenance LTS, 24 en Maintenance depuis le **20 octobre 2026**, 26 Active LTS depuis le **28 octobre 2026** jusqu'au 20 octobre 2027 puis Maintenance jusqu'au 30 avril 2029 (`schedule.json` de `nodejs/Release`, relevé le 29 octobre 2026). Une ligne impaire (27) n'est jamais LTS : rester sur une 26.x exacte. Corepack n'est plus utilisé depuis le 15 octobre 2026 (retiré de Node à partir de la 25) : pnpm s'installe par `npm install -g pnpm@12` dans l'image.

**Vérifié le 29 octobre 2026** sur 26.13.0 : `just lint`, `just typecheck`, `just test` (unit et intégration), `just build` verts, `pnpm audit` sans high, `docker build --target runner` passe et l'image exécute Node 26.13.0, Prisma 7.10.1 et sharp 0.35.5.

**Recommandation** : ✅ Node.js 26 LTS, ne jamais redescendre sur 20.

### 2. pnpm

**Version actuelle** : `12.15.0` (`devEngines.packageManager` à la place du champ `packageManager` lu par Corepack, depuis le 15 octobre 2026)
**Stabilité** : ⚠️ (alertes de sécurité Dependabot, voir Compatibilité)

**Breaking Changes qui touchent le projet** :
- **`allowBuilds` va dans `pnpm-workspace.yaml`**, seul emplacement documenté et seul où le projet l'a vu pris en compte (constat projet, une déclaration dans `package.json` reste sans effet). Chaque package listé explicitement, les globs ne sont pas supportés ([issue #11171](https://github.com/pnpm/pnpm/issues/11171), ouverte le 2 avril 2026). Depuis la 11, **`strictDepBuilds` vaut `true`** : une dépendance à scripts de build absente d'`allowBuilds` fait échouer l'install. Le projet y a ajouté `esbuild: false`, dont le script était déjà ignoré en pnpm 10 (binaire fourni par `@esbuild/<plateforme>`)
- **`minimumReleaseAge` vaut 1 440 min par défaut**, non strict : la résolution retombe sur une version trop récente. Mais `pnpm install --frozen-lockfile` réapplique la règle à chaque entrée du lockfile et échoue (constaté le 9 octobre 2026). `pnpm add` d'une version de moins de 24 h écrit des `minimumReleaseAgeExclude` dans `pnpm-workspace.yaml`, à retirer une fois le délai passé
- **Lockfile à deux documents** (12.0, dès que `devEngines.packageManager` est déclaré) : le premier porte `packageManagerDependencies` (la résolution de pnpm lui-même), `pnpm install --frozen-lockfile` échoue (`ERR_PNPM_FROZEN_LOCKFILE_WITH_OUTDATED_LOCKFILE`) s'il manque, `pnpm install` le régénère à chaque montée. `lockfileVersion` reste `'9.0'`
- Une clé inconnue de `pnpm-workspace.yaml` fait échouer la commande (`ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS`) quand le pnpm courant satisfait la version épinglée, sinon un warning
- `pnpm install --frozen-lockfile false` n'existe plus : `--no-frozen-lockfile`
- `.npmrc` ne porte plus que registre et authentification, le reste va dans `pnpm-workspace.yaml`

**Compatibilité Écosystème** :
- TypeScript : ne pas activer `preserveSymlinks: true` (résolution des types cassée)
- `pnpm/setup@v3.1.2` : lit `devEngines.packageManager` et `devEngines.runtime` et installe les dépendances en un step
- Dependabot : ⚠️ PR de mise à jour fonctionnelles ; alertes de sécurité npm non fiables, le graphe de dépendances GitHub ne lisant que le premier document du lockfile ([dependabot-core#15904](https://github.com/dependabot/dependabot-core/issues/15904), ouverte au 15 octobre 2026). Son cooldown par défaut (3 jours) couvre le `minimumReleaseAge` des mises à jour de version, pas celui des mises à jour de sécurité

**Issues connues** : le stage `deploy-prisma` du Dockerfile logue « Shared workspace lockfile detected but configuration forces legacy deploy implementation » : attendu, `--legacy` est voulu.

**Vérifié** le 27 octobre 2026 sur 12.15.0 (`pnpm install --frozen-lockfile`, `pnpm audit` vide, `just lint`, `just typecheck`, `just test`, `just build` verts) et le 11 octobre 2026 sur 12.11.2 (idem, plus `docker build --target deploy-prisma`, `pnpm deploy --legacy --prod` inclus).

**Recommandation** : ✅ pnpm 12.15.0 (ADR-008). `package.json` est la seule source de la version (`devEngines.packageManager`, `onFail: download`). Montée : changer la version, `pnpm install`, committer le lockfile. Même schéma que les autres projets pnpm et uv du poste, aligné le 15 octobre 2026.

## Framework & UI

### 1. Next.js

**Version actuelle** : `16.4.3` (publiée le 23 octobre 2026)
**Stabilité** : ✅

**Breaking Changes qui touchent le projet** :
- **`middleware.ts` → `proxy.ts`** : export nommé `proxy` OU `export default` (le build échoue si aucun des deux), runtime `edge` non supporté (`nodejs` seulement)
- **Turbopack par défaut pour `next dev` ET `next build`** (opt-out `--webpack`, retiré du projet, cf. § Prisma ORM)

**Depuis la 16.3** :
- `export const runtime` interdit quand `cacheComponents: true`. **Constat projet** (commit `8a2b1d8`, le build rejette ce segment config), pas une règle documentée upstream (la release 16.3.0 ne mentionne que la dépréciation du runtime edge, le guide Cache Components se limite à « requires the Node.js runtime »). Retiré des `opengraph-image.tsx`
- `next build` lance le `tsc` local (`experimental.useTypeScriptCli`, actif par défaut) : tout le projet du `tsconfig.json` est vérifié au build, tests compris
- `ImageResponse` : RCE critique de 16.2.0 à 16.3.5 (CVE-2026-94545), corrigée en 16.3.6, plancher à ne jamais franchir à la baisse

**Depuis la 16.4** ([blog](https://nextjs.org/blog/next-16-4), PR [#97397](https://github.com/vercel/next.js/pull/97397) et [#99452](https://github.com/vercel/next.js/pull/99452)) :
- **Strict route matching par défaut** : une URL qui ne forme pas un arbre de routes complet est rejetée, les catch-all incomplets élagués. Échappatoire temporaire `deprecated.looseRouteMatching: true` (nommée par la PR, sans page de doc). Build sans signalement et 404 d'un slug projet inconnu (rewrite du proxy) vérifiés sur l'image le 9 octobre 2026
- **Warning si `cacheComponents` est actif sans `partialPrefetching` défini** : le projet le pose à `true`. Les deux options disparaissent à la majeure suivante
- `eslint-config-next@16.4.0` supporte ESLint 10 ([#99628](https://github.com/vercel/next.js/pull/99628)), cf. § Conflits Potentiels

**Compatibilité Écosystème** (peers lus à l'installation) : React `^19.0.0` (19.3.1 installée), next-intl `^16.0.0`, Sentry `^16.0.0-0`.

**Recommandation** : ✅ Next.js 16.4.3, guide officiel Prisma + Next.js pour la config client/adapter.

### 2. shadcn/ui et registries

**Version actuelle** : `shadcn@4.23.0` (CLI) ; Magic UI, Aceternity UI et ReUI sans versioning sémantique (copy-paste via registry shadcn)
**Stabilité** : ✅

**Décisions du projet** :
- Style `radix-nova`. Depuis juillet 2026 `init` choisit la base `base` (Base UI) par défaut ([changelog](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)) : toujours `-b radix`, qui n'est pas déprécié. Style : `DESIGN.md` § Style shadcn
- Depuis septembre 2026 les composants du registry importent `cn` depuis le paquet npm `cn` ([changelog](https://ui.shadcn.com/docs/changelog/2026-09-cn)) : rien ne casse sans migrer, mais chaque `add` installe `cn` à côté de `clsx` + `tailwind-merge`. Migré le 9 octobre 2026 par `shadcn migrate cn`, qui n'a touché que `src/lib/utils.ts` (réexport) et `package.json`
- Ne pas installer `shadcn-ui` (paquet npm déprécié)
- ReUI : registre `@reui` déclaré dans `components.json` (`https://reui.io/r/{style}/{name}.json`). Le code livré demande les mêmes corrections que les autres registries (import `cn` du paquet npm à réécrire vers `@/lib/utils`, puis `pnpm remove cn`), plus `Context.Provider` à passer en `<Context value>` et les lectures indexées à sécuriser pour `noUncheckedIndexedAccess` (`.claude/rules/shadcn-ui/setup.md`). Relire le fichier livré, lancer `just typecheck` et `just lint` après chaque ajout

**Pièges** :
- Magic UI : shadcn CLI > 2.8.0 peut générer des imports sans alias `@/` dans certains composants, vérifier après ajout (`@/lib/utils`). `magicui-cli` est dormant (dernière publication en juillet 2024, ne pas l'utiliser), `@magicuidesign/cli` reste l'installeur documenté du serveur MCP
- Aceternity UI : `motion` v12+ (`motion/react`), jamais `framer-motion` (remplacement étendu à tous les templates le 15 juillet 2026) ; le paquet npm `aceternity-ui` (v0.2.2) est abandonné ; syntaxe namespacée `@aceternity/<component>` (CLI 3.0+)

### 3. next-intl

**Version actuelle** : `4.14.9`
**Stabilité** : ✅

- `getTranslations()` incompatible avec `use cache` sur Next.js 16.0 à 16.2, **résolu à partir de la 16.3** : la 16.3.0 active les root params par défaut (PR #93863) et génère leurs types (PR #91019). [amannn/next-intl#1493](https://github.com/amannn/next-intl/issues/1493) est fermée le 4 août 2026 en citant « nextjs 16.3 root-params ». Aucune peer ne l'impose : `next-intl@4.14.9` déclare `next: ^12 || … || ^16`
- Le middleware pose par défaut des headers `Link` hreflang (`alternateLinks`), calculés sans les métadonnées de la page : `alternateLinks: false` dans `src/i18n/routing.ts` depuis le 9 octobre 2026, `alternates.languages` de `seo.ts` reste la seule source
- `localeDetection: false` coupe la détection par `accept-language` et par cookie, `localeCookie: false` seulement le cookie (deux options distinctes, aucune dépréciée)

## Librairies applicatives

### 1. c15t

**Version actuelle** : `3.1.0` (avec `@c15t/translations` à la même version, à monter ensemble ; montée depuis `@c15t/nextjs` 2.3.0 le 27 octobre 2026)
**Stabilité** : ✅

CMP headless Apache 2.0, mode `offline`, juridiction forcée FR. Le paquet à installer est `c15t` (imports `c15t`, `c15t/next`, `c15t/react`) : `@c15t/nextjs` reste publié à la même version mais n'exporte pas le transport `offline()` dont le provider a besoin. `ConsentProvider`, `ConsentBanner`, `ConsentDialog` dans `src/app/providers.tsx`, `ConsentTheme` dans le layout serveur. Fiche : [knowledges/c15t.md](knowledges/c15t.md).

**Breaking Changes v2 → v3 qui touchent le projet** :
- `mode: 'offline'` devient `offline({ policyRules })` (transport de `c15t/react`), avec `policyRulePresets.europeOptIn()` pour garder l'opt-in
- `options.theme` ne génère plus de CSS : tokens rendus par `ConsentTheme` côté serveur, `theme.slots` s'applique enfin. Les classes de c15t 3 se doublent (spécificité 0,2,0) : un slot de layout demande le suffixe `!`

**Visiteurs existants** (constat du 27 octobre 2026 sur un build de production, accepté par le propriétaire) : même clé `c15t` (localStorage et cookie), un enregistrement v2 est lu sans être réécrit. Un refus v2 reste respecté (pas de bannière, Calendly bloqué), un accord v2 est redemandé une fois (Calendly bloqué jusqu'au nouveau choix).

**Rendu** : styles calculés et captures (FR et EN, clair et sombre, 1280 px et 320 px) comparés à c15t 2, identiques. Les slots de `src/components/cookies/consent-theme.ts` ramènent le pied de la modale et les liens (non soulignés) au rendu v2. Écarts acceptés : titres en `h2`, boutons d'accordéon en Geist, boutons de la bannière mobile à 4 à 8 px près. Arbitrage : [DESIGN.md](DESIGN.md) § Mapping Composants > Overlays.

**Ce que le consentement conditionne** : `useConsent('marketing')` gouverne le montage de Calendly, sans accord un placeholder est rendu.

### 2. Sentry (`@sentry/nextjs`)

**Version actuelle** : `11.9.0`
**Stabilité** : ⚠️ (spans des Server Actions absents sous Turbopack, relevé en 11.1.0)

Monitoring cloud, le self-hosted étant exclu par [ADR-017](adrs/017-observabilite-cloud.md) (4 cœurs et 16 Go de RAM minimum, hors de portée du VPS). Capture d'erreur vérifiée côté serveur, edge et navigateur ; tracing actif pour routes, pages et queries Prisma, sans tracing navigateur ni Session Replay. Fiche : [knowledges/sentry.md](knowledges/sentry.md).

**Breaking Changes v10 → v11 qui touchent le projet** :
- **`sendDefaultPii` remplacé par `dataCollection`, et le défaut s'inverse** (guide de migration v10 → v11). Sans `dataCollection`, le SDK collecte identité et IP, cookies, en-têtes, corps de requête et de réponse, paramètres d'URL, données des requêtes base et variables locales des stack frames ; seules les valeurs dont le nom figure dans sa denylist (`token`, `auth`, `password`…) sont masquées
- `enableLogs` et `enableMetrics` supprimés : logs et métriques s'activent dès qu'une API ou une intégration (ici `pinoIntegration`, `>=8.0.0 <11`) est utilisée

**`SENTRY_DATA_COLLECTION`** (`src/lib/sentry-scrub.ts`) ferme chaque catégorie et se passe aux trois `Sentry.init`. `beforeSend` et `beforeSendLog` restent : ils filtrent ce que `dataCollection` ne couvre pas, le texte des messages d'erreur et des logs Pino. Vérifié le 3 octobre 2026 : `getDataCollectionOptions()` résout toutes les catégories à `false`, et l'événement reçu depuis l'image de production (erreur SMTP de l'action contact) n'a ni cookie, ni en-tête, ni corps de requête, ni IP, ni contenu du formulaire.

**Turbopack** (bundler par défaut, dev comme build) : **spans des Server Actions absents**, relevé en 11.1.0 le 3 octobre 2026 sur l'image de production : l'erreur de l'action contact arrive avec `transaction: serverAction/submitContact` et son `trace_id`, mais la trace ne compte aucun span après plus de 4 minutes, quand ceux des GET voisins arrivent en quelques secondes. Capture d'erreur et tracing routes/queries inaffectés. Ce constat a été rattaché à tort à [#18871](https://github.com/getsentry/sentry-javascript/issues/18871), qui porte sur des events serveur perdus par le transport Node (fermée le 19 janvier 2026 sans reproduction). Sentry décrit cette limite comme structurelle (« server actions don't emit OTel spans Sentry can hook into », blog du 24 mars 2026) et les notes 11.2 à 11.6 ne citent aucun correctif. Non revalidé en 11.9.0 : à refaire après le déploiement, puis à chaque montée du SDK.

**Recommandation** : ⚠️ 11.9.0 avec `SENTRY_DATA_COLLECTION` dans chaque `Sentry.init`.

### 3. Better Auth

**Version actuelle** : `1.7.14`
**Stabilité** : ✅

Les breaking changes de la 1.7.0 portent sur OAuth provider, SSO, SCIM et MCP, hors périmètre ([releases](https://github.com/better-auth/better-auth/releases)).

**Compatibilité Écosystème** :
- Next.js 16 : peer `^14.0.0 || ^15.0.0 || ^16.0.0`. `use cache` + `getServerSession` : extraire les cookies avant le scope cache et les passer en argument (Issue #5584, fermée NOT_PLANNED, contrainte Next.js et non bug Better Auth). Sans effet tant qu'aucune page protégée n'appelle `getServerSession` sous `'use cache'`
- Prisma 7 + `@prisma/adapter-pg` : peer `^5.0.0 || ^6.0.0 || ^7.0.0`, à condition de charger `.env` via `@next/env` dans `prisma.config.ts` (en place)

**Modèles Prisma écrits à la main** (`User`, `Session`, `Account`, `Verification`, `@@schema("auth")`, `@@map` vers les tables minuscules) : `@better-auth/cli generate` fusionne ses modèles puis réécrit tout `prisma/schema.prisma`, sans jamais émettre `@@schema(...)` sur ceux qu'il ajoute (générateur de la 1.7.5, `packages/cli/src/generators/prisma.ts`). Son incompatibilité Prisma 7 (better-auth#6277) est corrigée depuis la 1.4.5 (PR #6459). Transcrits depuis la documentation du schéma Better Auth.

**Recommandation** : ✅ guide officiel [Prisma + Better Auth + Next.js](https://www.prisma.io/docs/guides/authentication/better-auth/nextjs).

### 4. Tiptap

**Version actuelle** : `3.32.0` sur les 15 paquets `@tiptap/*` (`core`, `pm`, `react`, `markdown`, `starter-kit`, `suggestion`, `extension-image`, `-link`, `-list`, `-placeholder`, `-table`, `-table-cell`, `-table-header`, `-table-row`, `-underline`), `tippy.js` `6.3.7`, relevé le 14 octobre 2026
**Stabilité** : ⚠️

Éditeur markdown des champs texte longs de l'admin (ADR-024), « Pages CMS Editor » copié par la CLI shadcn depuis `https://editor.pagescms.org/r/editor.json` (URL directe, sans entrée `registries`), sous `src/components/ui/editor/`. Seul `MarkdownEditorField.tsx` l'importe : le site public n'embarque jamais l'éditeur. Pas de versioning côté registre, le code copié est maintenu par le projet. Tiptap 3 a remplacé tippy.js par Floating UI (`@floating-ui/dom` `1.8.0`), mais l'éditeur copié importe encore tippy.js.

**Compatibilité Écosystème** :
- React 19 : peers de `@tiptap/react` 3.32.0 `^17.0.0 || ^18.0.0 || ^19.0.0` (relevé le 23 octobre 2026)
- Next.js 16 : documentation Tiptap générique, aucune mention de Next.js 16 lue. Monté côté client avec `immediatelyRender: false` (`index.tsx`), réglage du guide Next.js de Tiptap contre les erreurs d'hydratation
- Entrée et sortie par `@tiptap/markdown` (`contentType: "markdown"`), le markdown reste le seul format stocké

**Issues connues** :
- `@tiptap/markdown` est décrit comme « early release » par `tiptap.dev/docs/editor/markdown` (résumé de page). Commentaires non supportés (perte possible au remplacement du document), cellules de tableau limitées à un nœud enfant
- Tiptap relit puis réécrit le markdown : la première modification d'un contenu existant peut en changer la forme sans changer le rendu (ADR-024)

**Recommandation** : ✅ monter les 15 ensemble (`@tiptap/react` exige `core` et `pm`), puis relire `src/components/ui/editor/`, lancer `just typecheck`, `just lint` et l'enregistrement d'un champ markdown existant.

## Base de données

### 1. PostgreSQL

**Version actuelle** : `18.6` (publiée le 13 août 2026, batch 14.24 / 15.19 / 16.15 / 17.11, `postgresql.org/versions.json`)
**Stabilité** : ✅

Comme pour Node, **aucun patch n'est épinglé** : `postgres:18-alpine` aux trois endroits où l'image apparaît (`compose.override.yaml`, service containers de `ci.yml` et `deploy.yml`).

**Breaking Changes qui touchent le projet** : PG18+ déclare `VOLUME /var/lib/postgresql` et un `PGDATA` versionné (`/var/lib/postgresql/18/docker`), d'où le volume Docker changé. Checksums activés par défaut dans `initdb`.

**Recommandation** : ✅ PostgreSQL 18, tag `18-alpine`, chemin du volume vérifié.

### 2. Prisma ORM

**Version actuelle** : `7.10.1`
**Stabilité** : ✅

**Breaking Changes v6 → v7 qui touchent le projet** :
- Provider `prisma-client`, `output` obligatoire dans le `generator`, driver adapter `@prisma/adapter-pg`, `prisma.config.ts` (pas de `url` dans `schema.prisma`)
- **`.env` non chargé automatiquement** : `@next/env` en tête de `prisma.config.ts`, cause de l'erreur P1010 si oublié
- `prisma migrate dev` ne lance plus `prisma generate`, seeding automatique supprimé (`pnpm prisma db seed` explicite)
- `@prisma/adapter-pg` reprend les défauts de `pg`, sans timeout de connexion (5 s en Prisma 6) : `connectionTimeoutMillis: 5_000` posé dans `src/lib/prisma.ts` le 9 octobre 2026

**Compatibilité Écosystème** : PostgreSQL 18 listé dans les bases supportées depuis décembre 2025, aucune version de Prisma n'a introduit de changement spécifique PG 18 (ligne ajoutée après la discussion [#28937](https://github.com/prisma/prisma/discussions/28937)). TypeScript >= 5.4 avec `moduleResolution: bundler`.

**Issues connues & gotchas** :
- **Turbopack build + Prisma 7 WASM** : l'opt-out `next build --webpack`, posé pour une erreur de résolution du module WASM `query_compiler_fast_bg.postgresql.mjs`, **a été retiré du Dockerfile le 3 septembre 2026** : sur Next 16.3.3 + Prisma 7.10.0, le build Turbopack compile, prerende toutes les pages contre une base réelle et l'image sert les routes qui interrogent la base (CI et build Docker complet). Revérifié le 9 octobre 2026 sur Next 16.4.0 : image buildée en Turbopack (pnpm 11, sans `libc6-compat`), 12 migrations appliquées au démarrage contre PostgreSQL 18, `/api/health` et `/fr` en 200. Aucune issue upstream ouverte retrouvée côté `prisma/orm` ou `vercel/next.js`. À revérifier à chaque montée de Next ou de Prisma, le workaround tient en un flag
- **CI/CD avec build séparé du déploiement** (issue #29025) : hash mismatch possible si `prisma generate` est rejoué au déploiement sur une base Node différente de celle du build. Workaround : `transpilePackages: ['@prisma/client', '@prisma/adapter-pg', 'pg']`. **Le projet n'est pas concerné** : build et client Prisma sortent de la même base `node:26-alpine`, `.dockerignore` exclut `node_modules` et `src/generated`, Dokploy est en pull-only. À revérifier si `.dockerignore` change ou si le déploiement cesse d'être en pull-only. Pipeline : [PRODUCTION.md](PRODUCTION.md) § CI/CD & Déploiement
- **Server Components + `'use cache'` au prerender** : la base doit être joignable au build, ce qui conditionne le pipeline de déploiement. Règle et gotcha `connection()` : `.claude/rules/nextjs/data-fetching.md`
- `postinstall: "prisma generate"` obligatoire, sans quoi le client n'existe pas après un install propre

**Recommandation** : ✅ Prisma 7.10.1, guide officiel `prisma/nextjs-auth-starter`. **Ne pas upgrader Prisma et Next.js simultanément** (règle PRODUCTION.md).

## CI / CD

### 1. GitHub Actions

**Version actuelle** : `ubuntu-24.04` (runner Noble Numbat)
**Stabilité** : ✅

**Actions épinglées par SHA de commit** (inventaire au 27 octobre 2026, toutes à la dernière version publiée, date entre parenthèses ; la version exacte est en commentaire dans les workflows, qui sont la source ; Dependabot `github-actions` met à jour SHA et commentaire ensemble) :

| Action | Version épinglée |
|---|---|
| `actions/checkout` | 7.0.1 (20 juillet 2026) |
| `actions/cache` | 6.1.0 (26 juin 2026) |
| `pnpm/setup` | 3.1.2 (25 octobre 2026) |
| `dorny/paths-filter` | 4.0.3 (5 août 2026) |
| `extractions/setup-just` (composite `.github/actions/setup-just`) | 4.0.0 (5 avril 2026) |
| `googleapis/release-please-action` | 5.0.0 (22 avril 2026) |
| `actions/create-github-app-token` | 3.3.0 (12 octobre 2026) |
| `docker/build-push-action` | 7.4.0 (15 septembre 2026) |
| `docker/login-action` | 4.7.0 (23 octobre 2026) |
| `docker/metadata-action` | 6.2.0 (2 juillet 2026) |
| `docker/setup-buildx-action` | 4.4.1 (16 septembre 2026) |
| `aquasecurity/trivy-action` | 0.36.0 (22 avril 2026) |
| `github/codeql-action` (`upload-sarif`) | 4.39.1 (21 octobre 2026) |

**Breaking Changes qui touchent le projet** :
- **Runner** : `ubuntu-latest` repointé sur `ubuntu-24.04` le 17 janvier 2025, puis sur `ubuntu-26.04` du **19 octobre au 19 novembre 2026** : **épingler explicitement la version**
- **`pnpm/action-setup` + `actions/setup-node` → `pnpm/setup`** (#207 et #208, 27 octobre 2026) : un seul step installe pnpm (version lue dans `devEngines.packageManager`), Node (`devEngines.runtime` depuis le 29 octobre 2026) et les dépendances (`cache: true`). `require-lockfile: true` garde l'échec sur lockfile absent, à la place du `pnpm install --frozen-lockfile`
- **`actions/checkout` v6 → v7** : checkout d'une PR de fork bloqué sur `pull_request_target` et `workflow_run`, sans objet ici (aucun de ces déclencheurs)

**Points d'attention** :
- Node par défaut du runner ≠ Node du projet (image `20260831.293.1` : système `22.23.2`, tool cache `22.23.2` et `24.20.0`, valeurs qui bougent à chaque image) : Node vient de `devEngines.runtime`, jamais du runner. Node.js 20 est retiré des runners depuis le 23 septembre 2026
- `just` : la composite lit `minimum-version` du `Justfile`, seule source de la version
- **Réglage du dépôt** (Settings > Actions > General) : `default_workflow_permissions: read` et approbation de PR par les workflows désactivée depuis le 9 octobre 2026 (auparavant `write` et autorisée). Chaque workflow déclare en plus ses `permissions:`

**Recommandation** : ✅ `ubuntu-24.04`, chaque action par SHA avec la version en commentaire (un tag `@vN` est mobile et détournable), `cache: 'pnpm'` explicite.

---

# Matrice de Compatibilité Croisée

| A | B | Compatibilité | Notes |
|---|---|---|---|
| Next.js 16.4.3 | Prisma 7.10.1 | ✅ | Build Turbopack vérifié en CI (`just build`) et en image Docker sur 16.4.0 (9 octobre 2026) |
| Next.js 16.4.3 | next-intl 4.14.9 | ✅ | Next.js >= 16.3 pour `use cache` (root params) |
| Next.js 16.4.3 | ESLint 10.13.0 | ✅ | `eslint-config-next@16.4.0` patche les plugins React, import et jsx-a11y ; leurs peers restent à ESLint 9 |
| Next.js 16.4.3 | Aceternity UI | ✅ | `motion` v12+ (`14.7.1` installée), pas `framer-motion` |
| Next.js 16.4.3 | Better Auth 1.7.14 | ✅ | `getServerSession` + `use cache` : extraire les cookies avant le scope cache (Issue #5584) |
| Next.js 16.4.3 | Sentry 11.9.0 | ⚠️ | Spans des Server Actions absents sous Turbopack (relevé en 11.1.0, § Sentry) |
| Prisma 7.10.1 | Better Auth 1.7.14 | ✅ | `prisma.config.ts` concerne la CLI Prisma uniquement, pas le runtime Better Auth |
| pnpm 12.15.0 | TypeScript 6.0.3 | ⚠️ | Ne pas activer `preserveSymlinks: true` |
| pnpm 12.15.0 | Node.js 26.13.0 | ✅ | Installation par `npm install -g pnpm@12` + `devEngines` depuis le 15 octobre 2026, `docker build --target runner` vérifié le 29 octobre 2026 avec Node 26 |
| `postgres:18-alpine` | Volume Docker | ⚠️ | PG18+ : monter `/var/lib/postgresql`, pas `/var/lib/postgresql/data` |
| Vitest 5.0.5 | Vite 8.2.2 | ✅ | Peer obligatoire depuis Vitest 5 (>= 6.4), installée par pnpm |

---

# Conflits Potentiels

| Conflit | Risque | Solution |
|---|---|---|
| nodemailer < 8.0.5 (CRLF injection) ou 10.0.0 à 10.0.10 (entrée CommonJS cassée) | 🔴 Critique | Rester sur `>= 10.0.11` |
| Prisma 7 `.env` non chargé au runtime | 🟡 Moyen | `@next/env` (`loadEnvConfig`) dans `prisma.config.ts` (erreur P1010 si oublié) |
| pnpm 11 `minimumReleaseAge` + install `--frozen-lockfile` | 🟡 Moyen | Une version de moins de 24 h dans le lockfile fait échouer la CI et le Dockerfile. Retirer les `minimumReleaseAgeExclude` qu'écrit `pnpm add` une fois le délai passé |
| `@tailwindcss/typography` + `postcss-selector-parser` | 🟢 Faible | `@tailwindcss/typography@0.5.20` épingle `postcss-selector-parser` à `6.0.10`, touché par GHSA-rj75-hqrm-r3gf (CPU exhaustion, corrigé en 6.1.5). Un `overrides` de `pnpm-workspace.yaml` force `6.1.5` (même majeure), `pnpm audit` vide depuis le 27 octobre 2026, 193 règles CSS `prose` identiques avant et après. Retirer l'override quand `@tailwindcss/typography` relève la dépendance à `>=6.1.5` |
| ESLint 10 + peers des plugins de `eslint-config-next` | 🟢 Faible | Montée en v10 le 9 octobre 2026, débloquée par `eslint-config-next@16.4.0` ([vercel/next.js#99628](https://github.com/vercel/next.js/pull/99628)). `eslint-plugin-react`, `-import`, `-jsx-a11y` déclarent ESLint <= 9 : `pnpm peers check` les signale, sans effet, toutes leurs règles se déclenchent (vérifié par un fichier sonde). Revérifier par un fichier sonde à chaque montée d'ESLint ou de Next |
| Better Auth : refus levé dans un `databaseHooks` pendant le callback OAuth | ✅ Traité | Lever `APIError` avec un `code` dans le body : sans `code`, le callback relance l'erreur en 403 JSON au lieu de rediriger vers `onAPIError.errorURL?error=<code>` (`dist/api/routes/callback.mjs` en 1.7.5) |
| Better Auth : `advanced.ipAddress.disableIpTracking` | ✅ Traité | L'option coupe aussi le rate limiting natif, actif par défaut en production (`dist/api/rate-limiter/index.mjs` en 1.7.5). Pour ne pas persister l'IP, la retirer dans `databaseHooks.session.create.before` |
| Better Auth + `use cache` (Next.js 16) | 🟢 Faible | Extraire les cookies via `(await cookies()).toString()` **avant** le scope cache, passer en argument à `getServerSession` (Issue #5584) |

---

# Configuration Recommandée

## package.json

Le fichier réel est la source de vérité. Points imposés par la stack : `"type": "module"` (Prisma 7 ESM-only), `devEngines.runtime` (`node` `26.13.0`) et `devEngines.packageManager` (`pnpm` `12.15.0`), tous deux `onFail: download`, seule déclaration de ces versions (lue par pnpm sur le poste et dans le Dockerfile, et par `pnpm/setup`), `postinstall: "prisma generate"`, `version` bumpée par release-please et jamais à la main.

## pnpm-workspace.yaml

`allowBuilds` liste chaque dépendance à scripts de build, à `true` ou `false` (`strictDepBuilds`, cf. § pnpm) : `@parcel/watcher`, `@prisma/engines`, `@swc/core`, `msw`, `prisma`, `sharp`, `unrs-resolver` à `true`, `esbuild` à `false`. Pas de globs.

## prisma.config.ts et schema.prisma

- **L'adapter n'est pas dans `prisma.config.ts`** : `PrismaPg` se configure à l'instanciation du client, dans `src/lib/prisma.ts`
- **`process.env["DATABASE_URL"] ?? ""`, pas le helper `env()` de `prisma/config`** : ce dernier throw `PrismaConfigEnvError` **au chargement du fichier**, ce qui casse toute commande CLI, `prisma generate` compris (position officielle Prisma, [issue #28590](https://github.com/prisma/prisma/issues/28590)). Le repli `?? ""` sert le stage `deps` du Dockerfile, qui génère le client sans `DATABASE_URL`
- **Les deux lignes `@next/env` passent avant les autres imports**, sinon `defineConfig` s'évalue sur un `process.env` encore vide
- Le bloc `datasource` de `schema.prisma` ne porte pas de `url` (elle vient de `prisma.config.ts`, la laisser fait diverger les deux sources). `schemas = ["public", "freelance", "auth"]` ([ADR-018](adrs/018-cloisonnement-donnees.md)), chaque modèle et enum portant son `@@schema(...)`. Generator `prisma-client`, `output = "../src/generated/prisma"`

## tsconfig.json

- `moduleResolution: "bundler"` (guide d'upgrade Prisma 7). Pas de `preserveSymlinks: true`, incompatible pnpm
- `lib: ["dom", "esnext"]` : TypeScript 6 intègre `dom.iterable` et `dom.asynciterable` à `dom` (retiré du fichier réel le 9 octobre 2026). Pas de `baseUrl` : TypeScript 7 le refuse, les alias passent par `paths` seuls
- `types` **explicite** : TypeScript 6 a retiré l'auto-discovery des `@types/*`. `react/canary` et `react/experimental` exposent les API pas encore dans les types stables (`experimental_taint*`)
- `jsx: "react-jsx"` et non le `preserve` du template Next : le bundler transforme dans les deux cas, la valeur ne joue que sur ce que `tsc --noEmit` vérifie. Ne pas la « corriger » vers `preserve`
- `allowJs` élargit `tsc --noEmit` aux configs JS, `resolveJsonModule` autorise les imports JSON

## next.config.ts

- **Ordre des wrappers** : `withNextIntl` au plus près de la config, `withSentryConfig` (importé de `@sentry/nextjs/config`) en dernier, pour que les source maps reflètent les transformations des autres plugins. `createNextIntlPlugin` reçoit le chemin du fichier de requête, il ne le devine pas
- `cacheComponents: true` remplace `experimental.ppr` et `experimental.dynamicIO` (supprimés en Next 16), avec `partialPrefetching: true` (cf. § Next.js). `output: 'standalone'`, `typedRoutes`, `poweredByHeader: false`, `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']`
- `experimental.globalNotFound: true` conditionne la structure des routes : le root layout vivant sous `[locale]`, c'est lui qui rend `global-not-found.tsx` joignable. Le retirer casse le 404 des URLs hors routes
- Upload des source maps Sentry après la compilation Turbopack : aucune option, `useRunAfterProductionCompileHook` (premier niveau) vaut `true` par défaut sous Turbopack. L'ancien `_experimental.useRunAfterProductionCompileHook`, ignoré par le SDK 11, a été retiré le 9 octobre 2026
- Pas de `@next/bundle-analyzer` (build Webpack seulement) : `next analyze` le remplace sous Turbopack (retiré le 9 octobre 2026)

## compose.override.yaml et ci.yml

Le Postgres de dev local est le seul endroit où une contrainte de version entre dans les compose : `postgres:18-alpine`, volume monté sur `/var/lib/postgresql`. Topologie, profils, healthcheck : [PRODUCTION.md](PRODUCTION.md) § CI/CD & Déploiement. Structure de `ci.yml` (agrégateur `changes` → `quality` → `ci` imposé par le required check de branch protection) : `.claude/rules/github-actions/workflows.md`.

## Post-Install / Setup

```bash
pnpm install
pnpm db:generate && pnpm db:migrate
pnpm dlx shadcn@latest init -t next -b radix
pnpm dlx shadcn@latest add "https://magicui.design/r/<component>.json"
pnpm dlx shadcn@latest add @aceternity/<component>
pnpm typecheck && pnpm lint && pnpm test
```

## Checklist Validation Compatibilité

- [ ] `prisma.config.ts` charge `DATABASE_URL` via `@next/env` et le `generator` définit `output`
- [ ] `src/env.ts` valide les env vars runtime (`@t3-oss/env-nextjs` + Zod), `skipValidation: !!process.env.SKIP_ENV_VALIDATION` pour tests et build
- [ ] `preserveSymlinks: false` (ou omis) et `moduleResolution: "bundler"` dans `tsconfig.json`
- [ ] nodemailer >= 10.0.11
- [ ] `dataCollection: SENTRY_DATA_COLLECTION` dans chacun des trois `Sentry.init`
- [ ] Image Node `node:26.13.0-alpine` égale à `devEngines.runtime` (pas `node:20-*`), image Postgres `postgres:18-alpine` avec PGDATA adapté
- [ ] `allowBuilds` exhaustif, aucun `minimumReleaseAgeExclude` résiduel une fois les 24 h passées
- [ ] `partialPrefetching: true` à côté de `cacheComponents: true`
- [ ] Package `motion` installé (pas `framer-motion`) si Aceternity UI
- [ ] Runner CI `ubuntu-24.04` (pas `ubuntu-latest`), actions épinglées par SHA (§ GitHub Actions)
- [ ] Build Docker en Turbopack (aucun `--webpack`) : revalider après chaque montée de Next ou de Prisma

## Montées Bloquées (état au 27 octobre 2026)

Ces mises à jour majeures ont été testées puis écartées, ou identifiées et non tentées. Ne pas les rejouer sans que la contrainte listée soit levée.

| Paquet | Actuel | Disponible | Blocage | Levée attendue |
|---|---|---|---|---|
| TypeScript | `6.0.3` | `7.0.2` | `typescript-eslint@8.72.1` (installée le 27 octobre 2026, tiré par `eslint-config-next`) déclare `peerDependencies.typescript: >=4.8.4 <6.1.0` : monter `typescript-eslint` ne débloque rien. `tsc --noEmit` passe, mais `eslint` casse au chargement de la config | Publication d'un `typescript-eslint` stable supportant TS 7 (seules des alphas existent). Piste intermédiaire du blog TS 7 : l'alias `typescript@npm:@typescript/typescript6` pour les outils qui ont encore besoin de l'API 6 |
| Prisma | `7.10.1` | `8.0.0-rc.28` | Release candidate, jamais en production. **Attention** : cette rc est publiée sur le dist-tag `latest` de `prisma` (la 7.10.1 est sur `prev`, relevé le 23 octobre 2026), un `pnpm add prisma` ou un `pnpm dlx prisma@latest` la tire | Publication de la 8.0.0 stable |

---

# Recommandation Finale

Verdict : stack compatible et production-ready. Les gotchas principaux sont des points de configuration (chargement `.env`, `serverExternalPackages` Pino, `postinstall prisma generate`), pas des bugs bloquants. Les technologies prévues mais non installées sont en annexe Post-MVP.

## Points Critiques

1. **Node.js : rester sur une LTS paire**, image `node:26.13.0-alpine` égale à `devEngines.runtime`. Ne jamais suivre une ligne Current (impaire)
2. **nodemailer** : jamais une version antérieure à 10.0.11 (CVE CRLF GHSA-vvjj-xcjg-gr5g corrigée depuis 8.0.5)
3. **Prisma 7 `.env` runtime** : `@next/env` dans `prisma.config.ts`, cause principale de l'erreur P1010 « User was denied access »
4. **pnpm 11 et 12** : toute dépendance à scripts de build dans `allowBuilds`, aucune version de moins de 24 h dans le lockfile, sous peine d'un install en échec en CI et dans le Dockerfile
5. **Sentry 11** : `SENTRY_DATA_COLLECTION` dans chaque `Sentry.init`

---

# Post-MVP : technologies non installées

Rien de ce qui suit n'existe dans le dépôt (ni `package.json`, ni compose, ni migrations). Recherche de compatibilité conservée pour ne pas la refaire, **pas un état vérifié** : aucun fichier versionné ne peut la contredire, les versions sont à **revalider intégralement à l'implémentation**, et l'entrée rejoint alors le tableau principal.

## pgvector

**Version étudiée** : `0.8.6` (relevée le `2026-09-03`, taguée le 29 juillet 2026 ; 0.8.7 en préparation dans le CHANGELOG, contenu des 0.8.3 à 0.8.6 non relevé)
**Stabilité** : ✅

- **CVE-2026-3172** : buffer overflow dans les builds HNSW parallèles, versions affectées 0.6.0 à 0.8.1, corrigé en **0.8.2** (plancher de sécurité)
- PostgreSQL 18 : ✅ depuis 0.8.1. Docker : image `pgvector/pgvector:pg18`
- Prisma 7 : ⚠️ support partiel : `Unsupported("vector")` + migrations SQL manuelles (`CREATE EXTENSION IF NOT EXISTS vector`) + TypedSQL pour les queries, pas de support natif GA

**Recommandation** : ✅ à l'activation du chatbot RAG, plancher **0.8.2**.

## Umami Analytics (self-hosted)

**Version étudiée** : `3.3.1` (relevée le `2026-09-03`, publiée le 20 août 2026, contenu des 3.1 à 3.3 non relevé)
**Stabilité** : ✅

- **v2 → v3** : MySQL/MariaDB supprimés (PostgreSQL obligatoire), changements API `/metrics/` non documentés (clients v2 → 400), la migration automatique peut perdre des event data (seuls les websites préservés)
- **CVE-2025-66478** patchée en **3.0.2** (4 décembre 2025), la 3.0.3 (12 décembre 2025) corrige l'advisory Next.js du 11 décembre
- PostgreSQL : ⚠️ minimum v12.14, le compose officiel utilise PG 15. L'issue #3888 (PG 17.6) est **fermée `not_planned`** depuis le 22 février 2026 : PG 18 à valider en staging, sans issue upstream pour l'appuyer
- Issues connues : géolocalisation « Unknown » depuis v2 → v3 (#3701), dashboard parfois inaccessible « Server Action was not found » (#3859), migration MySQL → PostgreSQL problématique

**Recommandation** : ✅ **base PostgreSQL dédiée**, plancher **>= 3.0.2**, PG 18 à valider en staging.

## Compatibilité croisée, à revalider

| A | B | Compatibilité | Notes |
|---|---|---|---|
| Prisma 7.10.1 | pgvector 0.8.6 | ⚠️ | Support partiel : `Unsupported("vector")` + SQL manuel |
| PostgreSQL 18.6 | Umami 3.3.1 | ⚠️ | Aucun retour upstream sur PG 18 (issue #3888 fermée `not_planned`), à valider en staging |

## Conflits à anticiper

| Conflit | Risque | Solution |
|---|---|---|
| pgvector < 0.8.2 + CVE-2026-3172 | 🔴 Critique | pgvector 0.8.2 minimum dès l'activation du RAG |
| Umami + PostgreSQL 18 | 🟡 Moyen | Valider en staging avant prod, base dédiée séparée de celle du portfolio |

## Checklist au moment de l'implémentation

- [ ] Revalider la version courante et les breaking changes intervenus depuis
- [ ] Créer l'entrée numérotée dans la vue d'ensemble et dans les détails, en fin de sa catégorie
- [ ] Reporter les lignes de compatibilité et de conflit ci-dessus dans les tableaux principaux
- [ ] pgvector >= 0.8.2 (CVE-2026-3172), Umami >= 3.0.2 (CVE-2025-66478) sur base PostgreSQL dédiée

## Ressources post-MVP

- [pgvector : GitHub](https://github.com/pgvector/pgvector)
- [pgvector 0.8.2 Release](https://www.postgresql.org/about/news/pgvector-082-released-3245/)
- [Umami : Installation](https://docs.umami.is/docs/install)
- [Umami v3 Blog](https://umami.is/blog/umami-v3)

---

# 🔗 Ressources

## Documentation Officielle

### Runtime & Tooling

- [Node.js : Releases](https://nodejs.org/en/about/previous-releases)
- [Node.js : schedule.json](https://github.com/nodejs/Release/blob/main/schedule.json)
- [pnpm : Installation](https://pnpm.io/installation)
- [pnpm : Migration v10 → v11](https://pnpm.io/migration)
- [pnpm : Dependency resolution (`minimumReleaseAge`)](https://pnpm.io/settings/dependency-resolution)
- [TypeScript 6.0 Release](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)

### Framework & UI

- [Next.js : Upgrade v16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js 16.4 Blog](https://nextjs.org/blog/next-16-4)
- [React 19.3](https://react.dev/blog/2026/09/09/react-19-3)
- [Tailwind CSS : Upgrade Guide v4](https://tailwindcss.com/docs/upgrade-guide)
- [shadcn/ui : Installation Next.js](https://ui.shadcn.com/docs/installation/next)
- [shadcn/ui : changelog `cn`](https://ui.shadcn.com/docs/changelog/2026-09-cn)
- [cn : dépôt](https://github.com/shadcn-ui/cn)
- [Magic UI : Docs](https://magicui.design/docs)
- [Motion : guide de migration](https://motion.dev/docs/react-upgrade-guide)
- [Aceternity UI : Install Next.js](https://ui.aceternity.com/docs/install-nextjs)
- [ReUI : Docs](https://reui.io)
- [dnd-kit : Docs](https://docs.dndkit.com)
- [next-intl 4.0 Blog](https://next-intl.dev/blog/next-intl-4-0)

### Librairies applicatives

- [Zod v4 Migration](https://zod.dev/v4/changelog)
- [nodemailer : CHANGELOG](https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md)
- [Pino : getpino.io](https://getpino.io)
- [sharp : Documentation](https://sharp.pixelplumbing.com/)
- [decode-ico : README](https://github.com/LinusU/decode-ico)
- [Tiptap : installation avec Next.js](https://tiptap.dev/docs/editor/getting-started/install/nextjs)
- [Tiptap : extension Markdown](https://tiptap.dev/docs/editor/markdown)
- [Pages CMS Editor : dépôt](https://github.com/pagescms/editor)
- [Sentry : Migration v10 → v11 (Next.js)](https://docs.sentry.io/platforms/javascript/guides/nextjs/migration/v10-to-v11/)
- [Sentry : options, dont `dataCollection`](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/)
- [Better Auth : Changelog](https://better-auth.com/changelog)
- [Better Auth + Prisma + Next.js](https://www.prisma.io/docs/guides/authentication/better-auth/nextjs)

### Tests

- [Vitest 5.0 Blog](https://vitest.dev/blog/vitest-5.html)
- [Testing: Vitest | Next.js](https://nextjs.org/docs/app/guides/testing/vitest)

### Base de données

- [PostgreSQL 18 : Release Notes](https://www.postgresql.org/docs/current/release-18.html)
- [Prisma : Migration v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Prisma + Next.js](https://www.prisma.io/docs/guides/frameworks/nextjs)
- [prisma/nextjs-auth-starter](https://github.com/prisma/nextjs-auth-starter), starter officiel Prisma 7 + Next.js 16 + Better Auth

### CI / CD

- [GitHub Actions : ubuntu-24.04 runner](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)

## Ressources Complémentaires

- [endoflife.date : Node.js](https://endoflife.date/nodejs), [PostgreSQL](https://endoflife.date/postgresql), [pnpm](https://endoflife.date/pnpm)
- [Docker Hub : node (tag 26.13.0-alpine)](https://hub.docker.com/_/node)
- [Docker Hub : postgres:18](https://hub.docker.com/_/postgres)
- [GHSA-vvjj-xcjg-gr5g : nodemailer CRLF](https://github.com/advisories/GHSA-vvjj-xcjg-gr5g)
