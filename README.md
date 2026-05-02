# Thibaud Geisler Portfolio

Plateforme personnelle (vitrine professionnelle) servant de hub central vers les démos externes en IA, développement full-stack et formation.
Monolithe Next.js single-user, évolutif vers un dashboard interne freelance post-MVP.
Site en production : [thibaud-geisler.com](https://thibaud-geisler.com).

## Stack

| Couche | Technologies |
|--------|--------------|
| Backend | Node.js 24, TypeScript 6 (strict), Next.js 16 (App Router, Server Actions) |
| Frontend | React 19, Tailwind 4, shadcn/ui (+ Magic UI, Aceternity UI), next-intl 4 (FR/EN) |
| Base de données | PostgreSQL 18, Prisma 7 |
| Observabilité | Pino 10 (logs structurés serveur) |
| Infrastructure | Docker Compose (Postgres dev), Dokploy self-hosted (VPS IONOS) |

## Prérequis

- Node.js >= 24
- pnpm >= 10 (version pinnée via `packageManager` dans `package.json`)
- Docker (Compose, pour Postgres en dev)
- [`just`](https://github.com/casey/just) (workflow standard du projet)

## Getting Started

```bash
cp .env.example .env        # puis remplir les valeurs (voir section Environnement)
just setup                  # install deps + démarre Postgres + applique migrations + seed
just dev                    # serveur Next.js sur http://localhost:3000
```

`just check` permet de diagnostiquer rapidement l'environnement (Node, pnpm, Docker, `.env`, Postgres).

## Scripts utiles

Toutes les recettes passent par `just`. La liste complète est disponible via `just --list`.

### Dev

| Commande | Description |
|----------|-------------|
| `just dev` | Démarre `next dev` (port 3000) |
| `just stop` | Libère le port 3000 (kill du process Next) |

### Quality

| Commande | Description |
|----------|-------------|
| `just lint` | ESLint sur `src/` |
| `just typecheck` | `next typegen` puis `tsc --noEmit` |
| `just test` | Tests unit + intégration (Vitest) |
| `just build` | Build de production Next.js |

### Database

| Commande | Description |
|----------|-------------|
| `just db` | Démarre Postgres (Docker) puis applique les migrations |
| `just db-migrate <name>` | Crée et applique une nouvelle migration |
| `just db-studio` | Ouvre Prisma Studio |
| `just seed` | Exécute le seed Prisma |
| `just db-test` | Prépare la base de test (`.env.test`) |

### Infrastructure

| Commande | Description |
|----------|-------------|
| `just docker-up` | Démarre les services Docker Compose (profil `validation`) |
| `just docker-down` | Arrête les services Docker Compose |
| `just check` | Diagnostics Node / pnpm / Docker / `.env` / Postgres |

## Variables d'environnement

Le fichier `.env.example` liste toutes les variables nécessaires, regroupées par bloc :

- **App** : `NEXT_PUBLIC_SITE_URL`, `ASSETS_PATH`
- **Database** : `DATABASE_URL` (les credentials par défaut `portfolio:portfolio@portfolio` sont fournis par les fallbacks `compose.override.yaml`)
- **SMTP** (formulaire de contact) : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `MAIL_TO`
- **Calendly** (event types FR/EN distincts) : `NEXT_PUBLIC_CALENDLY_URL_FR`, `NEXT_PUBLIC_CALENDLY_URL_EN`

Validation runtime via `@t3-oss/env-nextjs` + Zod (cf. `src/env.ts`).

## Architecture

Monolithe Next.js single-user (App Router, React Server Components, Server Actions). Le portfolio fonctionne en hub : il liste et pointe vers des démos autonomes (déployées séparément), il ne les héberge pas. Les données métier (projets, services, identité entreprise) sont persistées en PostgreSQL via Prisma et alimentées par un seed idempotent.

Détails complets : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## i18n

Bilingue FR (default) / EN via `next-intl 4`, segment `[locale]` dans App Router. Le contenu éditorial libre est stocké en BDD en deux colonnes (`Fr`/`En`), les enums bornés passent par les fichiers `messages/{fr,en}.json`.

## Assets

Convention de stockage :

- `assets/projets/{client,personal}/<slug>/<filename>` (logos, captures, médias projet)
- `assets/documents/<slug>/<filename>` (CV, plaquettes, etc.)

Servis dynamiquement via la route catch-all `GET /api/assets/[...path]` (lecture filesystem à `process.env.ASSETS_PATH`). En production, les fichiers vivent dans le volume Docker `portfolio_assets` monté sur `/app/assets`.

Détails (validation Zod, defense-in-depth, headers cache) : [`.claude/rules/nextjs/assets.md`](.claude/rules/nextjs/assets.md) et [ADR-011](docs/adrs/).

## Déploiement

Déploiement continu via Dokploy self-hosted (VPS IONOS) : tout push sur `main` déclenche un build et un déploiement automatique. Les versions sont gérées par release-please (tags `vX.Y.Z` automatiques sur merge des release PRs). PostgreSQL est provisionné séparément côté Dokploy Database.

Détails (release flow, hotfix, monitoring, incidents) : [`docs/PRODUCTION.md`](docs/PRODUCTION.md).

## Documentation

| Doc | Rôle |
|-----|------|
| [`docs/BRAINSTORM.md`](docs/BRAINSTORM.md) | Vision, features, roadmap MVP |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture, ADRs, patterns |
| [`docs/VERSIONS.md`](docs/VERSIONS.md) | Versions exactes, compatibilité |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Design system, typographie, couleurs |
| [`docs/PRODUCTION.md`](docs/PRODUCTION.md) | Release, déploiement, monitoring |
| [`docs/adrs/`](docs/adrs/) | Architecture Decision Records |
| [`docs/knowledges/`](docs/knowledges/) | Fiches techniques par techno |
| [`CHANGELOG.md`](CHANGELOG.md) | Historique des versions (Keep a Changelog) |

## Workflow Git

Branches : `feature/* -> develop -> main` (tag `vX.Y.Z` automatique via release-please après merge sur `main`). Les hotfixes partent directement de `main`.
Commits : Conventional Commits (`type(scope): description`), types `feat | fix | docs | refactor | test | chore`.
PRs feature : toujours `gh pr create --base develop` (la branche par défaut GitHub reste `main`, ne pas la modifier).

Détails complets (release flow, tags, hotfix, checklist) : [`docs/PRODUCTION.md`](docs/PRODUCTION.md).
