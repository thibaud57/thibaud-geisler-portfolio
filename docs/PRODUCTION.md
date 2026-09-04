---
title: "PRODUCTION — Thibaud Geisler Portfolio"
description: "Documentation opérationnelle : release strategy, déploiement, monitoring, incidents et backup pour thibaud-geisler.com."
date: "2026-09-03"
keywords: ["production", "deployment", "monitoring", "incidents", "release", "dokploy", "docker"]
scope: ["docs", "ops"]
technologies: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Docker", "Dokploy", "Pino"]
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

> ℹ️ Le job `quality` est **sauté** sur un diff purement documentaire et sur les branches `release-please--*` : une PR de release affichée « verte » n'a donc rien exécuté, c'est normal.

**Manuel :**
Dans l'ordre où ils s'exécutent, le tag étant ce qui déclenche le déploiement :

- [ ] Variables d'environnement à jour dans Dokploy
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
  - `Schedules` : tâches ponctuelles, dont `manual-seed`

## Variables d'Environnement

> **Validation runtime** : toutes les vars typées et validées au boot via `src/env.ts` (`@t3-oss/env-nextjs` + Zod). Server vs client séparés. Fail-fast si une var requise manque (`DATABASE_URL`, `SMTP_*`, `MAIL_TO`, `IP_HASH_SALT` côté server, `NEXT_PUBLIC_SITE_URL` côté client). Bypass par `SKIP_ENV_VALIDATION` pour le build CI/Docker et les tests Vitest — **toute valeur non vide suffit**, la variable n'est pas comparée à `true`. **Exception** : `ASSETS_PATH` reste sur `process.env` direct (rule `nextjs/assets.md` impose une lecture dynamique avec fallback `./assets`, pour que le dev fonctionne sans fichier d'environnement).

> **Deux variables ne se configurent pas** : `NEXT_PUBLIC_BUILD_YEAR` est injectée au build par `next.config.ts`, et le `DATABASE_URL` passé en build-arg par `deploy.yml` pointe la Postgres CI éphémère, pas la base de production — le prerender des pages publiques a besoin d'une base joignable au build (§ Déploiement).

### Variables Communes

```bash
# Application
NODE_ENV=                           # development | production
NEXT_PUBLIC_SITE_URL=               # URL canonique du site (requis : metadata, sitemap, JSON-LD, OG)
                                    # Dev local : http://localhost:3000 | Prod : https://thibaud-geisler.com
                                    # ⚠️ Inlinée dans le bundle JS au build → propagée via build args du workflow GHA `deploy.yml` (input `vars.NEXT_PUBLIC_SITE_URL` GitHub Repository Variables)
LOG_LEVEL=                          # Optionnel — niveau de log Pino (fatal|error|warn|info|debug|trace|silent). Défaut : debug en dev, info en prod

# Assets (fichiers servis via /api/assets/[...path], sous-dossiers projets/{client,personal}/<slug>/)
ASSETS_PATH=                        # Dev local : ./assets | Prod Docker : /app/assets

# Calendly (widget inline /contact, exposé au navigateur — une URL par locale, event types FR/EN distincts)
# ⚠️ Inlinées dans le bundle JS au build → propagées via build args du workflow GHA `deploy.yml` (inputs `vars.NEXT_PUBLIC_CALENDLY_URL_FR/EN` GitHub Repository Variables)
NEXT_PUBLIC_CALENDLY_URL_FR=        # URL Calendly FR (ex: https://calendly.com/<slug>/<event-type-fr>)
NEXT_PUBLIC_CALENDLY_URL_EN=        # URL Calendly EN (ex: https://calendly.com/<slug>/<event-type-en>)
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
```

> Liste exhaustive : ce sont exactement les variables posées dans l'Environment du Compose (relevé du 2026-09-03).

### Règles

- ✅ **Les secrets vivent dans l'Environment du Compose Dokploy**, jamais dans le dépôt
- ✅ **Toute variable ajoutée est documentée ici** et déclarée dans `src/env.ts`, sinon elle échoue au boot
- ✅ **`NEXT_PUBLIC_` uniquement pour ce qui est exposé au navigateur**, et à passer en build-arg dans `deploy.yml` puisque la valeur est inlinée au build

### Anti-Patterns

- ❌ **Ne pas mettre `DATABASE_URL` avec host `localhost`** en production : le host est le `appName` Dokploy de la Database, résolu par le DNS interne du réseau Dokploy
- ❌ **Ne pas préfixer `NEXT_PUBLIC_` un secret** : la valeur part dans le bundle JS servi au navigateur et devient publique et irrévocable, une rotation est alors la seule issue

