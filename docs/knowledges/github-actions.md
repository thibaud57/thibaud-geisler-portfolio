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

`GitHub Actions` est le service CI du portfolio. Le workflow principal exécute lint + tests sur chaque push et pull request, sur un runner `ubuntu-24.04`. Le déploiement est entièrement géré par Dokploy (webhook GitHub sur merge `main` → rebuild + redéploiement automatique), GitHub Actions ne déploie donc pas directement. Pattern canonique : `actions/checkout@v6`, `pnpm/action-setup@v6`, `actions/setup-node@v6` avec `cache: 'pnpm'`.

---

# Concepts Clés

## Workflow YAML

### Description

Les workflows sont des fichiers YAML dans `.github/workflows/`. Chaque workflow définit ses triggers (`on:`), ses jobs (`jobs:`) et les étapes (`steps:`). Les jobs s'exécutent en parallèle par défaut, sauf si `needs:` crée une dépendance.

### Exemple

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-24.04

    services:
      postgres:
        image: postgres:18
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: portfolio_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/portfolio_test

    steps:
      - uses: actions/checkout@v6

      - uses: pnpm/action-setup@v6
        with:
          version: 10

      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm exec tsc --noEmit

      - name: Run Prisma migrations
        run: pnpm exec prisma migrate deploy

      - name: Tests
        run: pnpm exec vitest run
```

### Points Importants

- `runs-on: ubuntu-24.04` (pas `ubuntu-latest` pour la reproductibilité)
- `concurrency: cancel-in-progress: true` annule les runs redondants sur la même branche
- `permissions: contents: read` applique le principe du moindre privilège
- `on: push + pull_request` couvre les deux cas essentiels
- `timeout-minutes: 15` sur le job : évite qu'un test hangué consomme les 6h (360 min) de timeout par défaut et bloque les minutes CI

---

## Service containers Postgres

### Description

GitHub Actions permet de démarrer des services auxiliaires pour les tests d'intégration (PostgreSQL, Redis). Ils tournent dans des conteneurs séparés du job runner. Le healthcheck garantit qu'ils sont prêts avant l'exécution des steps.

### Exemple

```yaml
services:
  postgres:
    image: postgres:18
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: portfolio_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432

env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/portfolio_test
```

### Points Importants

- Accès via `localhost:5432` (ports mappés sur le runner)
- `--health-cmd pg_isready` : attend que Postgres soit prêt
- Les données sont éphémères (détruit à la fin du job)
- `env.DATABASE_URL` utilise `localhost` (pas le nom du service)

---

## Cache pnpm

### Description

Accélère les installations en cachant le store pnpm entre les runs. Le cache est automatique via `actions/setup-node@v6` avec `cache: 'pnpm'`, ou manuel via `actions/cache@v4`. La clé de cache dépend du hash de `pnpm-lock.yaml`.

### Exemple

```yaml
# Option 1 : cache automatique via setup-node
- uses: pnpm/action-setup@v6
  with:
    version: 10

- uses: actions/setup-node@v6
  with:
    node-version: '24'
    cache: 'pnpm'

- run: pnpm install --frozen-lockfile

# Option 2 : cache explicite (plus de contrôle)
- name: Get pnpm store directory
  shell: bash
  run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

- uses: actions/cache@v4
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

---

## Déploiement géré par Dokploy

### Description

Dans le portfolio, le déploiement n'est pas géré par GitHub Actions. Dokploy écoute un webhook GitHub sur merge `main` et orchestre le rebuild + redéploiement. GitHub Actions ne fait que lint + tests. Alternative possible : déclencher un deploy explicite via API Dokploy.

### Exemple

```yaml
# Alternative : déclenchement explicite via API Dokploy
jobs:
  deploy:
    runs-on: ubuntu-24.04
    needs: [test]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - name: Trigger Dokploy deployment
        run: |
          curl -X POST '${{ secrets.DOKPLOY_URL }}/api/application.deploy' \
            -H 'x-api-key: ${{ secrets.DOKPLOY_AUTH_TOKEN }}' \
            -H 'Content-Type: application/json' \
            -d '{"applicationId": "${{ secrets.DOKPLOY_APPLICATION_ID }}"}'
```

### Points Importants

- Pattern actuel : Dokploy webhook natif (pas d'appel depuis GHA)
- Alternative : pipeline explicite si besoin de build avant deploy
- Secrets stockés dans GitHub Settings > Secrets
- `needs: [test]` garantit que les tests passent avant le deploy

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

- `${{ secrets.NAME }}` : injection à l'exécution, invisible dans les logs
- `permissions:` par défaut = toutes permissions (à restreindre)
- `contents: read` suffit pour un CI de tests
- Ne jamais `echo` un secret dans les logs

---

# Bonnes Pratiques

## ✅ Recommandations

- Utiliser `ubuntu-24.04` explicitement (pas `ubuntu-latest`)
- Actions v6 : `checkout@v6`, `setup-node@v6`, `pnpm/action-setup@v6`
- `cache: 'pnpm'` dans `setup-node` pour accélérer
- `concurrency.cancel-in-progress: true` sur les branches feature
- `permissions: contents: read` par défaut
- `--frozen-lockfile` en CI (garantit la reproductibilité)

## ❌ Anti-Patterns

- Ne pas utiliser `ubuntu-latest` (instable, change sans prévenir)
- Ne pas utiliser `actions/checkout@v4` ou antérieur (updates de sécurité)
- Ne pas hardcoder des valeurs sensibles dans le YAML
- Ne pas oublier `--frozen-lockfile` (risque de versions divergentes)
- Ne pas omettre `permissions:` (toutes permissions par défaut)

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
