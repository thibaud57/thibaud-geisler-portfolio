---
paths:
  - ".github/workflows/**/*.yml"
  - ".github/workflows/**/*.yaml"
---

# GitHub Actions — Workflows CI (lint, tests)

## À faire
- Runner épinglé **`ubuntu-24.04`** (pas `ubuntu-latest`, qui bascule sans préavis et casse les runs)
- Actions en **v6** épinglées (`actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v6`), avec **`pnpm/action-setup` AVANT `setup-node`** pour que le cache pnpm fonctionne (setup-node a besoin de trouver pnpm sur le PATH)
- **Node 24** explicite dans `setup-node` : `node-version: '24'` (Node 20 reste le défaut runner, à overrider car EOL 30 avril 2026)
- **Cache pnpm** explicite : `cache: 'pnpm'` dans `actions/setup-node@v6` (le cache auto a été retiré en v6)
- Install reproductible : **`pnpm install --frozen-lockfile`** (échoue si lockfile désynchronisé avec `package.json`)
- **Concurrency** : `concurrency.group: ${{ github.workflow }}-${{ github.ref }}` + `cancel-in-progress: true` pour annuler les runs redondants sur la même branche
- **Permissions minimales** au niveau workflow : `permissions: contents: read` (principe du moindre privilège, le défaut = toutes permissions)
- **`timeout-minutes: 15`** sur chaque job : évite qu'un test qui hang consomme les 6h de timeout par défaut et bloque les minutes CI (15 min suffit largement pour lint + typecheck + tests d'un MVP)
- **Service container `postgres:18`** pour tests d'intégration : `image: postgres:18`, healthcheck `pg_isready`, `DATABASE_URL` sur `localhost:5432` depuis le runner (pas le nom du service)

## À éviter
- **Pas de deploy job** GitHub Actions : Dokploy gère tout le déploiement via webhook natif sur merge `main` (ARCHITECTURE.md)
- Valeurs sensibles en clair : toujours `${{ secrets.NAME }}`, ne jamais `echo` un secret dans les logs (cf. `nodemailer/email.md` pour le pattern de mock SMTP en tests)
- Omettre `permissions:` au niveau workflow : par défaut GitHub accorde toutes les permissions, toujours restreindre explicitement

## Gotchas
- **`actions/setup-node` v5 → v6** : le cache automatique pour pnpm a été retiré, `cache: 'pnpm'` est désormais obligatoire pour bénéficier du cache (VERSIONS.md)
- **`pnpm/action-setup` v3 → v4** : erreur levée si le champ `packageManager` dans `package.json` contredit la version spécifiée dans l'action (avant : silencieux) (VERSIONS.md)
- **Node 20 EOL 30 avril 2026** + Node 20 reste le défaut sur `ubuntu-24.04` : override obligatoire via `node-version: '24'` dans `setup-node@v6` (VERSIONS.md)

## Exemples
```yaml
# ✅ Workflow CI minimal : lint + typecheck + tests (pas de deploy)
name: ci
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
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run typecheck
      - run: pnpm run test
```

```yaml
# ✅ Service container postgres:18 pour tests d'intégration
jobs:
  test:
    runs-on: ubuntu-24.04
    services:
      postgres:
        image: postgres:18-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U test -d test_db"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/test_db
    steps:
      # ...
```
