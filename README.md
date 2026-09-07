# Thibaud Geisler Portfolio

Plateforme personnelle (vitrine professionnelle) servant de hub central vers les démos externes en IA, développement full-stack et formation.
Monolithe Next.js single-user, évolutif vers un espace admin interne freelance post-MVP.
Site en production : [thibaud-geisler.com](https://thibaud-geisler.com).

## Stack

| Couche | Technologies |
|--------|--------------|
| Backend | Node.js 24, TypeScript 6 (strict), Next.js 16 (App Router, Server Actions) |
| Frontend | React 19, Tailwind 4, shadcn/ui (+ Magic UI, Aceternity UI), next-intl 4 (FR/EN) |
| Base de données | PostgreSQL 18, Prisma 7 |
| Observabilité | Pino 10 (logs structurés serveur) |

## Prérequis

- Node.js >= 24
- pnpm >= 10 (version pinnée via `packageManager` dans `package.json`)
- Docker (Compose, pour Postgres en dev)
- [`just`](https://github.com/casey/just) (workflow standard du projet) avec bash (Git Bash sous Windows, le `Justfile` pose `set shell := ["bash", "-cu"]`)
- [`actionlint`](https://github.com/rhysd/actionlint) (`winget install rhysd.actionlint`, requis par `just lint`)

## Getting Started

```bash
cp .env.example .env        # chaque variable y est commentée
just setup                  # install deps + démarre Postgres + applique migrations + seed
just dev                    # serveur Next.js sur http://localhost:3000
```

`just --list` donne l'inventaire des recettes, `just check` diagnostique l'environnement (Node, pnpm, Docker, `.env`, Postgres). `src/env.ts` valide au démarrage les variables qu'il déclare (`@t3-oss/env-nextjs` + Zod) : l'application refuse de démarrer s'il en manque une.

## Architecture

Monolithe Next.js single-user (App Router, React Server Components, Server Actions). Le portfolio fonctionne en hub : il liste et pointe vers des démos autonomes (déployées séparément), il ne les héberge pas. Les données métier (projets, services, identité entreprise) sont persistées en PostgreSQL via Prisma et alimentées par un seed idempotent.

Détails complets : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## i18n

Bilingue FR (default) / EN via `next-intl 4`, segment `[locale]` dans App Router. Le contenu éditorial libre est stocké en BDD en deux colonnes (`Fr`/`En`), les enums bornés passent par les fichiers `messages/{fr,en}.json`.

## Assets

Convention de stockage :

- `assets/projets/{client,personal}/<slug>/<filename>` (logos, captures, médias projet)
- `assets/documents/<slug>/<filename>` (CV, plaquettes, etc.)

Servis dynamiquement via la route catch-all `GET /api/assets/[...path]` (lecture filesystem à `process.env.ASSETS_PATH`).

Détails (validation Zod, defense-in-depth, headers cache) : [`.claude/rules/nextjs/assets.md`](.claude/rules/nextjs/assets.md) et [ADR-011](docs/adrs/).

## Documentation

| Doc | Contenu |
|---|---|
| [docs/BRAINSTORM.md](docs/BRAINSTORM.md) | Vision, features, roadmap MVP |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture, ADRs, patterns |
| [docs/VERSIONS.md](docs/VERSIONS.md) | Versions exactes, compatibilité |
| [docs/DESIGN.md](docs/DESIGN.md) | Design system, typographie, couleurs |
| [docs/PRODUCTION.md](docs/PRODUCTION.md) | Release, déploiement, monitoring |
| [docs/registre-traitements.md](docs/registre-traitements.md) | Registre RGPD des traitements (art. 30) |
| [docs/adrs/](docs/adrs/) | Décisions d'architecture actées |
| [docs/knowledges/](docs/knowledges/) | Fiches techniques par librairie |
| [docs/baselines/](docs/baselines/) | Relevés Core Web Vitals datés |
| [docs/reports/](docs/reports/) | Audits ponctuels (SEO, etc.) |
| [CHANGELOG.md](CHANGELOG.md) | Historique des versions, tenu par release-please |
