# Thibaud Geisler Portfolio

Plateforme personnelle servant de vitrine professionnelle et de hub central (services, projets, démos externes) en IA, développement full-stack et formation. Monolithe Next.js single-user, évolutif vers un espace admin interne freelance post-MVP.

## Stack

Backend : Node.js 26 + TypeScript 6 strict (Next.js 16 App Router, Server Actions) | Frontend : React 19 + Tailwind 4 + shadcn/ui (Magic UI, Aceternity UI) + next-intl 4 (FR/EN) | DB : PostgreSQL 18 + Prisma 7 | Infra : Docker Compose + Dokploy self-hosted (VPS IONOS)

## Documentation

| Doc | Rôle | Lire pour... |
|-----|------|-------------|
| [BRAINSTORM.md](../docs/BRAINSTORM.md) | Vision, features, roadmap MVP | Comprendre le projet et son périmètre |
| [ARCHITECTURE.md](../docs/ARCHITECTURE.md) | Architecture, ADRs, patterns | Décisions techniques et structure du code |
| [VERSIONS.md](../docs/VERSIONS.md) | Versions exactes, compatibilité | Dépendances, breaking changes, setup |
| [DESIGN.md](../docs/DESIGN.md) | Design system, typographie, couleurs | Conventions UI et mapping composants |
| [PRODUCTION.md](../docs/PRODUCTION.md) | Release, déploiement, monitoring | Déployer, déboguer, gérer incidents |
| [registre-traitements.md](../docs/registre-traitements.md) | Registre RGPD des traitements de données (art. 30) | Conformité données personnelles, document interne |
| [CHANGELOG.md](../CHANGELOG.md) | Historique des versions, tenu par release-please | Savoir ce que contient une version déployée |
| [adrs/](../docs/adrs/) | Architecture Decision Records | Justification des décisions actées |
| [knowledges/](../docs/knowledges/) | Fiches techniques par techno | Références détaillées par librairie |
| [baselines/](../docs/baselines/) | Relevés Core Web Vitals datés | Comparer les perfs avant/après une optimisation |
| [reports/](../docs/reports/) | Audits ponctuels (SEO, etc.) | Retrouver le constat d'un audit passé |
| [superpowers/](../docs/superpowers/) | Specs et plans d'implémentation par sub-project | Savoir ce qui est prévu, décomposé ou déjà spécifié |
| [.claude/rules/](rules/) | Règles techniques impératives par librairie | Conventions de code chargées dynamiquement |

## Must-do

### Standards

- **Périmètre single-user** : pas de multi-tenant, pas de gestion multi-utilisateur, whitelist email unique côté auth (post-MVP)
- **Hub de démos externes** : le portfolio liste et pointe vers des démos autonomes, il ne démo pas les applications lui-même
- **Pas de sur-ingénierie anticipatoire** : chaque complexité ajoutée uniquement si le besoin réel apparaît
- **Stratégie de tests** : TDD sur les Server Actions critiques (contact, mutations de l'espace admin), intégration sur les chemins critiques uniquement, pas de tests e2e en MVP
- **Commentaires `TODO` autorisés** : ils tracent une intention future volontairement reportée (hors scope actuel, suite envisagée, amélioration différée)

> Les règles techniques (Zod, Prisma, Next.js, secrets, etc.) sont dans [.claude/rules/](rules/) et chargées dynamiquement.

### Workflow Git

Branches : `feature/*` → `develop` → `main` → tag `vX.Y.Z` (auto via release-please) → deploy auto sur tag (GHA → GHCR → Dokploy pull) | `hotfix/*` → `main`
Commits : `type(scope): description`, types `feat | fix | docs | refactor | test | chore`
PR feature : toujours `gh pr create --base develop` (default branch GitHub = `main`, ne jamais la changer, release-please et Dokploy en dépendent)
PR develop → main : titre obligatoirement Conventional bumping (`feat:` / `fix:` / `feat!:`) sinon release-please skip → pas de tag → pas de deploy. Détails : [PRODUCTION.md § Convention Commits](../docs/PRODUCTION.md#convention-commits)
Après merge d'une PR feature : `/git-sync --base=develop` pour aligner develop local et supprimer la feature branch. Après un tag : `git pull origin main` puis `git push origin develop`, le resync ne passe pas par git-sync

**Discipline commit** : pas de `git commit` en cours de workflow d'implémentation, seulement une fois toutes les phases terminées. Les skills qui commitent à la volée (TDD red/green via subagent) restent tolérés dans leur scope interne.

> Politique de tag, checklist release, flux hotfix détaillé : [PRODUCTION.md](../docs/PRODUCTION.md)

## Gotchas

- **Suspendre tout antivirus avec inspection TLS avant une mesure de perf locale** : il injecte du JS bloquant et gonfle le TTFB. Détail : [PRODUCTION.md § Benchmarks](../docs/PRODUCTION.md#benchmarks)
- **Lighthouse simule le throttling** : chiffre opposable = PageSpeed Insights sur l'URL de production. Détail : [PRODUCTION.md § Benchmarks](../docs/PRODUCTION.md#benchmarks)
- **Formation IA intégrée dans `/services`** : pas de sous-page `/services/formation` dédiée tant que l'offre n'est pas stabilisée. Réévaluer uniquement si l'offre formation grossit significativement

## Commandes

**`just` exige bash** : le `Justfile` pose `set shell := ["bash", "-cu"]`. Le hook `env-check` vérifie au démarrage que `bash` résout bien vers Git Bash et non vers le lanceur WSL.

| Commande / Skill | Rôle |
|---|---|
| `/dev-server` | Démarre/arrête le serveur Next.js (`just dev` / `just stop`) |
| `/quality-check` | Lint, typecheck, tests (`just lint` / `typecheck` / `test`) |
| `/setup-ops` | Install, bootstrap env, diagnostics (`just install` / `setup` / `check`) |
| `infra-ops` | Docker + Prisma DB (`just docker-*` / `db-*`). Invocation explicite uniquement (effets destructifs possibles) |
| `git-ops` | Workflow git `feature/*` → `develop` → `main`, commits Conventional, PRs, tags. Invocation explicite uniquement |
| `verify` | Recette de build-and-drive (lancer l'app, piloter chaque surface, capturer les preuves), lue et enrichie par `/verify`. Voir [.claude/skills/verify/](skills/verify/) |
| `shadcn` | Auto-chargé sur composants. Discovery/audit/install via CLI pour les 3 registries (`@shadcn`, `@magicui`, `@aceternity`). Voir [.claude/skills/shadcn/](skills/shadcn/). |

> Recettes complètes : `just --list` ou voir [Justfile](../Justfile).