---

# 🔄 CI/CD & Déploiement

## Pipelines

| Trigger | Étapes | Cible |
|---------|--------|-------|
| Push sur `main`, PR vers `main` ou `develop` | lint, typecheck, tests, build, `pnpm audit` (workflow `ci.yml`) | - |
| Merge sur `main` | release-please ouvre/maj la PR de release (CHANGELOG + bump) | - |
| Merge de la PR release-please | tag `vX.Y.Z` créé par la GitHub App de release | - |
| Push tag `v*` | build Docker + push GHCR + trigger Dokploy redeploy (workflow `deploy.yml`) | Production |

> GitHub Actions porte désormais l'intégralité du build Docker : Dokploy ne build plus, il pull GHCR. Le déploiement est strictement piloté par les tags release-please, jamais par un merge direct sur `main`.

## Étapes de Déploiement (Automatiques)

**Côté GHA (`deploy.yml`)** : tag `v*` push → Postgres CI éphémère + migrate + seed → build Docker (`driver-opts: network=host` pour atteindre la Postgres CI) → push GHCR (`latest` + `X.Y.Z` + `X.Y` + `sha-XXX`) → curl POST `api/compose.redeploy` Dokploy avec retry 3×.

**Côté Dokploy** : `docker compose pull` (image GHCR) → `docker compose up -d` (recreate container) → CMD `prisma migrate deploy && node server.js`.

> ⚠️ **Le déploiement coupe brièvement le service** : un Compose recrée le container, il n'y a pas de rolling update. Traefik route vers le nouveau container dès qu'il écoute, sans attendre que l'app soit prête. Le temps du `prisma migrate deploy` puis du démarrage Next, les requêtes échouent. Une migration lourde (`ALTER TABLE` sur table volumineuse) allonge d'autant la coupure : dans ce cas, l'appliquer manuellement avant le déploiement.

> ℹ️ **Healthcheck** : `compose.yaml` interroge `/api/health` toutes les 30 s (`start_period` de 60 s pour couvrir les migrations). Il ne conditionne aucune bascule de trafic, il rend l'état du container observable — `docker ps` le montre `unhealthy`, et c'est ce que sonde le monitoring externe (§ Observabilité).

> ⚠️ **`/api/health` est un contrôle de vie, pas de disponibilité** : la route retourne `{ status: 'ok' }` sans interroger la base. Postgres injoignable pendant que le process Node tient, et le container reste `healthy`, la sonde externe ne voit rien. Une panne BDD se détecte donc dans les logs (§ Incident Response), jamais par le healthcheck. L'y ajouter un `SELECT 1` reviendrait à faire redémarrer l'app à chaque hoquet réseau de la base : c'est un arbitrage, pas un oubli.

> ℹ️ **Provider Dokploy** : Provider `GitHub` fonctionne en pull-only tant que `compose.yaml` n'a que `image:` sans `build:`. Si tu rajoutes un `build:`, Dokploy reconstruira localement et échouera (BuildKit sandbox + Postgres inaccessible).

## Rollback

**Déclencheur** : déploiement cassé, app ne démarre plus, régression critique détectée.

> ⚠️ **Pas de retour arrière par l'historique Dokploy** : `compose.yaml` référence l'image en `:latest` avec `pull_policy: always`. Un « Redeploy » sur un déploiement passé re-pull la **dernière** image publiée, pas celle de l'époque, et Dokploy ne conserve pas d'historique d'images pour un service Compose. Le seul retour arrière réel passe par un redéploiement du tag visé.

**Procédure** :
1. Identifier le dernier tag sain (`gh release list`, ou [CHANGELOG.md](../CHANGELOG.md))
2. `gh workflow run deploy.yml --ref vX.Y.Z` : `deploy.yml` rebuild depuis ce tag, republie `latest` sur cette version et déclenche le redeploy Dokploy (~3-8 min)
3. Vérifier le statut dans Dokploy → Compose `Portfolio-app` → onglet Deployments, puis smoke test
4. Corriger la cause sur `hotfix/*` → `main` → nouveau tag : le retour arrière est un roll-*forward* vers un `PATCH` supérieur, jamais une suppression du tag fautif

> ⚠️ **Dispatcher sur le ref du tag, jamais sur `main`** : `docker/metadata-action` lit `type=semver` depuis `github.ref`. Sur `main`, il ne produit que `latest` et `sha-XXX`, sans les tags `X.Y.Z` et `X.Y`.

