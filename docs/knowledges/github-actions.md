---
title: "GitHub Actions — CI/CD"
version: "ubuntu-24.04"
description: "Référence technique pour GitHub Actions : workflows, service containers Postgres et déploiement Dokploy."
date: "2026-04-13"
keywords: ["github-actions", "ci", "cd", "workflow", "pnpm"]
scope: ["docs"]
technologies: ["Node.js", "pnpm", "Vitest", "Dokploy"]
---

# Description

`GitHub Actions` est le service CI du portfolio. Le workflow principal, `ci.yml`, tourne sur les pull requests vers `main` et `develop` et sur les push vers `main`, sur un runner `ubuntu-24.04` : il lance `just lint`, `typecheck`, `test`, `build` et `audit`, et saute ces étapes quand le diff ne touche que de la documentation. Deux autres workflows complètent : `security.yml` (scan Trivy hebdomadaire de l'image publiée) et `release-please.yml` (version et tag). Le déploiement est porté par un second workflow, `deploy.yml`, déclenché sur le tag `v*` : build de l'image, push sur GHCR, puis appel de l'API Dokploy qui tire l'image sans rien builder. Pattern canonique : `actions/checkout@v7`, `pnpm/action-setup@v6`, `actions/setup-node@v7` avec `cache: 'pnpm'`.

---

# Concepts Clés

## Workflow YAML

### Description

Les workflows sont des fichiers YAML dans `.github/workflows/`. Chaque workflow définit ses triggers (`on:`), ses jobs (`jobs:`) et les étapes (`steps:`). Les jobs s'exécutent en parallèle par défaut, sauf si `needs:` crée une dépendance.

`ci.yml` suit un schéma à trois jobs, imposé par le required check `ci` de la branch protection : `changes` détecte si le diff touche du code, `quality` fait le travail, `ci` agrège et seul ce dernier est requis. Un diff purement documentaire saute `quality` sans bloquer la PR.

### Exemple

```yaml
# .github/workflows/ci.yml (condensé)
on:
  push:
    branches: [main]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

permissions:
  contents: read
  pull-requests: read

jobs:
  changes:
    runs-on: ubuntu-24.04
    outputs:
      source: ${{ steps.filter.outputs.source }}
    steps:
      - uses: actions/checkout@<sha> # v7.0.1
      - uses: dorny/paths-filter@<sha> # v4.0.3
        id: filter
        with:
          predicate-quantifier: every
          filters: |
            source: ['**', '!**/*.md', '!docs/**', '!.claude/**']

  quality:
    needs: changes
    if: needs.changes.outputs.source == 'true'
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@<sha> # v7.0.1
      - uses: pnpm/action-setup@<sha> # v6.1.0, version lue dans `packageManager`
      - uses: actions/setup-node@<sha> # v7.1.0
        with: { node-version: '24', cache: 'pnpm' }
      - uses: extractions/setup-just@<sha> # v4.0.0
      - run: pnpm install --frozen-lockfile
      - run: just lint
      - run: just typecheck
      - run: just test
      - run: just build

  ci:
    needs: [changes, quality]
    if: always()
    runs-on: ubuntu-24.04
    steps:
      - run: '[[ "${{ needs.quality.result }}" != "failure" && "${{ needs.quality.result }}" != "cancelled" ]]'
```

### Points Importants

- `runs-on: ubuntu-24.04` (pas `ubuntu-latest` pour la reproductibilité)
- Les commandes passent par `just`, comme en local : la CI ne réinvente pas les recettes du `Justfile`
- `cancel-in-progress` seulement sur les PR : un run sur `main` va toujours au bout
- `permissions: contents: read` applique le principe du moindre privilège
- `timeout-minutes: 15` sur le job : évite qu'un test hangué consomme les 6h (360 min) de timeout par défaut et bloque les minutes CI
- Le job `ci` porte `if: always()` : sans condition, un `quality` sauté marquerait le check requis comme ignoré et bloquerait le merge. Ne pas le remplacer par `!cancelled()`, conseillé pour un step ordinaire : un job sauté compte comme réussi pour un check requis, un run annulé laisserait alors merger sans `quality`. Sous `always()`, `ci` tourne et échoue sur un `quality` annulé

---

## Service containers Postgres

### Description

GitHub Actions permet de démarrer des services auxiliaires pour les tests d'intégration (PostgreSQL, Redis). Ils tournent dans des conteneurs séparés du job runner. Le healthcheck garantit qu'ils sont prêts avant l'exécution des steps.

### Exemple

```yaml
services:
  postgres:
    image: postgres:18-alpine
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test_db
    options: >-
      --health-cmd="pg_isready -U test -d test_db"
      --health-interval=10s
      --health-timeout=5s
      --health-retries=5
    ports:
      - 5432:5432

env:
  DATABASE_URL: postgresql://test:test@localhost:5432/test_db
```

### Points Importants

- Accès via `localhost:5432` (ports mappés sur le runner)
- `--health-cmd pg_isready` : attend que Postgres soit prêt
- Les données sont éphémères (détruit à la fin du job)
- `env.DATABASE_URL` utilise `localhost` (pas le nom du service)
- La base sert aux tests d'intégration (`prisma migrate deploy` puis `just test`). `just build`, lui, reçoit une URL volontairement injoignable (`127.0.0.1:1`) : depuis [ADR-022](../adrs/022-rendu-public-sans-donnee-au-build.md), le build ne lit plus la base, et un accès résiduel casserait la CI au lieu de passer inaperçu

---

## Cache pnpm

### Description

Accélère les installations en cachant le store pnpm entre les runs. Le cache est automatique via `actions/setup-node@v7` avec `cache: 'pnpm'`, ou manuel via `actions/cache@v6`. La clé de cache dépend du hash de `pnpm-lock.yaml`.

### Exemple

```yaml
# Option 1 : cache automatique via setup-node (celle du projet)
- uses: pnpm/action-setup@<sha> # v6.1.0, sans `version:` : lue dans `packageManager`

- uses: actions/setup-node@<sha> # v7.1.0
  with:
    node-version: '24'
    cache: 'pnpm'

- run: pnpm install --frozen-lockfile

# Option 2 : cache explicite (plus de contrôle)
- name: Get pnpm store directory
  shell: bash
  run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

- uses: actions/cache@<sha> # v6.1.0
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-
```

### Points Importants

- Cache basé sur le hash de `pnpm-lock.yaml`
- `--frozen-lockfile` échoue si le lockfile est désynchronisé
- Le cache est partagé entre workflows du même repo
- Option 2 (explicite) préférée pour les monorepos complexes
- Le projet cache aussi `.next/cache` par `actions/cache`, clé sur le lockfile et les sources : le build Next réutilise sa compilation précédente
- Ne pas pinner `version:` dans `pnpm/action-setup` : un second pin diverge silencieusement de `packageManager` au prochain bump de pnpm

---

## Déploiement géré par Dokploy

### Description

Dans le portfolio, le déploiement **est** porté par GitHub Actions. `deploy.yml` se déclenche sur le push d'un tag `v*`, build l'image, la pousse sur GHCR, puis appelle l'API Dokploy (`compose.redeploy`) par `curl`. Dokploy est en **pull-only** : il tire l'image publiée et ne build jamais sur le VPS.

### Exemple

```yaml
# .github/workflows/deploy.yml (dernière étape, après le build et le push sur GHCR)
- name: Trigger Dokploy compose redeploy
  env:
    DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}
    DOKPLOY_TOKEN: ${{ secrets.DOKPLOY_TOKEN }}
    DOKPLOY_COMPOSE_ID: ${{ secrets.DOKPLOY_COMPOSE_ID }}
  run: |
    for i in 1 2 3; do
      curl -fsSL --max-time 30 -X POST \
        "$DOKPLOY_URL/api/compose.redeploy" \
        -H "x-api-key: $DOKPLOY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"composeId\":\"$DOKPLOY_COMPOSE_ID\"}" && exit 0
      echo "Attempt $i failed, retrying in $((i*5))s..."
      sleep $((i*5))
    done
    exit 1
```

### Points Importants

- Pattern : build en GHA sur tag `v*`, image sur GHCR, puis `compose.redeploy` sur l'application Compose Dokploy (pas `application.deploy`, qui viserait une application Dokploy classique)
- Trois tentatives espacées : un redémarrage de Dokploy pendant l'appel ne fait pas échouer la release
- Le tag n'est posé que sur `main`, après merge d'une PR dont la CI est verte : le deploy ne relance pas les tests
- Secrets stockés dans GitHub Settings > Secrets, les `NEXT_PUBLIC_*` dans les variables du dépôt. Les secrets passent par `env:` du step, jamais interpolés dans le `run:` (cf. § Secrets et permissions)
- Ni pnpm ni Node sur le runner de `deploy.yml` : le Dockerfile installe lui-même les dépendances (steps retirés le 9 octobre 2026, ils exécutaient des lifecycle scripts dans un job qui porte `packages: write`)

---

## Secrets et permissions

### Description

Les secrets (credentials, API tokens) sont stockés dans GitHub Settings > Secrets and variables > Actions. Référencés via `${{ secrets.NAME }}`. Le principe du moindre privilège s'applique : `permissions:` limite ce que le `GITHUB_TOKEN` peut faire.

### Exemple

```yaml
permissions:
  contents: read       # clone du repo uniquement
  # pull-requests: write  # ajouter si commentaires de bot

jobs:
  test:
    env:
      SMTP_HOST: ${{ secrets.SMTP_HOST }}
      SMTP_USER: ${{ secrets.SMTP_USER }}
      # Jamais hardcoder les valeurs sensibles
```

### Points Importants

- `${{ secrets.NAME }}` : injection à l'exécution, masquée dans les logs. Dans un `run:`, la passer par `env:` et lire `$NAME` : interpolée directement, la valeur est écrite dans le script avant que le shell ne le lise
- Sans `permissions:`, un job hérite du défaut du dépôt (Settings > Actions > General) : `read`, sans approbation de PR par les workflows, depuis le 9 octobre 2026 (auparavant `write` et approbation autorisée). Aucun workflow n'en dépend, release-please passe par le token d'App
- Restreindre aussi le token d'une GitHub App par les inputs `permission-<scope>` de `actions/create-github-app-token`, sinon il reçoit toutes les permissions de l'installation
- `contents: read` suffit pour un CI de tests
- Ne jamais `echo` un secret dans les logs

---

# Bonnes Pratiques

## ✅ Recommandations

- Utiliser `ubuntu-24.04` explicitement (pas `ubuntu-latest`)
- Actions épinglées par SHA de commit, version en commentaire (`checkout@<sha> # v7.0.1`) : un tag `@vN` est mobile et détournable, Dependabot met à jour SHA et commentaire ensemble
- `cache: 'pnpm'` dans `setup-node` pour accélérer
- `concurrency.cancel-in-progress: ${{ github.event_name == 'pull_request' }}` : annule les runs redondants d'une PR, garde le verdict de chaque commit de `main`
- `permissions: contents: read` par défaut
- `--frozen-lockfile` en CI (garantit la reproductibilité)

## ❌ Anti-Patterns

- Ne pas utiliser `ubuntu-latest` : il bascule de lui-même vers chaque nouvelle LTS (vers 26.04 entre le 19 octobre et le 19 novembre 2026)
- Ne pas passer de glob à accolades à `hashFiles` (`src/**/*.{ts,tsx}`) : il rend une chaîne vide sans erreur, et la clé de cache ne change plus. Un glob par argument
- Ne pas laisser un step `continue-on-error: true` sans signal : il conclut en succès, doubler d'un `::warning::` sur `steps.<id>.outcome == 'failure'`
- Ne pas utiliser `actions/checkout@v4` ou antérieur (updates de sécurité)
- Ne pas hardcoder des valeurs sensibles dans le YAML
- Ne pas oublier `--frozen-lockfile` (risque de versions divergentes)
- Ne pas omettre `permissions:` au niveau workflow (le job hériterait du défaut du dépôt)

---

# 🔗 Ressources

## Documentation Officielle

- [GitHub Actions : Documentation](https://docs.github.com/en/actions)
- [Workflow syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions)
- [Service containers](https://docs.github.com/actions/using-containerized-services/creating-postgresql-service-containers)

## Ressources Complémentaires

- [actions/checkout](https://github.com/actions/checkout)
- [actions/setup-node](https://github.com/actions/setup-node)
- [pnpm/action-setup](https://github.com/pnpm/action-setup)
- [pnpm CI guide](https://pnpm.io/continuous-integration)
