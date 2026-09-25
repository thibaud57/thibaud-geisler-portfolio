---
title: "PRODUCTION — Thibaud Geisler Portfolio"
description: "Documentation opérationnelle : release strategy, déploiement, monitoring, incidents et backup pour thibaud-geisler.com."
date: "2026-09-03"
keywords: ["production", "deployment", "monitoring", "incidents", "release", "dokploy", "docker"]
scope: ["docs", "ops"]
technologies: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Docker", "Dokploy", "Pino", "Sentry"]
---

# 🚀 Release Strategy

## Versioning

**Schéma** : SemVer, `MAJOR.MINOR.PATCH`

- `MAJOR` : rupture de l'interface publique du site ou du schéma de base de données
- `MINOR` : nouvelle fonctionnalité rétrocompatible (nouvelle page, nouvelle section)
- `PATCH` : correction de bug ou ajustement mineur

> **Régime `1.x` actif depuis mai 2026**, franchi avec le premier déploiement validé et les features MVP livrées (accueil, projets, services, contact). Toute rupture impose désormais un MAJOR. Les bumps sont calculés par release-please depuis les commits Conventional (`feat:` → MINOR, `fix:` → PATCH, `feat!:` ou `BREAKING CHANGE` → MAJOR) ; la version courante vit dans [CHANGELOG.md](../CHANGELOG.md), jamais dans cette prose.

## Workflow Release

### Flow

```
feature/* → develop → main → tag vX.Y.Z   (flux normal — fin d'epic)
hotfix/*  → main → tag vX.Y.Z             (flux hotfix — bug critique prod)
```

### Flux Release