> ℹ️ **« Redeploy » dans Dokploy** relance la **même** image : utile si le pull a échoué ou si le container est KO, sans effet sur la version déployée. C'est aussi le geste de reprise quand le `curl` de `deploy.yml` a échoué alors que l'image est bien sur GHCR.

> ⚠️ **Attention BDD** : le rollback du code ne défait pas les migrations Prisma déjà appliquées. Si la migration contenait un changement destructeur (`DROP COLUMN`, etc.), restaurer la BDD depuis le dernier backup (voir § Backup & Recovery) avant ou après le rollback.

## Checklist Pré-MEP

Items validés avant le tout premier merge `develop → main`, celui qui a déclenché le premier déploiement et ouvert le régime `1.x` (mai 2026). Conservés comme trace de ce qui a été vérifié une fois pour toutes ; les vérifications récurrentes vivent dans la Checklist Release.

### Bootstrap technique

- [x] **Dockerfile `output: 'standalone'`** : activé dans `next.config.ts`, le stage `runner` copie `.next/standalone`, `.next/static` et `public/`. Réduit l'image Docker de ~1.2 GB à ~250 MB.
- [x] **Build Docker en Turbopack** : l'opt-out `next build --webpack`, posé pour une erreur de résolution WASM de Prisma 7 (`query_compiler_fast_bg.postgresql.mjs`), a été **retiré le 3 septembre 2026**, l'erreur n'étant plus reproductible — build de l'image et runtime du conteneur vérifiés contre une base réelle. Dev, CI et image de production partagent désormais le même bundler. À revalider par un build d'image à chaque montée de Next ou de Prisma. Versions et détail : [VERSIONS.md § Prisma ORM](VERSIONS.md).
- [x] **Migrations auto au startup container** : stage `deploy-prisma` (pnpm deploy --legacy --prod) + CMD `node node_modules/prisma/build/index.js migrate deploy && node server.js`. `prisma migrate deploy` s'exécute atomiquement au démarrage de chaque container.
- [x] **Favicon & icônes app** : favicon custom installé dans `src/app/` (convention Next.js App Router) : `favicon.ico` (legacy), `icon.svg` (vectoriel moderne), `apple-icon.png` (180x180 iOS). Next.js génère automatiquement les `<link rel="icon">` correspondants.

> Items techniques et assets de bootstrap, implémentés et validés empiriquement. Pas d'ADR : pas de décision architecturale structurelle, juste des optimisations, workarounds Docker/Next.js et assets de branding.

> **Port 5432 et overrides dev** : l'exposition du port Postgres et les autres overrides dev-specific (bind-mount assets, override `DATABASE_URL`) sont isolés dans `compose.override.yaml`, auto-chargé en local et ignoré par Dokploy. Rien à désactiver manuellement avant un déploiement, et le port `5432` n'est pas joignable depuis l'extérieur en production (vérifié le 2026-09-03) : l'y voir ouvert un jour serait une anomalie.

### Revue globale de l'app

- [x] **`/simplify`** : passe qualité sur toute la branche
- [x] **`/code-review`** + **`Agent(code-reviewer)`** : correctness et conventions du projet
- [x] **Appliquer les findings retenus** : écartés justifiés en commentaire de PR
- [x] **`/security-review`** : passé le 2026-09-04 sur l'état gelé de `develop` (contenu strictement identique à `main`, tag `v1.6.0`). Périmètre porté à l'application entière, le diff de branche étant vide. **Aucune vulnérabilité exploitable.** Path traversal, injection d'en-têtes SMTP, SQLi, XSS, fuite de secrets, `'use cache'` lisant `headers()`/`cookies()` : tous vérifiés et sains. Seule dette ouverte, non exploitable en single-user faute de chemin d'écriture non-trusté : trois `href` alimentés par la BDD sans allowlist de scheme (`project.demoUrl`, `project.githubUrl`, `company.websiteUrl`) — **à corriger avant le premier formulaire d'édition de l'espace admin**, où ils deviendraient un XSS stocké

> Points de vigilance connus, sans que la revue s'y limite : Server Actions, upload d'assets, surface Prisma exposée.

### Conformité légale & RGPD

- [x] **Pages légales `/mentions-legales` + `/confidentialite`** : publiées (RGPD art. 13/14, base légale intérêt légitime pour le formulaire de contact)
- [x] **Bandeau de consentement cookies** : actif (bandeau c15t, qui conditionne le montage du widget Calendly)
- [x] **Registre des traitements (RGPD art. 30)** : [registre-traitements.md](registre-traitements.md) créé, recense les traitements de données personnelles (formulaire de contact, logs serveur, Calendly)

### Cohérence documentaire

