---
paths:
  - ".github/workflows/**/*.yml"
  - ".github/workflows/**/*.yaml"
---

# GitHub Actions — Workflows CI (lint, typecheck, tests, build, audit)

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
- **Pattern agrégateur** si required check en branch protection avec exclusion doc-only : split en 3 jobs (`changes` via `dorny/paths-filter@v3` avec `predicate-quantifier: every` → `quality` conditionnel sur source → `ci` agrégateur qui tourne toujours `if: always()` et retourne success si quality OK ou skipped). Évite que les PR doc-only soient bloquées par le required check. Ajouter `pull-requests: read` aux permissions (paths-filter API). Voir exemple ci-dessous

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
# ✅ Pattern agrégateur pour required check compatible doc-only
permissions:
  contents: read
  pull-requests: read  # requis par paths-filter

jobs:
  changes:
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    outputs:
      source: ${{ steps.filter.outputs.source }}
    steps:
      - uses: actions/checkout@v6
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          predicate-quantifier: every   # obligatoire pour que les négations excluent réellement (défaut 'some' = OR → ** matche toujours et rend les négations inertes)
          filters: |
            source:
              - '**'
              - '!**/*.md'
              - '!docs/**'
              - '!.claude/**'

  quality:
    needs: changes
    if: needs.changes.outputs.source == 'true'
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      # lint + typecheck + test + build…

  ci:  # job agrégateur : nom du required check GitHub
    needs: [changes, quality]
    if: always()
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - name: Verify
        run: |
          if [[ "${{ needs.changes.result }}" != "success" ]]; then exit 1; fi
          if [[ "${{ needs.quality.result }}" == "failure" || "${{ needs.quality.result }}" == "cancelled" ]]; then exit 1; fi
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