| Étape | Branch | Environnement | Déclencheur |
|-------|--------|---------------|-------------|
| Développement | `feature/*` | Local | - |
| Intégration | `develop` | Local | Merge feature/* → develop |
| Mise en production | `main` | Production (Dokploy) | Merge develop → main (epic terminé) |
| PR release (CHANGELOG + bump version) | `release-please--branches--main--*` | - | Auto à chaque merge sur `main` (release-please) |
| Tag release | - | - | Auto au merge de la PR release-please |
| Resync develop | `develop` | Local | `git pull origin main` après tag |

### Flux Hotfix (bug critique prod)

| Étape | Branch | Environnement | Déclencheur |
|-------|--------|---------------|-------------|
| Fix | `hotfix/*` depuis `main` | Local | - |
| Mise en production | `main` | Production (Dokploy) | Merge hotfix/* → main |
| Tag release | - | - | Auto au merge de la PR release-please |
| Resync develop | `develop` | Local | `git pull origin main` après tag |

## Convention Commits

**Format** : `type(scope optionnel): description`

| Type | Usage | release-please |
|------|-------|----------------|
| `feat` | Nouvelle fonctionnalité (`feat(projets): add case study page`) | **MINOR bump** |
| `feat!` | Breaking change ou refonte majeure (footer `BREAKING CHANGE:` accepté aussi) | **MAJOR bump** |
| `fix` | Correction de bug (`fix(contact): handle SMTP timeout`) | **PATCH bump** |
| `docs` | Documentation uniquement | skip |
| `refactor` | Refactoring sans changement fonctionnel | skip |
| `test` | Ajout ou modification de tests | skip |
| `chore` | Maintenance, dépendances, configuration Docker/Dokploy | skip |

> **PR develop → main** : le squash-merge crée 1 commit sur `main` dont le titre est le **titre de la PR**. Titre obligatoirement `feat:` / `fix:` / `feat!:` sinon release-please skip → pas de PR de release → pas de tag → pas de deploy.

> **Forcer un numéro de version** : release-please lit `Release-As: X.Y.Z` dans le **corps d'un commit** de `main`, jamais dans la description de la PR. Le dépôt étant réglé en `COMMIT_MESSAGES`, ce corps est la liste des commits de `develop` : écrire le footer dans la description de la PR ne produit donc rien, silencieusement. Le poser en l'ajoutant dans l'éditeur de message au moment du squash.

> **Corriger les release notes après coup** : ajouter un bloc `BEGIN_COMMIT_OVERRIDE` / `END_COMMIT_OVERRIDE` dans le corps de la PR **déjà mergée**, contenant les messages Conventional à retenir. release-please les utilise à la place du message du commit. Ne fonctionne qu'en squash-merge, ce qui est le réglage du dépôt.

## Checklist Release

**Automatisé par GitHub Actions (vérifier le statut CI avant de merger) :**
- [ ] Tests passent (lint, typecheck, tests unitaires/intégration)
- [ ] Build sans erreurs TypeScript
- [ ] `just audit` lu, même s'il ne bloque pas (§ Dépendances)
- [ ] Alertes Trivy de l'onglet Security lues, même si le scan ne bloque pas (§ Dépendances)

> ℹ️ Le job `quality` est **sauté** sur un diff purement documentaire et sur les branches `release-please--*` : une PR de release affichée « verte » n'a donc rien exécuté, c'est normal.

**Manuel :**
Dans l'ordre où ils s'exécutent, le tag étant ce qui déclenche le déploiement :

- [ ] Variables d'environnement à jour dans Dokploy
- [ ] Si la release embarque une migration qui déplace ou transforme des données existantes : dernière sauvegarde réussie et datée du jour dans Dokploy (Database `portfolio-db` → Backups), le rollback du code ne défaisant pas une migration (§ Rollback)
- [ ] Merge vers `main` validé (develop → main fin d'epic, ou hotfix/* → main pour bug critique)
- [ ] PR release-please mergée → tag `vX.Y.Z` auto-créé → `deploy.yml` déclenché
- [ ] Déploiement confirmé (Compose `Portfolio-app` → Deployments → statut ✅)
- [ ] Migrations Prisma appliquées, à vérifier dans les logs au démarrage du container
- [ ] Smoke test : accueil, `/projets`, formulaire contact
- [ ] Security headers vérifiés si `next.config.ts` a changé (`curl -I https://thibaud-geisler.com/fr`)

> **Politique de tagging** : les tags sont générés par release-please au merge de la PR de release sur `main` (fin d'epic ou hotfix critique) ; les merges `feature/* → develop` ne déclenchent rien. **Le tag précède la validation prod** : c'est lui qui déclenche le déploiement, rien n'est en ligne avant. Il atteste donc qu'une version est *mise* en production, pas qu'elle y est *validée*. Smoke test rouge → `hotfix/*` → `main` → nouveau tag, jamais de suppression du tag fautif : elle fausserait le CHANGELOG sans rien redéployer.

---

# 🌍 Environnements

## Liste Environnements

| Env | URL | Branch | Auto-deploy |
|-----|-----|--------|-------------|
| development | `http://localhost:3000` (`just dev`) | - | Non |
| production | `https://thibaud-geisler.com` | `main` (tag `v*` créé par release-please) | Oui (GHA → GHCR → API Dokploy redeploy) |

### Accès Dashboard Dokploy

- **URL** : `<domaine privé du dashboard Dokploy>`, en HTTPS avec certificat Let's Encrypt. Volontairement non écrite ici, ce dépôt est public
- **Chemin vers le service** : projet `Portfolio` → Compose `Portfolio-app` (l'application) ou Database `portfolio-db` (Postgres)
- **Onglets essentiels du Compose** :
  - `Environment` : variables et secrets du service
  - `Deployments` : historique des déploiements et leurs logs
  - `Logs` : sortie stdout en temps réel (JSON Pino)

## Variables d'Environnement

> **Validation runtime** : toutes les vars typées et validées via `src/env.ts` (`@t3-oss/env-nextjs` + Zod), server vs client séparés. Bypass par `SKIP_ENV_VALIDATION` pour le build CI/Docker et les tests Vitest : **toute valeur non vide suffit**, la variable n'est pas comparée à `true`.

> ⚠️ **Une variable requise manquante ne fait pas tomber le container** (constaté le 2026-09-25) : les migrations s'appliquent, puis chaque requête répond 500, `/api/health` compris, et le domaine passe en 404. Correctif : poser la variable, puis Redeploy.

> **Une variable ne se configure pas** : `NEXT_PUBLIC_BUILD_YEAR` est injectée au build par `next.config.ts`, calculée automatiquement, jamais posée dans l'Environment Dokploy.

### Variables Communes

```bash
# Application
NODE_ENV=                           # development | production
NEXT_PUBLIC_SITE_URL=               # URL canonique du site (requis : metadata, sitemap, JSON-LD, OG)
                                    # Dev local : http://localhost:3000 | Prod : https://thibaud-geisler.com
                                    # ⚠️ Inlinée dans le bundle JS au build → propagée via build args du workflow GHA `deploy.yml` (input `vars.NEXT_PUBLIC_SITE_URL` GitHub Repository Variables)
LOG_LEVEL=                          # Optionnel — niveau de log Pino (fatal|error|warn|info|debug|trace|silent). Défaut : debug en dev, info en prod

# Calendly (widget inline /contact, exposé au navigateur — une URL par locale, event types FR/EN distincts)
# ⚠️ Inlinées dans le bundle JS au build → propagées via build args du workflow GHA `deploy.yml` (inputs `vars.NEXT_PUBLIC_CALENDLY_URL_FR/EN` GitHub Repository Variables)
NEXT_PUBLIC_CALENDLY_URL_FR=        # URL Calendly FR (ex: https://calendly.com/<slug>/<event-type-fr>)
NEXT_PUBLIC_CALENDLY_URL_EN=        # URL Calendly EN (ex: https://calendly.com/<slug>/<event-type-en>)

# Sentry (monitoring d'erreurs et tracing, DSN exposé au navigateur)
# ⚠️ Inlinée dans le bundle JS au build → propagée via build args du workflow GHA `deploy.yml` (input `vars.NEXT_PUBLIC_SENTRY_DSN` GitHub Repository Variables)
NEXT_PUBLIC_SENTRY_DSN=             # DSN du projet Sentry (Project Settings → SDK Setup → Client Keys). Fiche : knowledges/sentry.md
```

> **Dev local uniquement (`POSTGRES_*`)** : `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` sont consommés par `compose.override.yaml` pour initialiser le Postgres local et ne sont pas utilisés en prod (Dokploy gère sa propre Database avec ses credentials). Voir `.env.example` pour les valeurs par défaut dev.

### Variables Secrets

```bash
# Via Dokploy → projet Portfolio → Compose Portfolio-app → onglet Environment

# Base de données (Postgres séparée Dokploy Database — DNS interne au réseau Dokploy)
DATABASE_URL=                       # ex prod : postgresql://portfolio:<pass>@portfolio-db-<suffix>:5432/portfolio
                                    # ex dev local : postgresql://portfolio:portfolio@localhost:5432/portfolio
                                    # ⚠️ Le host change selon le contexte : `localhost` en `just dev` natif, `postgres` pour le service nextjs du compose local
                                    # ⚠️ En prod, le host est le `appName` Dokploy de la Database (visible dans Dokploy UI), pas "localhost"
                                    # ⚠️ Prisma 7 : la CLI ne charge plus .env automatiquement. En prod Dokploy, aucun impact (var injectée par Docker). En dev local : `@next/env` dans `prisma.config.ts` charge le .env.

# SMTP IONOS (formulaire contact)
SMTP_HOST=                         # Hôte SMTP IONOS (ex: smtp.ionos.fr)
SMTP_PORT=                         # Port SMTP (587 TLS ou 465 SSL)
SMTP_USER=                         # Compte SMTP (ex: contact@thibaud-geisler.com)
SMTP_PASS=                         # Mot de passe SMTP IONOS
SMTP_FROM=                         # Adresse expéditeur affichée
MAIL_TO=                           # Adresse destinataire des messages du formulaire de contact

# Sécurité (hachage des IP dans les logs — pseudonymisation)
IP_HASH_SALT=                      # Sel secret du hash SHA-256 des IP loggées. 16+ caractères. Générer : openssl rand -hex 32

# Cloudflare R2 (assets servis via /api/assets/[...path] et /admin/api/assets/[...path], SDK S3, ADR-011)
R2_ACCOUNT_ID=                     # Identifiant de compte Cloudflare, compose l'endpoint https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com
R2_ASSETS_ACCESS_KEY_ID=           # Clé du token R2 "Object Read & Write", restreint au bucket portfolio-assets
R2_ASSETS_SECRET_ACCESS_KEY=       # Secret du même token
R2_ASSETS_BUCKET=                  # Nom du bucket lu par la route : portfolio-assets en prod, portfolio-assets-dev en dev
R2_ADMIN_ACCESS_KEY_ID=            # Clé du token R2 "Object Read & Write", restreint au bucket portfolio-admin
R2_ADMIN_SECRET_ACCESS_KEY=        # Secret du même token
R2_ADMIN_BUCKET=                   # Nom du bucket lu par la route admin : portfolio-admin en prod, portfolio-admin-dev en dev

# Better Auth (authentification de l'espace admin, Google OAuth unique provider, ADR-002)
BETTER_AUTH_URL=                   # URL de base des redirect URIs. Dev : http://localhost:3000 | Prod : https://thibaud-geisler.com
GOOGLE_CLIENT_ID=                  # Identifiant du client OAuth (Google Cloud Console → APIs & Services → Credentials)
GOOGLE_CLIENT_SECRET=              # Secret du client OAuth
BETTER_AUTH_SECRET=                # Secret de signature des sessions et jetons. Générer : openssl rand -base64 32
ADMIN_EMAIL=                       # Seule adresse de compte Google autorisée à créer un compte, comparée dans le hook databaseHooks.user.create.before
```

### Règles

- ✅ **Les secrets vivent dans l'Environment du Compose Dokploy**, jamais dans le dépôt
- ✅ **Toute variable ajoutée est documentée ici** et déclarée dans `src/env.ts`, sinon l'app répond 500 à chaque requête
- ✅ **`NEXT_PUBLIC_` uniquement pour ce qui est exposé au navigateur**, et à passer en build-arg dans `deploy.yml` puisque la valeur est inlinée au build

### Anti-Patterns

- ❌ **Ne pas mettre `DATABASE_URL` avec host `localhost`** en production : le host est le `appName` Dokploy de la Database, résolu par le DNS interne du réseau Dokploy
- ❌ **Ne pas préfixer `NEXT_PUBLIC_` un secret** : la valeur part dans le bundle JS servi au navigateur et devient publique et irrévocable, une rotation est alors la seule issue

---

# 🔄 CI/CD & Déploiement

## Pipelines

| Trigger | Étapes | Cible |
|---------|--------|-------|
| Push sur `main`, PR vers `main` ou `develop` | lint (ESLint, Prettier, `prisma validate`, `actionlint`), typecheck, tests, build, `pnpm audit` non bloquant (workflow `ci.yml`) | - |
| Merge sur `main` | release-please ouvre/maj la PR de release (CHANGELOG + bump) | - |
| Merge de la PR release-please | tag `vX.Y.Z` créé par la GitHub App de release | - |
| Push tag `v*` | build Docker + push GHCR + trigger Dokploy redeploy (workflow `deploy.yml`) | Production |
| Chaque lundi, ou dispatch manuel | Scan Trivy de l'image `latest` publiée sur GHCR, rapport dans l'onglet Security (workflow `security.yml`) | - |

> GitHub Actions porte désormais l'intégralité du build Docker : Dokploy ne build plus, il pull GHCR. Le déploiement est strictement piloté par les tags release-please, jamais par un merge direct sur `main`.

## Étapes de Déploiement (Automatiques)

**Côté GHA (`deploy.yml`)** : tag `v*` push → build Docker → push GHCR (`latest` + `X.Y.Z` + `X.Y` + `sha-XXX`) → curl POST `api/compose.redeploy` Dokploy avec retry 3×. Le build ne touche aucune base : le site public ne cuit pas de contenu au prerender ([ADR-022](adrs/022-rendu-public-sans-donnee-au-build.md)).

**Côté Dokploy** : `docker compose pull` (image GHCR) → `docker compose up -d` (recreate container) → CMD `prisma migrate deploy && node server.js`.

> ⚠️ **Le déploiement coupe brièvement le service, en `404`** : un Compose recrée le container, il n'y a pas de rolling update, et Traefik ne route que vers un container `healthy` ([knowledges/dokploy.md](knowledges/dokploy.md#traefik-et-lets-encrypt)). Le temps du `prisma migrate deploy` puis du démarrage Next, le domaine répond `404` : c'est une protection, pas une panne (moins de 10 s mesurées au redeploy du 2026-09-21, sans migration). Une migration lourde (`ALTER TABLE` sur table volumineuse) allonge d'autant la fenêtre : dans ce cas, l'appliquer manuellement avant le déploiement.

> ℹ️ **Healthcheck** : `compose.yaml` interroge `/api/health` toutes les 30 s, et toutes les 5 s (défaut Docker) pendant le `start_period` de 60 s qui couvre les migrations. Il conditionne le routage Traefik et rend l'état du container observable : `docker ps` le montre `unhealthy`, et c'est ce que sonde le monitoring externe (§ Observabilité).

> ⚠️ **`/api/health` est un contrôle de vie, pas de disponibilité** : la route retourne `{ status: 'ok' }` sans interroger la base. Postgres injoignable pendant que le process Node tient, et le container reste `healthy`, la sonde externe ne voit rien. Une panne BDD se détecte donc dans les logs (§ Incident Response), jamais par le healthcheck. L'y ajouter un `SELECT 1` reviendrait à faire redémarrer l'app à chaque hoquet réseau de la base : c'est un arbitrage, pas un oubli.

> ℹ️ **Provider Dokploy** : Provider `GitHub` fonctionne en pull-only tant que `compose.yaml` n'a que `image:` sans `build:`. Un `build:` ferait reconstruire l'image sur le VPS, ce qui marcherait depuis [ADR-022](adrs/022-rendu-public-sans-donnee-au-build.md) (le build ne lit plus la base) mais renoncerait à ce que `deploy.yml` apporte : déploiement sur tag de release et non à chaque push sur `main`, image versionnée sur GHCR pour le rollback (§ Rollback) et le scan Trivy hebdomadaire (`security.yml`), et un build qui ne prend ni le CPU ni la RAM du VPS au site qui tourne.

## Rollback

**Déclencheur** : déploiement cassé, app ne démarre plus, régression critique détectée.

> ⚠️ **Pas de retour arrière par l'historique Dokploy** : `compose.yaml` référence l'image en `:latest` avec `pull_policy: always`. Un « Redeploy » sur un déploiement passé re-pull la **dernière** image publiée, pas celle de l'époque, et Dokploy ne conserve pas d'historique d'images pour un service Compose. Le seul retour arrière réel passe par un redéploiement du tag visé.

**Procédure** :
1. Identifier le dernier tag sain (`gh release list`, ou [CHANGELOG.md](../CHANGELOG.md))
2. `gh workflow run deploy.yml --ref vX.Y.Z` : `deploy.yml` rebuild depuis ce tag, republie `latest` sur cette version et déclenche le redeploy Dokploy (~3-8 min)
3. Vérifier le statut dans Dokploy → Compose `Portfolio-app` → onglet Deployments, puis smoke test
4. Corriger la cause sur `hotfix/*` → `main` → nouveau tag : le retour arrière est un roll-*forward* vers un `PATCH` supérieur, jamais une suppression du tag fautif

> ⚠️ **Dispatcher sur le ref du tag, jamais sur une branche** : le job de `deploy.yml` porte la condition `startsWith(github.ref, 'refs/tags/v')`. Lancé depuis une branche il est sauté, faute de quoi il publierait `latest` depuis du code jamais passé par la release.

> ℹ️ **« Redeploy » dans Dokploy** relance la **même** image : utile si le pull a échoué ou si le container est KO, sans effet sur la version déployée. C'est aussi le geste de reprise quand le `curl` de `deploy.yml` a échoué alors que l'image est bien sur GHCR.

> ⚠️ **Attention BDD** : le rollback du code ne défait pas les migrations Prisma déjà appliquées. Si la migration contenait un changement destructeur (`DROP COLUMN`, etc.), restaurer la BDD depuis le dernier backup (voir § Backup & Recovery) avant ou après le rollback.

> ⚠️ **Une release qui déplace le schéma ou modifie `compose.yaml` ne se défait pas par le seul redéploiement d'un tag** : Dokploy clone `main` à chaque déploiement, le tag rejoué tourne donc avec le `compose.yaml` courant sur une base déjà migrée. Revenir en arrière exige de restaurer la sauvegarde prise avant le merge et de remettre sur `main` l'ancien `compose.yaml`, avant de dispatcher `deploy.yml` sur le tag visé.

## Checklist Pré-MEP

Items validés une première fois avant le tout premier merge `develop → main`, celui qui a déclenché le premier déploiement et ouvert le régime `1.x` (mai 2026), puis revalidés lors des audits de septembre 2026 (`v1.6.0`). Conservés comme trace de ce qui a été vérifié ; les vérifications récurrentes vivent dans la Checklist Release.

### Bootstrap technique

- [x] **Dockerfile `output: 'standalone'`** : activé dans `next.config.ts`, le stage `runner` copie `.next/standalone`, `.next/static` et `public/`.
- [x] **Build Docker en Turbopack** : l'opt-out `next build --webpack`, posé pour une erreur de résolution WASM de Prisma 7 (`query_compiler_fast_bg.postgresql.mjs`), a été **retiré le 3 septembre 2026**, l'erreur n'étant plus reproductible (build de l'image et runtime du conteneur vérifiés contre une base réelle). Dev, CI et image de production partagent désormais le même bundler. À revalider par un build d'image à chaque montée de Next ou de Prisma. Versions et détail : [VERSIONS.md § Prisma ORM](VERSIONS.md).
- [x] **Migrations auto au startup container** : stage `deploy-prisma` (pnpm deploy --legacy --prod) + CMD `node node_modules/prisma/build/index.js migrate deploy && node server.js`. `prisma migrate deploy` s'exécute atomiquement au démarrage de chaque container.
- [x] **Favicon & icônes app** : favicon custom installé dans `src/app/` (convention Next.js App Router) : `favicon.ico` (legacy), `icon.svg` (vectoriel moderne), `apple-icon.png` (180x180 iOS). Next.js génère automatiquement les `<link rel="icon">` correspondants.

> Items techniques et assets de bootstrap, implémentés et validés empiriquement. Pas d'ADR : pas de décision architecturale structurelle, juste des optimisations, workarounds Docker/Next.js et assets de branding.

> **Port 5432 et overrides dev** : l'exposition du port Postgres et l'override `DATABASE_URL` sont isolés dans `compose.override.yaml`, auto-chargé en local et ignoré par Dokploy. Rien à désactiver manuellement avant un déploiement, et le port `5432` n'est pas joignable depuis l'extérieur en production (vérifié le 2026-09-03) : l'y voir ouvert un jour serait une anomalie.

### Revue globale de l'app

- [x] **`/simplify`** : passe qualité sur toute la branche
- [x] **`/code-review`** + **`Agent(code-reviewer)`** : correctness et conventions du projet
- [x] **Appliquer les findings retenus** : écartés justifiés en commentaire de PR
- [x] **`/security-review`** : passé le 2026-09-04 sur l'état gelé de `develop` (contenu strictement identique à `main`, tag `v1.6.0`). Périmètre porté à l'application entière, le diff de branche étant vide. **Aucune vulnérabilité exploitable.** Path traversal, injection d'en-têtes SMTP, SQLi, XSS, fuite de secrets, `'use cache'` lisant `headers()`/`cookies()` : tous vérifiés et sains. La seule dette relevée, trois `href` alimentés par la BDD sans allowlist de scheme, est close : les schémas Zod de l'espace admin n'y acceptent que `http` et `https`

> Points de vigilance connus, sans que la revue s'y limite : Server Actions, upload d'assets, surface Prisma exposée.

### Conformité légale & RGPD

- [x] **Pages légales `/mentions-legales` + `/confidentialite`** : publiées (RGPD art. 13/14, base légale intérêt légitime pour le formulaire de contact)
- [x] **Bandeau de consentement cookies** : actif (bandeau c15t, qui conditionne le montage du widget Calendly)
- [x] **Registre des traitements (RGPD art. 30)** : [registre-traitements.md](registre-traitements.md) créé, recense les traitements de données personnelles (formulaire de contact, logs serveur, Calendly)

### Cohérence documentaire

- [x] **BRAINSTORM.md** : audité (verdict OK pour MEP, écarts mineurs doc-only, deps non listées, à compléter post-MEP)
- [x] **ARCHITECTURE.md** : audité (verdict OK, corrections doc-only reportées après la MEP)
- [x] **DESIGN.md** : audité (verdict à corriger, non bloquant)
- [x] **VERSIONS.md** : audité (périmètre limité à ce que le dépôt déclare, la plateforme d'hébergement est documentée ici)
- [x] **PRODUCTION.md** : audité (procédures opérationnelles en place, mises à jour pour refléter le passage à une Postgres Dokploy externe). Ré-audité le 2026-09-03, chaque valeur recoupée avec l'infrastructure réelle
- [x] **README.md** : réécrit (stack, prérequis, getting started, scripts `just *`, vars d'env, archi, i18n, assets, déploiement, docs, workflow git)

### Validation technique finale

- [x] **`just check`** : diagnostics env (Node, pnpm, Docker, `.env`, Postgres)
- [x] **`just lint`** + **`just typecheck`** : code sain (déjà couverts en CI, sécu finale en local)
- [x] **`just test`** : tous les tests passent en local
- [x] **`just build`** : build Next.js standalone passe sans erreur
- [x] **Smoke test du livrable** : construire l'image localement (`docker build`, en passant les build-args `NEXT_PUBLIC_*`), puis `just docker-up` avec un `DATABASE_URL` joignable et une requête sur `localhost:3000/api/health`. Le build n'exige aucune base depuis [ADR-022](adrs/022-rendu-public-sans-donnee-au-build.md) : un `DATABASE_URL` joignable n'est nécessaire qu'au `just docker-up` qui suit. Pattern de data-fetching : [ARCHITECTURE.md § Patterns Utilisés](ARCHITECTURE.md#patterns-utilisés).

## Checklist Post-MEP

Items effectués une fois, après le premier déploiement validé : ils exigeaient pour la plupart que le site soit accessible publiquement. Comme la Pré-MEP, cette liste est une trace, pas une procédure à rejouer.

- [x] **Seed BDD initial** : effectué au premier déploiement (mai 2026) par le Schedule Dokploy `manual-seed`. Le seed et le Schedule ont disparu avec le sub-project `14` de l'espace admin (septembre 2026) : le contenu vient de l'espace admin, et une base vide se remplit par transfert (§ Backup & Recovery, Procédure : Remplir la base depuis un dump de dev)
- [x] **Upload assets initial** : copier le contenu local de `assets/` vers le volume Docker `portfolio_assets` (monté sur `/app/assets` du service nextjs) une fois après le 1er déploiement. Sans ça, toutes les images projets et documents retournent 404 via `/api/assets/[...path]` (ADR-011 : assets gitignorés, persistance par volume).
- [x] **Search Console + Bing Webmaster** : vérifier propriété (DNS TXT) + soumettre `sitemap.xml`
- [x] **Validation rich results JSON-LD** : [Google Rich Results Test](https://search.google.com/test/rich-results) sur `/a-propos` (Profile page) et pages internes (Breadcrumbs), FR + EN, 0 erreur
- [x] **Accessibilité `/llms.txt`** : `curl` sur l'URL prod retourne le markdown attendu
- [x] **Baseline Core Web Vitals** : [PageSpeed Insights](https://pagespeed.web.dev/) sur 4 pages clés × 2 locales, noter LCP/INP/CLS comme baseline (cf. [baselines/](baselines/))

> ℹ️ **Il n'existe plus de seed** : `prisma db seed` n'est pas configuré et le dépôt ne porte plus aucune donnée de contenu. Une base se remplit par un dump (`just db-restore` en local, § Backup & Recovery en production), jamais par rejeu de fichiers du dépôt.

---

# 🔧 Mises à jour

## Composants applicatifs

| Composant | Fréquence | Procédure | Responsable |
|-----------|-----------|-----------|-------------|
| Dépendances npm | Mensuelle | PRs Dependabot sur `develop` (cf. § Dépendances) → CI verte → merge | Dev |
| Next.js, Prisma (major) | Sur release majeure | PR dédiée, jamais groupée : suivre le guide de migration → build de l'image → smoke test prod | Dev |
| Image Docker Node | Au fil des PRs Dependabot | Le `FROM` du `Dockerfile` est surveillé par l'écosystème `docker` de Dependabot → pris en compte au prochain build GHA | Dev |
| Image Docker Postgres | Trimestrielle | Non couverte par Dependabot (déclarée dans Dokploy, pas dans le dépôt) : changer `dockerImage` sur la Database → redeploy | Dev |

> ✅ **Toujours vérifier le build et les tests avant de merger une mise à jour de dépendances**
> ❌ **Ne jamais mettre à jour Next.js et Prisma simultanément** : isoler les mises à jour critiques

## Plateforme d'hébergement

Ces composants tournent sur le VPS et **aucun fichier du dépôt ne les déclare**. Conséquence directe : rien ne signale quand ces valeurs périment, contrairement aux dépendances applicatives que `pnpm-lock.yaml` verrouille. C'est pourquoi elles vivent ici et non dans [VERSIONS.md](VERSIONS.md), dont le périmètre est ce que le dépôt déclare.

| Composant | Version documentée | Dernière publiée | Relevé le |
|---|---|---|---|
| Docker Engine | `29.8.0` | `29.8.0` | 2026-09-04 |
| Docker Compose | `5.5.1` | `5.5.1` | 2026-09-04 |
| Dokploy | `0.30.7` | `0.30.7` (2026-09-18) | 2026-09-21 |
| Traefik | `3.7.13` | `3.7.13` (2026-09-04) | 2026-09-20 |
| Cloudflare R2 | managed service | — | sans objet |

> **Comment relever** : `docker version --format '{{.Server.Version}}'` et `docker compose version --short` en SSH sur le VPS ; la version de Dokploy s'affiche dans son UI, et son API la renvoie sur `settings.getDokployVersion` ; celle de Traefik se lit sur l'image du container, `docker ps --filter name=traefik --format '{{.Image}}'`. Refaire ce relevé avant toute montée, c'est la seule chose qui signale que ce tableau a périmé.

**Pièges de montée**, à lire avant d'y toucher :

- **Dokploy** : depuis la v0.26 les rollbacks sont registry-based, ce qui rend GHCR indispensable à la fonctionnalité, sans objet ici tant que `compose.yaml` pointe `:latest` (cf. § Rollback). L'auto-update par l'UI est parfois défaillant, préférer le script d'update officiel.
- **Traefik** : Dokploy ne monte jamais son image, mais peut recréer le container sur une version plus ancienne lors de ses propres mises à jour. Relever l'image après chaque montée de Dokploy ([knowledges/dokploy.md](knowledges/dokploy.md#traefik-et-lets-encrypt)).
- **Docker Engine 29** : API minimale v1.44, un client antérieur à la v25 ne parle plus au daemon.
- **Docker Compose v5** : le build passe par Docker Bake, le builder interne a disparu ; le champ `version:` du YAML est ignoré.
- **Cloudflare R2** : service managé, aucune version à suivre, donc aucune montée à préparer. Ses limites structurelles (pas de versioning, Bucket Locks ≠ Object Lock WORM, facturation arrondie) conditionnent la stratégie de sauvegarde et sont documentées dans [knowledges/cloudflare-r2.md](knowledges/cloudflare-r2.md).

---

# 🔐 Sécurité & Configuration

## Secrets & Configuration

### Gestion des Secrets

| Type | Stockage | Accès |
|------|----------|-------|
| Credentials SMTP | Dokploy : Environment du Compose | Via `env`, côté serveur uniquement (transporter Nodemailer) |
| `DATABASE_URL` | Dokploy : Environment du Compose | Via `env` (client Prisma) |
| `IP_HASH_SALT` | Dokploy : Environment du Compose | Via `env`, côté serveur uniquement (hachage des IP dans les logs) |
| `DOKPLOY_URL` / `DOKPLOY_TOKEN` / `DOKPLOY_COMPOSE_ID` | GitHub : Repository Secrets | Workflow `deploy.yml` (curl trigger redeploy via API Dokploy) |
| `SENTRY_AUTH_TOKEN` | GitHub : Repository Secrets | Secret de **build** uniquement, monté via BuildKit (`--mount=type=secret`) dans `Dockerfile` pour l'upload des source maps. N'est jamais posé en variable d'environnement Dokploy : le runtime du conteneur n'en a pas besoin |
| `RELEASE_APP_CLIENT_ID` (Variable) + `RELEASE_APP_PRIVATE_KEY` (Secret) | GitHub : Repository Variables et Secrets | Workflow `release-please.yml` via `actions/create-github-app-token@v3`. L'App `thibaud-geisler-portfolio` porte Contents / Issues / Pull requests en read-write et Metadata en read, bornées au seul dépôt. Le token d'installation est frappé à chaque run, valable 1 h, révoqué dans le step `post` du job. Indispensable pour que le push de tag déclenche `deploy.yml` : les événements émis par le `GITHUB_TOKEN` intégré ne déclenchent aucun workflow |
| `BETTER_AUTH_URL` / `BETTER_AUTH_SECRET` | Dokploy : Environment du Compose | Via `env` (`src/lib/auth.ts`), construction des redirect URIs OAuth ; `BETTER_AUTH_SECRET` côté serveur uniquement (signature des sessions et jetons) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Dokploy : Environment du Compose | Via `env`, provider Google OAuth ; `GOOGLE_CLIENT_SECRET` côté serveur uniquement |
| `ADMIN_EMAIL` | Dokploy : Environment du Compose | Via `env`, côté serveur uniquement (hook de whitelist `databaseHooks.user.create.before`) |

> **Lecture des secrets dans le code** : toujours via `env` (`src/env.ts`, `@t3-oss/env-nextjs`), jamais `process.env` : la validation Zod est ce qui garantit le typage et une erreur explicite dès le démarrage quand une variable manque. Unique exception : `prisma.config.ts`, exécuté par la CLI Prisma hors du runtime Next, qui lit `process.env.DATABASE_URL`. Détail de la convention : [.claude/rules/zod/validation.md](../.claude/rules/zod/validation.md).

### Rotation

| Secret | Fréquence | Procédure |
|--------|-----------|-----------|
| `SMTP_PASS` | En cas de compromission ou changement de mot de passe IONOS | Mettre à jour dans Dokploy → redéploiement automatique |
| `DATABASE_URL` (mot de passe) | En cas de compromission | Régénérer le password sur la Database `portfolio-db` → **recopier la nouvelle URL** dans l'Environment du Compose → Redeploy. Rien ne propage automatiquement : Database et Compose sont deux services distincts, l'URL y est un littéral. Sans la recopie, l'app redémarre avec l'ancienne et ne se connecte plus |
| `IP_HASH_SALT` | En cas de compromission | Régénérer (`openssl rand -hex 32`) → Dokploy → les nouveaux logs utilisent le nouveau sel, les hashs déjà écrits restent inchangés |
| Clé privée de la GitHub App de release | **Aucune expiration, donc aucune échéance à surveiller.** Rotation sur compromission uniquement | Settings → Developer settings → GitHub Apps → `thibaud-geisler-portfolio` → General → Private keys → Generate a private key, puis remplacer le secret repo par le contenu intégral du `.pem` (lignes `BEGIN`/`END` incluses). Supprimer l'ancienne clé dans l'App et le `.pem` du disque |
| `DOKPLOY_TOKEN` | En cas de compromission | Régénérer dans Dokploy UI (Settings → API tokens) → mettre à jour le secret repo GitHub |
| `BETTER_AUTH_SECRET` | En cas de compromission | Régénérer (`openssl rand -base64 32`) → Dokploy → Redeploy. Invalide toutes les sessions actives, la prochaine connexion les recrée |
| `GOOGLE_CLIENT_SECRET` | En cas de compromission | Google Cloud Console → Credentials → régénérer le secret du client OAuth → recopier dans Dokploy → Redeploy |
| `ADMIN_EMAIL` | En cas de changement du compte administrateur | Mettre à jour dans Dokploy → Redeploy. Le hook de whitelist n'autorise plus le précédent compte qu'à la prochaine tentative de création |

## Security Headers

Configurés dans `next.config.ts` (`poweredByHeader: false` activé, retire `X-Powered-By: Next.js`).

| Header | Valeur | Rôle |
|--------|--------|------|
| `X-Frame-Options` | `DENY` | Protection clickjacking |
| `X-Content-Type-Options` | `nosniff` | Empêche le MIME sniffing |
| `X-XSS-Protection` | `0` | Désactivé, CSP prend le relais (le filtre natif peut introduire des failles) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limite la fuite d'URL vers les sites externes |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Désactive les APIs navigateur inutilisées |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS sur 1 an |
| `Content-Security-Policy` | Politique complète ci-dessous | Whitelist des origines autorisées, protection XSS |

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: https:; frame-src https://calendly.com https://*.calendly.com;
connect-src 'self' https://*.calendly.com https://o4511826481774592.ingest.de.sentry.io;
font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```

> ℹ️ **Ce que la politique concède, et à qui** : `frame-src` n'ouvre que Calendly, dont le widget est embarqué sur `/contact` et n'est chargé qu'après consentement. `connect-src` ouvre Calendly et l'ingestion Sentry (organisation `tg-ws`, région européenne `de.sentry.io`). `'unsafe-inline'` sur `script-src` et `style-src` est la contrepartie du rendu Next sans nonce. `img-src https:` reste large pour les images distantes. En dev seulement, `script-src` gagne `'unsafe-eval'` (HMR). Toute origine tierce ajoutée plus tard (Umami) doit être déclarée explicitement, sans quoi elle est bloquée en silence côté navigateur.

> ⚠️ **En production, Traefik réécrit `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` et `Permissions-Policy`** (middleware `security-headers@file` du point d'entrée, relevé du 2026-09-21). `next.config.ts` porte les mêmes valeurs, en fallback. `Permissions-Policy` sort dans l'ordre de Traefik : `geolocation=(), microphone=(), camera=()`.

> ✅ **Vérifier après chaque modification de `next.config.ts` ou du middleware Traefik** : `curl -I https://thibaud-geisler.com/fr` et comparer aux valeurs de ce tableau
> ❌ **Ne pas désactiver HSTS ou CSP en production**, même temporairement

## CORS

Aucune politique CORS : le site ne sert que ses propres pages et ses Server Actions, aucun client tiers n'appelle son origine. Next.js protège déjà les Server Actions en comparant `Origin` et `Host`. À définir le jour où une API publique ou un client navigateur externe apparaîtrait.

## Rate Limiting

| Endpoint / Scope | Limite | Fenêtre | Mécanisme |
|-----------------|--------|---------|-----------|
| Formulaire contact (Server Action) | 5 requêtes | 10 min | Fenêtre glissante par IP, en mémoire (`src/lib/rate-limiter.ts`, cap 1000 clés). Dépassement → event `rate_limit:exceeded` en `warn` |
| Domaine, toutes routes | 600 requêtes, rafale 200 | 1 min | Middleware Traefik `rate-limit-strict@file`, posé sur le domaine, par IP source (IPv6 regroupées par `/64`). Dépassement → `429` |
| Défaut du VPS, tous sites | 3000 requêtes, rafale 1000 | 1 min | Middleware Traefik `rate-limit@file`, posé sur le point d'entrée `websecure` |

> ⚠️ **Ne jamais référencer `rate-limit@file` sur le domaine** : le point d'entrée l'applique déjà, traversé deux fois il compterait double. Les deux couches Traefik se cumulent, la plus stricte l'emporte. Repère de réglage : une page du site demande 49 requêtes (mesuré le 2026-09-20).

> **Chatbot (post-MVP)** : son quota ne se fixe pas ici. La route ne vivra pas dans ce dépôt mais dans le service `portfolio-chatbot`, c'est sa propre documentation d'exploitation qui la portera ([ADR-014](adrs/014-rate-limiting-chatbot.md) pour la décision).

## Taille des requêtes

`serverActions.bodySizeLimit` (`next.config.ts`) est relevée à **10 Mo** pour l'upload d'assets depuis l'espace admin, contre 1 Mo par défaut. Cette limite porte sur le corps HTTP brut, overhead multipart compris, et diffère de `MAX_ASSET_BYTES` (**8 Mo**, `src/lib/schemas/asset.ts`) : c'est ce second chiffre qu'annonce l'interface et que vérifient le client comme le serveur. Les 2 Mo d'écart couvrent cet overhead (boundary et en-têtes multipart) : sans marge, un fichier proche de 8 Mo ferait dépasser le corps de requête et déclencherait le rejet générique du framework au lieu du message de `MAX_ASSET_BYTES`. La mise en garde de Next sur la consommation de ressources d'une limite élevée ne s'applique pas ici : l'action vit derrière l'authentification de l'espace admin et n'est joignable que par le seul compte autorisé (`ADMIN_EMAIL`).

## Domaine & Redirection

`www.thibaud-geisler.com` redirige vers `thibaud-geisler.com` via un middleware Traefik custom (`redirect-www-to-apex`, depuis le 2026-09-04), le domaine principal restant l'unique adresse indexée. Config et procédure : [knowledges/dokploy.md § Middleware Traefik custom](knowledges/dokploy.md#middleware-traefik-custom-redirection-www).

> ✅ **Vérifié le 2026-09-04** : `curl -IL https://www.thibaud-geisler.com/` → `308 Permanent Redirect` vers `https://thibaud-geisler.com/` (Traefik `permanent: true` répond 301 en GET, 308 sur les autres méthodes dont `HEAD`, celle utilisée par `curl -I`)

## Dépendances

| Outil | Scope | Fréquence | Config |
|-------|-------|-----------|--------|
| Dependabot | `npm`, `github-actions`, `docker` (le `FROM` du Dockerfile) | Mensuelle | [.github/dependabot.yml](../.github/dependabot.yml) : PRs vers `develop`, 5 ouvertes au plus, mineures et patchs groupés en une PR `minor-patch`, majeures isolées |
| `pnpm audit` | Vulnérabilités des dépendances | À chaque run CI, et en local par `just audit` | Seuil `--audit-level=high`, **non bloquant** en CI (`continue-on-error`) : il signale, il n'arrête pas le pipeline |
| Trivy | Image `latest` de GHCR, celle que tire Dokploy : sévérités `CRITICAL` et `HIGH` corrigeables | Hebdomadaire, et à la demande par `gh workflow run security.yml` | Workflow `security.yml`, rapport dans l'onglet Security du dépôt (Code scanning, catégorie `trivy-image`). Ne bloque aucune release |

> ⚠️ **Les PRs Dependabot visent `develop`, jamais `main`** : elles n'atteignent la production qu'au prochain merge d'epic. Un correctif de sécurité urgent passe par un `hotfix/*`.

---

# 📊 Observabilité

## Stack Monitoring

| Outil | Usage | Accès |
|-------|-------|-------|
| Dokploy Logs | Logs applicatifs stdout (Pino) en temps réel | Compose `Portfolio-app` → onglet Logs |
| Dokploy Deployments | Historique des déploiements et de leurs logs | Compose `Portfolio-app` → onglet Deployments |
| UptimeRobot | Sonde HTTP sur `/api/health` toutes les 5 min, depuis l'extérieur du VPS | Alerte email à `contact@`, au changement d'état uniquement |
| Sentry | Erreurs applicatives (serveur, edge, navigateur) + tracing des routes, pages et queries Prisma. Tracing des Server Actions affecté par un bug SDK connu sous Turbopack, détail : [knowledges/sentry.md](knowledges/sentry.md) | [sentry.io](https://sentry.io), organisation `tg-ws` |

## Métriques Clés

Seuils sur ce qui est réellement observable avec la stack actuelle : sonde externe et lecture des logs. Les cibles de performance (LCP, TTFB…) n'ont pas de seuil d'alerte et vivent en § Performance.

| Métrique | Seuil Warning | Seuil Critical | Mesure |
|----------|---------------|----------------|--------|
| Disponibilité du service | < 99% sur 24h | Service down | Sonde externe sur `/api/health` |
| Taux d'erreur applicative | > 1% des events | > 5% | Filtre `"level":"error"` dans les logs |
| Échecs envoi email (SMTP) | > 2 erreurs/heure | > 10 erreurs/heure | Event `email:failed` |
| Rate limit formulaire déclenché | > 5 fois/heure | > 20 fois/heure | Event `rate_limit:exceeded` |

> ⚠️ **Ces seuils ne sont comptés par personne** : aucun outil n'agrège les logs ni ne calcule de taux. Ils se vérifient à la lecture, dans l'onglet Logs, quand on a une raison de regarder.

> ℹ️ **Sentry, seconde source pour les routes/queries tracées** : `duration_ms` sur l'event `email:sent` reste la mesure de référence de la Server Action de contact (§ Logging). Sentry ajoute une transaction par requête pour les routes, pages et queries Prisma tracées, mais pas pour la Server Action elle-même : voir [knowledges/sentry.md](knowledges/sentry.md#instrumentation-des-server-actions).

## Alertes

| Alerte | Condition | Canal |
|--------|-----------|-------|
| Site injoignable | `/api/health` ne répond pas `200` depuis l'extérieur | Sonde externe (email) |
| Échec de build | Build de déploiement en erreur | Notification Dokploy (email), option `appBuildError` |
| Container `unhealthy` | Healthcheck en échec 3 fois de suite | Aucune notification : Dokploy n'émet rien sur l'état d'un container. Détecté par la sonde externe |
| Erreur BDD répétée | `PrismaClientInitializationError` ou code `P1001` dans les logs du container | Vérification manuelle : Database `portfolio-db` → onglet Logs |
| Échec SMTP répété | > 3 events `email:failed` consécutifs | Vérification manuelle : credentials SMTP IONOS |

> ⚠️ **Une alerte émise depuis le VPS ne survit pas à la panne du VPS** : les notifications Dokploy partent de la machine surveillée, par son propre SMTP. VPS éteint, réseau coupé ou Traefik cassé, aucun mail ne part et l'incident reste invisible. C'est la raison d'être de la sonde externe : elle seule observe le service depuis l'extérieur.

> ℹ️ **Un déploiement déclenche une alerte** s'il tombe sur un contrôle : le recreate du container coupe le service le temps du démarrage (§ CI/CD & Déploiement). Un « DOWN » suivi d'un « UP » peu après, autour d'une mise en production, n'est pas un faux positif : c'est la coupure réelle, mesurée.

---

# 📝 Logging

## Format

### Structure

JSON structuré via Pino (`src/lib/logger.ts`), une ligne par événement sur stdout, capturée par Docker et lisible dans l'onglet Logs du Compose. `pino-pretty` n'est actif qu'en dev : en production, le format ci-dessous est celui qu'on lit dans Dokploy.

```json
{"level":"info","time":"2026-09-03T18:09:24.189Z","service":"thibaud-geisler-portfolio","action":"submitContact","requestId":"b4c784fb-398b-44b9-aa06-34564c598fd7","ip_hash":"7a42ebba","event":"email:sent","has_company":true,"message_length":312,"duration_ms":1180}
```

> **Champs communs à toute ligne** : `level` en label texte (jamais le code numérique Pino), `time` en ISO 8601 UTC, `service` constant, puis les bindings du child logger créé par Server Action : `action`, `requestId` (corrèle toutes les lignes d'une même soumission) et `ip_hash` (8 premiers hex du SHA-256 salé de l'IP, cf. `IP_HASH_SALT`). `event` nomme l'événement métier, préfixé par domaine.

> **Champs propres à chaque event** : `email:sent` → `has_company`, `message_length`, `duration_ms` (durée de l'appel SMTP) ; `rate_limit:exceeded` → `retryAfterSeconds` ; `calendly:event_scheduled` → `event_uri` ; `honeypot:caught` → aucun ; `email:failed` → `err` ; `calendly:url_missing` → `locale` ; `request:unhandled_error` → `err`, `path`.

> **`calendly:url_missing` est le seul event émis hors Server Action** (rendu de la page contact, quand `NEXT_PUBLIC_CALENDLY_URL_<LOCALE>` manque). Il ne porte donc ni `action`, ni `requestId`, ni `ip_hash` : inutile de chercher à le corréler à une soumission.

Un échec porte l'erreur sérialisée par Pino, et `msg` y reprend `err.message` recopié par le sérialiseur. Le seul autre event à porter un `msg` est `calendly:url_missing`, dont le message est passé explicitement à l'appel.

```json
{"level":"error","time":"2026-09-03T18:09:24.197Z","service":"thibaud-geisler-portfolio","action":"submitContact","requestId":"b4c784fb-398b-44b9-aa06-34564c598fd7","ip_hash":"7a42ebba","err":{"type":"Error","message":"connect ECONNREFUSED 10.0.0.5:587","stack":"…","code":"ECONNREFUSED"},"event":"email:failed","msg":"connect ECONNREFUSED 10.0.0.5:587"}
```

> ⚠️ **Prisma ne passe pas par Pino** : `src/lib/prisma.ts` active son propre `log: ['warn', 'error']`, qui sort en texte natif non JSON. Une erreur de connexion BDD ne se cherche donc pas avec un filtre `"level":"error"`.

## Niveaux

| Level | Usage |
|-------|-------|
| `debug` | Développement local uniquement (défaut en dev, jamais en production) |
| `info` | Événements normaux : `email:sent`, `honeypot:caught` (soumission piégée, réponse volontairement `ok`), `calendly:event_scheduled` |
| `warn` | Dégradé non bloquant : `rate_limit:exceeded`, `calendly:url_missing` (variable d'environnement manquante, la page rend un placeholder) |
| `error` | Échec bloquant : `email:failed` (SMTP injoignable ou refus), `request:unhandled_error` (exception non gérée d'un rendu serveur, captée par `onRequestError` dans `src/instrumentation.ts`) |

## Rétention

| Env | Rétention | Gestion |
|-----|-----------|---------|
| development | Terminal local, pas de rétention | - |
| production (app) | Fenêtre glissante d'environ 100 Mo | En place dans `compose.yaml` : driver `json-file`, `max-size: "20m"`, `max-file: "5"` |
| production (Database) | Environ 30 Mo | Hérité du défaut posé dans `/etc/docker/daemon.json` du VPS (`json-file`, `max-size: "10m"`, `max-file: "3"`), qui s'applique à tout container sans config explicite. Relevé du 2026-09-04 |

> ℹ️ **Dokploy ne fait pas la rotation** : son cron de nettoyage quotidien ne touche qu'à ses propres logs de déploiement, pas aux logs Docker des services. Deux mécanismes bornent le reste : le `json-file` déclaré dans `compose.yaml` pour l'app, et le défaut de `/etc/docker/daemon.json` pour tout container qui n'en déclare aucun.

> ⚠️ **Le driver `json-file` ne borne que le volume** : ses options sont `max-size`, `max-file`, `compress`, `labels`, `labels-regex`, `env`, `env-regex`, il n'a pas de `max-age`. La borne temporelle est assurée par `/etc/logrotate.d/docker-containers` sur le VPS (quotidien, 180 archives, `copytruncate`, `dateext`), déclenché par `logrotate.timer`. **Cette configuration ne vit pas dans le dépôt** : la revérifier après toute réinstallation de la machine (§ Perte VPS Totale). Finalité RGPD : [registre-traitements.md](registre-traitements.md)

## Règles Logging

### Règles

- ✅ **Un child logger par Server Action** (`createActionLogger`) : toutes les lignes d'une soumission partagent `action`, `requestId` et `ip_hash`, seul moyen de reconstituer un parcours dans un flux Dokploy
- ✅ **Logger les appels SMTP** : succès et échec, avec des métadonnées non personnelles seulement (`has_company`, `message_length`). Le destinataire est `MAIL_TO`, constant, il n'apporte rien au log
- ✅ **`err` en premier argument** (`log.error({ err, event })`) : Pino sérialise `type`, `message`, `stack` et le code d'erreur
- ✅ **Redaction active** dans la config du logger : `*.password`, `*.pass`, `*.secret`, `*.token`, `*.key`, `req.headers.authorization`, `req.headers.cookie` remplacés par `[REDACTED]`. Filet de sécurité, pas une autorisation à logger des objets sensibles

### Anti-Patterns

- ❌ **Ne jamais logger de secrets** : `SMTP_PASS`, `DATABASE_URL`, `IP_HASH_SALT`, `SENTRY_AUTH_TOKEN`, `R2_ASSETS_SECRET_ACCESS_KEY`, `R2_ADMIN_SECRET_ACCESS_KEY`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`
- ❌ **Ne jamais logger le contenu des messages de contact** ni l'identité de l'émetteur (nom, email, société), ni `ADMIN_EMAIL` (seul élément identifiant la cible d'une tentative d'accès) : données personnelles, RGPD
- ❌ **Ne jamais logger une IP en clair** : toujours le hash salé tronqué (`hashIp`). Un hash d'IP non salé se casse par force brute, l'espace IPv4 étant fini

---

# 🚨 Incident Response

## Sévérités

| Sévérité | Définition | Exemples | Response Time | Action |
|----------|------------|----------|---------------|--------|
| 🔴 P1 : Critique | Site complètement indisponible ou fuite de données | Page 500 pour tous > 5 min, secrets exposés en logs | < 30 min | Intervention immédiate, rollback si nécessaire |
| 🟡 P2 : Majeur | Fonctionnalité critique dégradée | Formulaire contact KO, pages projets inaccessibles | < 4h | Correction prioritaire dans la journée |
| 🟢 P3 : Mineur | Dégradation cosmétique ou partielle | Typo, style cassé, feature non-critique inaccessible | < 48h | Inclure dans le prochain déploiement |

## Investigation Checklist

Avant de déployer un fix, diagnostiquer la cause. Tout se fait depuis le dashboard Dokploy, projet `Portfolio` :

1. **Logs applicatifs** → Compose `Portfolio-app` → onglet Logs → filtrer `"level":"error"` → lire autour du timestamp de l'incident
2. **État du service** → même écran : le Compose est-il up, a-t-il redémarré ? Un container qui crash-loop se voit dans les logs de démarrage
3. **Base de données** → Database `portfolio-db` → onglet Logs : Postgres et les erreurs Prisma d'initialisation y sortent en texte natif, pas en JSON Pino
4. **Dernier déploiement** → Compose `Portfolio-app` → onglet Deployments : quel tag a précédé l'incident ?
5. **Rollback** si la cause est la dernière version déployée → voir § Déploiement, Rollback

> ℹ️ **En SSH sur le VPS**, ne jamais écrire un nom de container en dur : le Compose suffixe ses services (`-nextjs-1`) et la Database Dokploy tourne en Swarm avec un identifiant de tâche qui change à chaque redémarrage. Résoudre par nom partiel : `docker ps -qf name=portfolio-`. Détail du fonctionnement Dokploy : [knowledges/dokploy.md](knowledges/dokploy.md).

## Contacts

| Rôle | Nom | Canal | Disponibilité |
|------|-----|-------|---------------|
| Owner & On-call | Thibaud Geisler | Email IONOS | P1 : immédiat, P2/P3 : heures ouvrées |

## Post-mortem Template

```markdown
## Incident: <titre>
**Date**: <date>
**Durée**: <durée>
**Sévérité**: <P1 | P2 | P3>

### Timeline
- HH:MM - Détection de l'incident
- HH:MM - Début de l'investigation
- HH:MM - Identification de la root cause
- HH:MM - Déploiement du fix
- HH:MM - Résolution confirmée

### Root Cause
<Description technique précise de la cause racine>

### Impact
<Pages/fonctionnalités impactées, durée, visiteurs potentiellement affectés>

### Actions
- [ ] <Action corrective immédiate>
- [ ] <Action préventive à long terme>
- [ ] <Amélioration du monitoring/alerting si applicable>
```

---

# 💾 Backup & Recovery

## Stratégie Backup

**En place**, mécanisme natif Dokploy (`pg_dump` puis transfert rclone), sans script ni cron sur le VPS, destination `r2 portfolio-backups` (nom relevé dans Dokploy le 2026-09-21). Une restauration d'essai a été réalisée et validée le 2026-09-20, et Healthchecks surveille le silence : une sauvegarde qui ne se signale pas déclenche une alerte. Marche à suivre pour recréer la configuration : [knowledges/dokploy.md](knowledges/dokploy.md).

| Ressource | Mécanisme | Fréquence | Rétention | Localisation |
|-----------|-----------|-----------|-----------|--------------|
| PostgreSQL | Backup natif Dokploy (Database → Backups) | Quotidien, à minuit (`0 0 * * *`) | 30 sauvegardes (`Keep the latest`) | Cloudflare R2, bucket `portfolio-backups` (juridiction `eu`) |

> ⚠️ **`Keep the latest` compte des sauvegardes, pas des jours.** Avec une planification quotidienne, 30 donne trente jours de profondeur ; changer la fréquence change la fenêtre réelle sans toucher au champ. Champ vide = tout est conservé.

> **Les buckets d'assets ne sont pas sauvegardés, par choix** : chaque bucket de production a son pendant de développement et les fichiers source sont conservés hors du dépôt. R2 n'ayant ni versioning ni corbeille (`knowledges/cloudflare-r2.md`), une suppression dans un bucket reste définitive.

## Recovery

| Scénario | RTO | RPO | Procédure |
|----------|-----|-----|-----------|
| Corruption BDD / suppression accidentelle | < 2h | < 24h | Voir procédure ci-dessous |
| Perte du VPS (crash total) | < 4h | < 24h | Voir procédure ci-dessous |
| Déploiement cassé (app ne démarre plus) | < 30 min | N/A | Redéployer le dernier tag sain, voir § CI/CD & Déploiement > Rollback |

> **RTO** = Recovery Time Objective (temps max pour restaurer le service)
> **RPO** = Recovery Point Objective (perte de données max acceptable)

### Procédure : Restauration BDD

1. Suspendre les écritures le temps de la restauration, en SSH : `docker pause $(docker ps -qf name=nextjs)`
2. **Vérifier d'abord sur une base jetable** : `pg_restore` n'écrase pas la base cible, il exige qu'elle existe déjà. Créer une base de contrôle (`CREATE DATABASE`), restaurer dessus, comparer un comptage de référence, avant de toucher à `portfolio-db`
3. Database `portfolio-db` → onglet Backups → choisir la sauvegarde, **vérifier son horodatage**, lancer la restauration (détail du mécanisme : [knowledges/dokploy.md](knowledges/dokploy.md))
4. Relancer l'app : `docker unpause $(docker ps -qf name=nextjs)`
5. Smoke test : accueil, `/projets`, formulaire de contact

> ⚠️ Tout ce qui a été écrit après la dernière sauvegarde est perdu, c'est le sens du RPO de 24 h. Lire l'horodatage avant de restaurer, et si la perte est inacceptable, chercher d'abord si les données récentes sont récupérables autrement.

### Procédure : Remplir la base depuis un dump de dev

> Exécutée en production le 2026-09-25 (11 projets, 6 entreprises, 47 tags), après répétition sur une base locale à l'état de la prod.

1. Seulement après le déploiement dont les migrations ont créé le schéma du dump : `just db-dump` ne produit que des données, schéma `auth` exclu
2. Copier le dump sur le VPS (`scp`), puis dans le container de la base : `sudo docker cp <dump> $(sudo docker ps --format '{{.Names}}' | grep portfolio-db):/tmp/content.dump`, et supprimer la copie de l'hôte
3. Vider les tables de contenu et charger le dump dans une seule transaction, `_prisma_migrations` exclue :
   ```bash
   sudo docker exec $(sudo docker ps --format '{{.Names}}' | grep portfolio-db) sh -c '
   pg_restore -l /tmp/content.dump | grep -v _prisma_migrations > /tmp/content.list
   { echo "BEGIN; TRUNCATE public.\"ProjectTag\", public.\"ClientMeta\", public.\"Project\", public.\"Tag\", freelance.\"Company\", public.\"Publisher\", public.\"DataProcessing\", public.\"LegalEntity\", public.\"Address\";"
     pg_restore --data-only --disable-triggers -L /tmp/content.list -f - /tmp/content.dump
     echo "COMMIT;"; } | psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q -v ON_ERROR_STOP=1 && rm -f /tmp/content.*'
   ```
4. Redeploy du Compose : le cache `'use cache'` vit en mémoire, et un chargement SQL ne le revalide pas
5. Smoke test : accueil, `/projets`, une page projet

> ⚠️ Un échec annule toute la transaction, les tables restent intactes. `--disable-triggers` exige un superuser, ce qu'est l'utilisateur de `portfolio-db` (relevé du 2026-09-25).

### Procédure : Perte VPS Totale

1. Créer un nouveau VPS IONOS avec la même spec, installer Dokploy (procédure : [knowledges/dokploy.md](knowledges/dokploy.md) ; choix de la plateforme : [ADR-005](adrs/005-hebergement-dokploy-vs-vercel.md))
2. Recréer le projet `Portfolio` : la Database Postgres, puis le Compose `Portfolio-app` (provider GitHub, branche `main`, `compose.yaml`, Trigger Type `tag`), enfin les domaines et leurs certificats
3. Reposer les variables d'environnement du Compose (§ Environnements), dont `DATABASE_URL` pointant la nouvelle Database
4. **Recréer la Backup Destination** (`r2 portfolio-backups`) et la sauvegarde planifiée sur la nouvelle Database : les tokens R2 survivent à la perte du VPS, la destination Dokploy non
5. Générer un token API Dokploy, relever le `composeId` du Compose, mettre à jour les secrets GitHub `DOKPLOY_URL`, `DOKPLOY_TOKEN` et `DOKPLOY_COMPOSE_ID` : sans eux, `deploy.yml` ne peut plus déclencher de redéploiement
6. `gh workflow run deploy.yml --ref v<dernier tag>` : rebuild, push GHCR et redeploy, les migrations Prisma se jouent au démarrage du container
7. Restaurer la BDD depuis le dernier backup (voir procédure ci-dessus). Les buckets R2 ne vivent pas sur le VPS : rien à restaurer côté assets
8. Reposer `/etc/logrotate.d/docker-containers`, le défaut de log dans `/etc/docker/daemon.json` (§ Rétention) et la configuration Traefik du VPS, middlewares `security-headers`, `rate-limit`, `rate-limit-strict`, `redirect-www-to-apex`, `compress-br` et options TLS (§ Sécurité & Configuration) : aucun fichier du dépôt ne les porte
9. Smoke test complet

---

# ⚡ Performance

## Benchmarks

| Page/Feature | Target | Current |
|--------------|--------|---------|
| LCP `/fr` mobile | < 2,5 s | **4,4 à 4,9 s** sur 2 runs PSI (2026-09-25), contre 3,3 à 3,9 s le 5 septembre. Seul indicateur nettement hors cible |
| LCP `/fr/projets` mobile | < 2,5 s | **4,7 s** (PSI, 2026-09-25), **2,3 s** sur `/en/projets` le même jour : écart de run, pas de langue |
| LCP pages publiques desktop | < 2,5 s | **0,5 à 0,9 s** sur les 4 pages × 2 locales (PSI, 2026-09-25), scores 88 à 100 |
| CLS pages publiques | < 0,1 | **0,025 à 0,051 sur `/fr`, 0,023 sur `/en`, 0 ailleurs** (PSI, 2026-09-25) |
| TBT (proxy INP en lab) | < 200 ms | **110 à 360 ms** en mobile, 40 à 280 ms en desktop (PSI, 2026-09-25) |
| Score performance mobile | — | `/fr` **72 et 75** sur 2 runs, 71 à 97 ailleurs (PSI, 2026-09-25). Contre une médiane de 86 sur `/fr` le 5 septembre |
| TTFB pages publiques | < 200 ms | **0,13 à 0,19 s** (2026-09-05, 3 runs × 4 pages), Kaspersky désactivé : `curl -o /dev/null -s -w "%{time_starttransfer}\n" https://thibaud-geisler.com/fr` (URL localisée, la racine ne renvoie qu'une redirection) |
| Envoi du formulaire de contact | < 3 s | `duration_ms` de l'event `email:sent` |

> Colonne `Current` : dernière baseline en date, [baselines/](baselines/). Données de laboratoire, à ne pas confondre avec du terrain : le champ CrUX de PSI affiche toujours « Aucune donnée », faute de trafic suffisant. Reprendre une mesure après chaque optimisation significative et déposer un nouveau fichier de baseline plutôt que d'écraser celui-ci.

> ⚠️ **Suspendre Kaspersky avant toute mesure, `curl` compris** : il s'interpose sur le TLS et gonfle le TTFB d'un facteur 3 à 5 (0,55-0,75 s actif contre 0,13-0,19 s désactivé, 2026-09-05). Il supprime aussi l'entrée LCP en émulation mobile. Seul PSI y échappe.

> ⚠️ **Ne pas relever le TBT en pilotage CDP** : l'observer `longtask` sous CPU ×4 compte sa propre instrumentation et surestime d'un facteur 5 (295-444 ms contre 60-70 ms chez PSI, même build).

> ℹ️ **Sentry ne remplace pas `duration_ms`** sur l'envoi du formulaire de contact : c'est une seconde source pour les routes/queries tracées, pas pour la Server Action elle-même (§ Observabilité › Stack Monitoring, [knowledges/sentry.md](knowledges/sentry.md#instrumentation-des-server-actions)).

## Optimisations

- [x] Taille des bundles JS surveillée (`@next/bundle-analyzer`) : le chunk d'icônes de 2,1 Mo gzip a été éliminé en passant d'un import global à un registre de named imports
- [x] Baseline LCP/CLS/TBT prise sur les pages clés × 2 locales. L'INP n'est pas mesurable ici : il demande du terrain, et CrUX reste vide
- [x] `preload` posé sur les images LCP above-the-fold (cf. [.claude/rules/nextjs/images-fonts.md](../.claude/rules/nextjs/images-fonts.md) : `priority` est déprécié depuis Next 16, renommé `preload`)
- [x] **CLS desktop** : corrigé et confirmé en prod le 2026-09-04 (`v1.6.1`, Lighthouse 13.4.1). Cause : la coquille PPR ne contenait que la navbar et le footer, que `mt-auto` collait en bas de fenêtre ; l'arrivée du contenu streamé le repoussait de plus de 2000 px. Corrigé en réservant la hauteur du contenu dans le layout racine. **`0,288 → 0,012` en prod** (score perf desktop 74 → 89), cohérent avec le build local (`0,29 → 0,012`). Une première mesure juste après le déploiement avait rendu 0,288 : coïncidence avec la fenêtre où Traefik route déjà vers le nouveau container avant sa pleine disponibilité (§ CI/CD), écartée par une seconde mesure stable
- [x] Fallback de police calibré : `Sansation` passée en `next/font/local`, le build produit `size-adjust: 102.05%` là où aucune `@font-face` de secours n'était générée. Sans effet mesuré sur le CLS. Mécanisme et garde-fou : [.claude/rules/nextjs/images-fonts.md](../.claude/rules/nextjs/images-fonts.md)
- [x] **Polices en woff2, un fichier par famille** (`v1.6.3`) : `Sansation-Bold` 45 → 16 Ko, `Geist-Regular` 126 → 45 Ko, servis au navigateur comme à satori. Les `.ttf` ont été supprimés. Gain réseau de 8 Ko sur le chemin critique du LCP
- [x] Bandeau de consentement sorti du chemin critique : provider depuis `@c15t/nextjs/headless`, surfaces UI en `next/dynamic` (`ssr: false`) via `src/components/cookies/consent-ui.tsx`, qui porte aussi leur CSS. Les importer du même point d'entrée que le provider aurait laissé l'UI dans le chunk synchrone, et laisser l'`import` CSS dans `providers.tsx` gardait 71 Ko de feuille bloquant le premier rendu : un import CSS ne se conditionne pas. Gain non distinguable du bruit en mesure locale, 11,5 Ko de moins en bloquant
- [x] **Baseline Core Web Vitals reprise** le 2026-09-05, 5 pages × 2 locales × mobile/desktop ([baselines/cwv-2026-09-05.md](baselines/cwv-2026-09-05.md)) plus PSI sur `/fr` et `/fr/projets`, mobile et desktop. **L'élément LCP est le `H1`**, donc un texte : ni les images ni le JS ne sont en cause
- [x] **Brotli servi** depuis le 2026-09-05 : middleware Traefik `compress-br` sur l'apex + `compress: false` côté Next. Vérifié en prod sur le HTML, le CSS et le JS, HTML 68,3 → 39,7 Ko (-41 %), page complète 656 → 560 Ko ([knowledges/dokploy.md](knowledges/dokploy.md#compression-brotli-via-traefik))
- [x] **`will-change` et `motion` inutiles retirés** (`v1.6.4`) : `will-change: transform` maintenait 216 couches de composition sur les cellules du hero, et `motion` était importé dans `HyperText` sans y animer quoi que ce soit. Aucun changement visuel
- [ ] **Sortir Zod du bundle public** : `src/instrumentation-client.ts` lit le DSN Sentry via `src/env.ts`, ce qui charge Zod sur toutes les pages publiques. 60 Kio de JS inutilisé, et le test `new Function` de Zod, refusé par la CSP, fait tomber les bonnes pratiques à 96 ([baselines/cwv-2026-09-25.md](baselines/cwv-2026-09-25.md))
- [ ] **LCP mobile de l'accueil**, 4,4 à 4,9 s sur 2 runs le 2026-09-25, après l'arrivée de Sentry et de Zod côté navigateur. Relevé du 2026-09-05 : **3,3 à 3,9 s sur 6 runs** (médiane 3,5 s), contre 3,9 s avant Brotli et 2,5 s visés. Seul indicateur nettement hors cible, `/fr/projets` étant à 3,0 s et le desktop à 1,0 s. La répartition du LCP donne 40 ms de TTFB contre **2 310 ms de délai d'affichage** du `H1`. Les requêtes bloquant le rendu restent chiffrées à 560-590 ms en mobile et 120 ms en desktop : Brotli les a allégées sans les supprimer. La cause est le thread principal (2,4 s de travail, 4 tâches longues), avec 700 ms pour l'hydratation `react-dom` et 359 ms pour `motion`. Les 216 cellules de `BackgroundRippleEffect`, que PSI désigne dans « Optimiser la taille du DOM » (216 enfants sur 888 éléments, seuil Lighthouse à 60), ne pèsent que 55 ms : mesuré, puis écarté (cf. baseline). Restent ensuite 41 Kio de JS inutilisé et les 35 Ko de `motion` sur l'accueil

> La revalidation type ISR est en place : `cacheComponents: true` + `'use cache'` + `cacheLife` sur les queries, avec 4 tags (`projects`, `tags`, `legal-entity`, `legal-content`). Les actions de l'espace admin invalident `projects` et `tags` par `updateTag`. Une écriture faite hors de l'app, chargement SQL compris, n'invalide rien : le cache vit en mémoire, un Redeploy le vide.

---

# 🔗 Ressources

## Documentation Officielle

- [Dokploy](https://docs.dokploy.com/docs/core)
- [Docker Compose](https://docs.docker.com/compose/)
- [Next.js Deployment](https://nextjs.org/docs/app/getting-started/deploying)
- [Prisma Migrate Deploy](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-deploy)
- [Pino](https://getpino.io)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)

## Ressources Complémentaires

- [The Twelve-Factor App](https://12factor.net/)
- [SRE Book](https://sre.google/sre-book/table-of-contents/)