- [x] **BRAINSTORM.md** : audité (verdict OK pour MEP — écarts mineurs doc-only, deps non listées, à compléter post-MEP)
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
- [x] **Smoke test du livrable** : construire l'image localement (`docker build`, en passant les build-args `NEXT_PUBLIC_*` et un `DATABASE_URL` joignable), puis `just docker-up` et une requête sur `localhost:3000/api/health`. Le prerender exige une base accessible **au build**, c'est ce que reproduit la Postgres éphémère de `deploy.yml` (§ Déploiement) : un build sans base n'est pas représentatif. Pattern de data-fetching : [ARCHITECTURE.md § Patterns Utilisés](ARCHITECTURE.md#patterns-utilisés).

## Checklist Post-MEP

Items effectués une fois, après le premier déploiement validé : ils exigeaient pour la plupart que le site soit accessible publiquement. Comme la Pré-MEP, cette liste est une trace, pas une procédure à rejouer — sauf le seed, qui reste un geste de reprise.

- [x] **Seed BDD initial** : Dokploy → Compose `Portfolio-app` → Schedules → `manual-seed` → **Run manually**. Le Schedule lance `prisma db seed` dans le service `nextjs`. Prisma 7 = seed explicite (jamais auto), idempotent via `upsert`, donc rejouable à volonté tant que le contenu vient du dépôt.
- [x] **Upload assets initial** : copier le contenu local de `assets/` vers le volume Docker des assets (monté sur `/app/assets` du service nextjs) une fois après le 1er déploiement. Sans ça, toutes les images projets et documents retournent 404 via `/api/assets/[...path]` (ADR-011 : assets gitignorés, persistance par volume).
- [x] **Search Console + Bing Webmaster** : vérifier propriété (DNS TXT) + soumettre `sitemap.xml`
- [x] **Validation rich results JSON-LD** : [Google Rich Results Test](https://search.google.com/test/rich-results) sur `/a-propos` (Profile page) et pages internes (Breadcrumbs), FR + EN, 0 erreur
- [x] **Accessibilité `/llms.txt`** : `curl` sur l'URL prod retourne le markdown attendu
- [x] **Baseline Core Web Vitals** : [PageSpeed Insights](https://pagespeed.web.dev/) sur 4 pages clés × 2 locales, noter LCP/INP/CLS comme baseline (cf. [baselines/](baselines/))

> ⚠️ **Le Schedule `manual-seed` ne doit jamais se déclencher tout seul** : son expression cron est volontairement posée sur une date qui n'existe pas (`0 0 30 2 *`), le seul lancement possible est « Run manually ». Un seed automatique écraserait par `upsert` tout contenu modifié depuis l'espace admin. Le Schedule disparaîtra le jour où le CRUD admin deviendra la source du contenu ; d'ici là, il reste la voie de re-seed après une restauration.

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
| Dokploy | `0.30.4` | `0.30.4` | 2026-09-03 |
| Cloudflare R2 | managed service | — | sans objet |

> **Comment relever** : `docker version --format '{{.Server.Version}}'` et `docker compose version --short` en SSH sur le VPS ; la version de Dokploy s'affiche dans son UI, et son API la renvoie sur `settings.getDokployVersion`. Refaire ce relevé avant toute montée, c'est la seule chose qui signale que ce tableau a périmé.

**Pièges de montée**, à lire avant d'y toucher :

- **Dokploy** : depuis la v0.26 les rollbacks sont registry-based, ce qui rend GHCR indispensable à la fonctionnalité — sans objet ici tant que `compose.yaml` pointe `:latest` (cf. § Rollback). L'auto-update par l'UI est parfois défaillant, préférer le script d'update officiel. Le Traefik interne n'est **pas** monté automatiquement avec Dokploy.
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
| `RELEASE_APP_CLIENT_ID` (Variable) + `RELEASE_APP_PRIVATE_KEY` (Secret) | GitHub : Repository Variables et Secrets | Workflow `release-please.yml` via `actions/create-github-app-token@v3`. L'App `thibaud-geisler-portfolio` porte Contents / Issues / Pull requests en read-write et Metadata en read, bornées au seul dépôt. Le token d'installation est frappé à chaque run, valable 1 h, révoqué dans le step `post` du job. Indispensable pour que le push de tag déclenche `deploy.yml` : les événements émis par le `GITHUB_TOKEN` intégré ne déclenchent aucun workflow |

> ⚠️ **Le cache BuildKit conserve l'environnement du stage `builder`** : `deploy.yml` exporte les layers en `cache-to: type=gha,mode=max`, et ce stage porte `ARG DATABASE_URL`. L'image publiée sur GHCR est propre — le stage `runner` repart de `FROM base` et ne copie que des fichiers — mais la valeur vit dans le cache Actions du dépôt. Sans conséquence aujourd'hui, ce build-arg pointant la Postgres CI éphémère (§ Déploiement). Le jour où il désignerait autre chose qu'une base jetable, ce cache devient une fuite.

> **Lecture des secrets dans le code** : toujours via `env` (`src/env.ts`, `@t3-oss/env-nextjs`), jamais `process.env` — la validation Zod au boot est ce qui garantit le fail-fast et le typage. Unique exception : `prisma.config.ts`, exécuté par la CLI Prisma hors du runtime Next, qui lit `process.env.DATABASE_URL`. Détail de la convention : [.claude/rules/zod/validation.md](../.claude/rules/zod/validation.md).

### Rotation

| Secret | Fréquence | Procédure |
|--------|-----------|-----------|
| `SMTP_PASS` | En cas de compromission ou changement de mot de passe IONOS | Mettre à jour dans Dokploy → redéploiement automatique |
| `DATABASE_URL` (mot de passe) | En cas de compromission | Régénérer le password sur la Database `portfolio-db` → **recopier la nouvelle URL** dans l'Environment du Compose → Redeploy. Rien ne propage automatiquement : Database et Compose sont deux services distincts, l'URL y est un littéral. Sans la recopie, l'app redémarre avec l'ancienne et ne se connecte plus |
| `IP_HASH_SALT` | En cas de compromission | Régénérer (`openssl rand -hex 32`) → Dokploy → les nouveaux logs utilisent le nouveau sel, les hashs déjà écrits restent inchangés |
| Clé privée de la GitHub App de release | **Aucune expiration, donc aucune échéance à surveiller.** Rotation sur compromission uniquement | Settings → Developer settings → GitHub Apps → `thibaud-geisler-portfolio` → General → Private keys → Generate a private key, puis remplacer le secret repo par le contenu intégral du `.pem` (lignes `BEGIN`/`END` incluses). Supprimer l'ancienne clé dans l'App et le `.pem` du disque |
| `DOKPLOY_TOKEN` | En cas de compromission | Régénérer dans Dokploy UI (Settings → API tokens) → mettre à jour le secret repo GitHub |

## Security Headers

Configurés dans `next.config.ts` (`poweredByHeader: false` activé, retire `X-Powered-By: Next.js`).

| Header | Valeur | Rôle |
|--------|--------|------|
| `X-Frame-Options` | `DENY` | Protection clickjacking |
| `X-Content-Type-Options` | `nosniff` | Empêche le MIME sniffing |
| `X-XSS-Protection` | `0` | Désactivé, CSP prend le relais (le filtre natif peut introduire des failles) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limite la fuite d'URL vers les sites externes |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Désactive les APIs navigateur inutilisées |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Force HTTPS sur 2 ans |
| `Content-Security-Policy` | Politique complète ci-dessous | Whitelist des origines autorisées, protection XSS |

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: https:; frame-src https://calendly.com https://*.calendly.com;
connect-src 'self' https://*.calendly.com; font-src 'self' data:; frame-ancestors 'none';
base-uri 'self'; form-action 'self'; object-src 'none'
```

> ℹ️ **Ce que la politique concède, et à qui** : `frame-src` et `connect-src` n'ouvrent que Calendly, dont le widget est embarqué sur `/contact` et n'est chargé qu'après consentement. `'unsafe-inline'` sur `script-src` et `style-src` est la contrepartie du rendu Next sans nonce. `img-src https:` reste large pour les images distantes. En dev seulement, `script-src` gagne `'unsafe-eval'` (HMR). Toute origine tierce ajoutée plus tard — Umami, ingestion Sentry — doit être déclarée explicitement, sans quoi elle est bloquée en silence côté navigateur.

> ✅ **Vérifier après chaque modification de `next.config.ts`** : `curl -I https://thibaud-geisler.com/fr` et comparer aux valeurs de ce tableau
> ❌ **Ne pas désactiver HSTS ou CSP en production**, même temporairement

## CORS

Aucune politique CORS : le site ne sert que ses propres pages et ses Server Actions, aucun client tiers n'appelle son origine. Next.js protège déjà les Server Actions en comparant `Origin` et `Host`. À définir le jour où une API publique ou un client navigateur externe apparaîtrait.

## Rate Limiting

| Endpoint / Scope | Limite | Fenêtre | Mécanisme |
|-----------------|--------|---------|-----------|
| Formulaire contact (Server Action) | 5 requêtes | 10 min | Fenêtre glissante par IP, en mémoire (`src/lib/rate-limiter.ts`, cap 1000 clés). Dépassement → event `rate_limit:exceeded` en `warn` |

> **Chatbot (post-MVP)** : son quota ne se fixe pas ici. La route ne vivra pas dans ce dépôt mais dans le service `portfolio-chatbot`, c'est sa propre documentation d'exploitation qui la portera ([ADR-014](adrs/014-rate-limiting-chatbot.md) pour la décision).

## Dépendances

| Outil | Scope | Fréquence | Config |
|-------|-------|-----------|--------|
| Dependabot | `npm`, `github-actions`, `docker` (le `FROM` du Dockerfile) | Mensuelle | [.github/dependabot.yml](../.github/dependabot.yml) : PRs vers `develop`, 5 ouvertes au plus, mineures et patchs groupés en une PR `minor-patch`, majeures isolées |
| `pnpm audit` | Vulnérabilités des dépendances | À chaque run CI, et en local par `just audit` | Seuil `--audit-level=high`, **non bloquant** en CI (`continue-on-error`) : il signale, il n'arrête pas le pipeline |

> ⚠️ **Les PRs Dependabot visent `develop`, jamais `main`** : elles n'atteignent la production qu'au prochain merge d'epic. Un correctif de sécurité urgent passe par un `hotfix/*`.

---

# 📊 Observabilité

## Stack Monitoring

| Outil | Usage | Accès |
|-------|-------|-------|
| Dokploy Logs | Logs applicatifs stdout (Pino) en temps réel | Compose `Portfolio-app` → onglet Logs |
| Dokploy Deployments | Historique des déploiements et de leurs logs | Compose `Portfolio-app` → onglet Deployments |
| UptimeRobot | Sonde HTTP sur `/api/health` toutes les 5 min, depuis l'extérieur du VPS | Alerte email à `contact@`, au changement d'état uniquement |

## Métriques Clés

Seuils sur ce qui est réellement observable avec la stack actuelle : sonde externe et lecture des logs. Les cibles de performance (LCP, TTFB…) n'ont pas de seuil d'alerte et vivent en § Performance.

| Métrique | Seuil Warning | Seuil Critical | Mesure |
|----------|---------------|----------------|--------|
| Disponibilité du service | < 99% sur 24h | Service down | Sonde externe sur `/api/health` |
| Taux d'erreur applicative | > 1% des events | > 5% | Filtre `"level":"error"` dans les logs |
| Échecs envoi email (SMTP) | > 2 erreurs/heure | > 10 erreurs/heure | Event `email:failed` |
| Rate limit formulaire déclenché | > 5 fois/heure | > 20 fois/heure | Event `rate_limit:exceeded` |

> ⚠️ **Ces seuils ne sont comptés par personne** : aucun outil n'agrège les logs ni ne calcule de taux. Ils se vérifient à la lecture, dans l'onglet Logs, quand on a une raison de regarder.

## Alertes

| Alerte | Condition | Canal |
|--------|-----------|-------|
| Site injoignable | `/api/health` ne répond pas `200` depuis l'extérieur | Sonde externe (email) |
| Échec de build | Build de déploiement en erreur | Notification Dokploy (email), option `appBuildError` |
| Container `unhealthy` | Healthcheck en échec 3 fois de suite | Aucune notification : Dokploy n'émet rien sur l'état d'un container. Détecté par la sonde externe |
| Erreur BDD répétée | `PrismaClientInitializationError` ou code `P1001` dans les logs du container | Vérification manuelle : Database `portfolio-db` → onglet Logs |
| Échec SMTP répété | > 3 events `email:failed` consécutifs | Vérification manuelle : credentials SMTP IONOS |

> ⚠️ **Une alerte émise depuis le VPS ne survit pas à la panne du VPS** : les notifications Dokploy partent de la machine surveillée, par son propre SMTP. VPS éteint, réseau coupé ou Traefik cassé, aucun mail ne part et l'incident reste invisible. C'est la raison d'être de la sonde externe : elle seule observe le service depuis l'extérieur.

> ℹ️ **Un déploiement déclenche une alerte** s'il tombe sur un contrôle : le recreate du container coupe le service quelques dizaines de secondes (§ CI/CD & Déploiement). Un « DOWN » suivi d'un « UP » peu après, autour d'une mise en production, n'est pas un faux positif — c'est la coupure réelle, mesurée.

---

# 📝 Logging

## Format

### Structure

JSON structuré via Pino (`src/lib/logger.ts`), une ligne par événement sur stdout, capturée par Docker et lisible dans l'onglet Logs du Compose. `pino-pretty` n'est actif qu'en dev : en production, le format ci-dessous est celui qu'on lit dans Dokploy.

```json
{"level":"info","time":"2026-09-03T18:09:24.189Z","service":"thibaud-geisler-portfolio","action":"submitContact","requestId":"b4c784fb-398b-44b9-aa06-34564c598fd7","ip_hash":"7a42ebba","event":"email:sent","has_company":true,"message_length":312,"duration_ms":1180}
```

> **Champs communs à toute ligne** : `level` en label texte (jamais le code numérique Pino), `time` en ISO 8601 UTC, `service` constant, puis les bindings du child logger créé par Server Action — `action`, `requestId` (corrèle toutes les lignes d'une même soumission) et `ip_hash` (8 premiers hex du SHA-256 salé de l'IP, cf. `IP_HASH_SALT`). `event` nomme l'événement métier, préfixé par domaine.

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
| production (app) | Fenêtre glissante d'environ 1 Go par service | En place dans `compose.yaml` : driver `json-file`, `max-size: "100m"`, `max-file: "10"` |
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

- ❌ **Ne jamais logger de secrets** : `SMTP_PASS`, `DATABASE_URL`, `IP_HASH_SALT`
- ❌ **Ne jamais logger le contenu des messages de contact** ni l'identité de l'émetteur (nom, email, société) : données personnelles, RGPD
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

> ⚠️ **Aucune sauvegarde n'existe à ce jour** (relevé du 2026-09-03 : 0 backup, 0 destination, 0 volume backup côté Dokploy). Toute perte de la Database est aujourd'hui une perte totale des données, et les procédures de restauration ci-dessous n'ont rien à restaurer. C'est le risque ouvert le plus grave de cette documentation.

## Stratégie Backup

**Cible actée, pas encore en place.** Mise en œuvre par la spec `espace-admin/01` ; la marche à suivre (création de la destination, planification, rétention, pièges R2) est dans [knowledges/dokploy.md](knowledges/dokploy.md).

| Ressource | Mécanisme | Fréquence | Rétention | Localisation |
|-----------|-----------|-----------|-----------|--------------|
| PostgreSQL | Backup natif Dokploy (Database → Backups) | Quotidien | 30 sauvegardes (`Keep the latest`) | Cloudflare R2, bucket `portfolio-backups` |

> ⚠️ **`Keep the latest` compte des sauvegardes, pas des jours.** Avec une planification quotidienne, 30 donne trente jours de profondeur ; changer la fréquence change la fenêtre réelle sans toucher au champ. Champ vide = tout est conservé.

> **Le volume des assets n'est pas sauvegardé, et ne le sera pas** : les assets migrent vers Cloudflare R2 avec l'upload depuis l'espace admin, le volume Docker disparaît alors (ADR-011). Configurer une sauvegarde de volume pour la démonter ensuite n'aurait pas de sens. D'ici là, la source reste le dossier `assets/` local, celui-là même qui a servi à remplir le volume : c'est lui qu'il faut garder à jour.

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
2. Database `portfolio-db` → onglet Backups → choisir la sauvegarde, **vérifier son horodatage**, lancer la restauration (détail du mécanisme : [knowledges/dokploy.md](knowledges/dokploy.md))
3. Relancer l'app : `docker unpause $(docker ps -qf name=nextjs)`
4. Smoke test : accueil, `/projets`, formulaire de contact

> ⚠️ Tout ce qui a été écrit après la dernière sauvegarde est perdu, c'est le sens du RPO de 24 h. Lire l'horodatage avant de restaurer, et si la perte est inacceptable, chercher d'abord si les données récentes sont récupérables autrement.

### Procédure : Perte VPS Totale

1. Créer un nouveau VPS IONOS avec la même spec, installer Dokploy (procédure : [knowledges/dokploy.md](knowledges/dokploy.md) ; choix de la plateforme : [ADR-005](adrs/005-hebergement-dokploy-vs-vercel.md))
2. Recréer le projet `Portfolio` : la Database Postgres, puis le Compose `Portfolio-app` (provider GitHub, branche `main`, `compose.yaml`, Trigger Type `tag`), enfin les domaines et leurs certificats
3. Reposer les variables d'environnement du Compose (§ Environnements), dont `DATABASE_URL` pointant la nouvelle Database
4. Générer un token API Dokploy, relever le `composeId` du Compose, mettre à jour les secrets GitHub `DOKPLOY_URL`, `DOKPLOY_TOKEN` et `DOKPLOY_COMPOSE_ID` : sans eux, `deploy.yml` ne peut plus déclencher de redéploiement
5. `gh workflow run deploy.yml --ref v<dernier tag>` : rebuild, push GHCR et redeploy, les migrations Prisma se jouent au démarrage du container
6. Restaurer la BDD depuis le dernier backup (voir procédure ci-dessus), puis recopier les assets depuis le dossier `assets/` local : le volume n'est pas sauvegardé (§ Stratégie Backup)
7. Reposer `/etc/logrotate.d/docker-containers` et le défaut de log dans `/etc/docker/daemon.json` : aucun fichier du dépôt ne les porte (§ Rétention)
8. Smoke test complet

---

# ⚡ Performance

## Benchmarks

| Page/Feature | Target | Current |
|--------------|--------|---------|
| LCP `/fr` mobile | < 2,5 s | 4,1 s |
| LCP `/fr/projets` mobile | < 2,5 s | 5,4 s |
| LCP pages publiques desktop | < 2,5 s | 0,8 à 0,9 s |
| CLS pages publiques | < 0,1 | 0,05 mobile, **0,28 desktop** |
| TBT (proxy INP en lab) | < 200 ms | 60 à 460 ms selon la page |
| TTFB pages publiques | < 200 ms | à relever : `curl -o /dev/null -s -w "%{time_starttransfer}\n" https://thibaud-geisler.com/fr` (mesurer une URL localisée, la racine ne renvoie qu'une redirection) |
| Envoi du formulaire de contact | < 3 s | `duration_ms` de l'event `email:sent` |

> Colonne `Current` : dernière baseline en date, [baselines/](baselines/). Données de laboratoire (Lighthouse via PageSpeed Insights), à ne pas confondre avec du terrain. Reprendre une mesure après chaque optimisation significative et déposer un nouveau fichier de baseline plutôt que d'écraser celui-ci.

## Optimisations

- [x] Taille des bundles JS surveillée (`@next/bundle-analyzer`) — le chunk d'icônes de 2,1 Mo gzip a été éliminé en passant d'un import global à un registre de named imports
- [x] Baseline LCP/INP/CLS prise sur les pages clés × 2 locales
- [x] `preload` posé sur les images LCP above-the-fold (cf. [.claude/rules/nextjs/images-fonts.md](../.claude/rules/nextjs/images-fonts.md) : `priority` est déprécié depuis Next 16, renommé `preload`)
- [x] **CLS desktop** : 0,288 en prod (Lighthouse 13.4.1, 2026-09-04), stable depuis mai. Cause : la coquille PPR ne contient que la navbar et le footer, que `mt-auto` colle en bas de fenêtre ; l'arrivée du contenu streamé le repousse de plus de 2000 px. Corrigé en réservant la hauteur du contenu dans le layout racine. Mesuré sur build local, mêmes conditions avant/après : **0,29 → 0,012** (score perf 82 → 95) ; `/fr/projets` à 0,0008 et `/fr/contact` à 0. **À reconfirmer en prod après déploiement**
- [x] Fallback de police calibré : `Sansation` passée en `next/font/local`, le build produit `size-adjust: 102.05%` là où aucune `@font-face` de secours n'était générée. Sans effet mesuré sur le CLS. Mécanisme et garde-fou : [.claude/rules/nextjs/images-fonts.md](../.claude/rules/nextjs/images-fonts.md)
- [x] Bandeau de consentement sorti du chemin critique : provider depuis `@c15t/nextjs/headless`, surfaces UI en `next/dynamic` (`ssr: false`) via `src/components/cookies/consent-ui.tsx`, qui porte aussi leur CSS. Les importer du même point d'entrée que le provider aurait laissé l'UI dans le chunk synchrone, et laisser l'`import` CSS dans `providers.tsx` gardait 71 Ko de feuille bloquant le premier rendu — un import CSS ne se conditionne pas. Gain non distinguable du bruit en mesure locale, 11,5 Ko de moins en bloquant
- [ ] **Reprendre une baseline Core Web Vitals** : la dernière date du 13 mai 2026, trois releases avant l'état courant. Tant qu'elle n'est pas refaite, la colonne `Current` ci-dessus décrit une application qui n'existe plus

> La revalidation type ISR est déjà en place : `cacheComponents: true` + `'use cache'` + `cacheLife('hours')` sur les queries, avec 4 tags (`projects`, `tags`, `legal-entity`, `legal-content`) purgés au démarrage par `src/instrumentation.ts` — le cache hérité du build CI serait sinon servi en production. Les mutations de l'espace admin invalideront ces tags de façon ciblée (post-MVP).

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
