# Thibaud Geisler Portfolio

Plateforme personnelle servant de vitrine professionnelle et de hub central (services, projets, démos externes) en IA, développement full-stack et formation. Monolithe Next.js single-user, évolutif vers un dashboard interne freelance post-MVP.

## Stack

Backend : Node.js 24 + TypeScript 6 strict (Next.js 16 App Router, Server Actions) | Frontend : React 19 + Tailwind 4 + shadcn/ui (Magic UI, Aceternity UI) + next-intl 4 (FR/EN) | DB : PostgreSQL 18 + Prisma 7 | Infra : Docker Compose + Dokploy self-hosted (VPS IONOS)

## Documentation

| Doc | Rôle | Lire pour... |
|-----|------|-------------|
| [BRAINSTORM.md](../docs/BRAINSTORM.md) | Vision, features, roadmap MVP | Comprendre le projet et son périmètre |
| [ARCHITECTURE.md](../docs/ARCHITECTURE.md) | Architecture, ADRs, patterns | Décisions techniques et structure du code |
| [VERSIONS.md](../docs/VERSIONS.md) | Versions exactes, compatibilité | Dépendances, breaking changes, setup |
| [DESIGN.md](../docs/DESIGN.md) | Design system, typographie, couleurs | Conventions UI et mapping composants |
| [PRODUCTION.md](../docs/PRODUCTION.md) | Release, déploiement, monitoring | Déployer, déboguer, gérer incidents |
| [adrs/](../docs/adrs/) | Architecture Decision Records | Justification des décisions actées |
| [knowledges/](../docs/knowledges/) | Fiches techniques par techno | Références détaillées par librairie |
| [.claude/rules/](rules/) | Règles techniques impératives par librairie | Conventions de code chargées dynamiquement |

## Must-do

### Standards

- **Diagnostic SessionStart (hook env-check)** : le hook vérifie Docker/Postgres/.env au démarrage et injecte via `additionalContext` une instruction impérative si des warnings sont détectés. Respecter strictement : énumérer les blocages et proposer les correctifs (`just docker-up`, etc.) avant toute tâche DB/infra.
- **Périmètre single-user** : pas de multi-tenant, pas de gestion multi-utilisateur, whitelist email unique côté auth (post-MVP)
- **Hub de démos externes** : le portfolio liste et pointe vers des démos autonomes, il ne démo pas les applications lui-même
- **Pas de sur-ingénierie anticipatoire** : chaque complexité ajoutée uniquement si le besoin réel apparaît
- **Stratégie de tests** : TDD sur les Server Actions critiques (contact, mutations dashboard), intégration sur les chemins critiques uniquement, pas de tests e2e en MVP
- **Zéro commentaire sans valeur** : ne jamais écrire de commentaire qui paraphrase le code (le WHAT), narre un changement, ou référence une spec/task/caller. Un commentaire est autorisé UNIQUEMENT s'il porte un WHY non-évident : contrainte cachée, invariant subtil, workaround ciblé, comportement contre-intuitif. Les JSDoc descriptifs sont interdits (les noms d'identifiants bien choisis suffisent). Si en relisant un commentaire tu peux le supprimer sans perte de compréhension pour un lecteur futur → supprime-le.

> Les règles techniques (Zod, Prisma, Next.js, secrets, etc.) sont dans [.claude/rules/](rules/) et chargées dynamiquement.

### Workflow Git

Branches : `feature/*` → `develop` → `main` (Dokploy auto-deploy) → tag `vX.Y.Z` (auto via release-please) | `hotfix/*` → `main`
Commits : `type(scope): description`, types `feat | fix | docs | refactor | test | chore`
Après merge PR : `/git-sync-develop` pour aligner develop local + supprimer la feature branch

> Politique de tag, checklist release, flux hotfix détaillé : [PRODUCTION.md](../docs/PRODUCTION.md)

## Gotchas

- **Formation IA intégrée dans `/services`** : pas de sous-page `/services/formation` dédiée tant que l'offre n'est pas stabilisée. Réévaluer uniquement si l'offre formation grossit significativement

## Commandes

| Commande / Skill | Rôle |
|---|---|
| `/dev-server` | Démarre/arrête le serveur Next.js (`just dev` / `just stop`) |
| `/quality-check` | Lint, typecheck, tests (`just lint` / `typecheck` / `test`) |
| `/setup-ops` | Install, bootstrap env, diagnostics (`just install` / `setup` / `check`) |
| `infra-ops` | Docker + Prisma DB (`just docker-*` / `db-*`). Invocation explicite uniquement (effets destructifs possibles) |
| `git-ops` | Workflow git `feature/*` → `develop` → `main`, commits Conventional, PRs, tags. Invocation explicite uniquement |
| `shadcn` | Auto-chargé sur composants. Discovery/audit/install via CLI pour les 3 registries (`@shadcn`, `@magicui`, `@aceternity`). Voir [.claude/skills/shadcn/](skills/shadcn/). |

> Recettes complètes : `just --list` ou voir [Justfile](../Justfile).
