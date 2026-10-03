---
paths:
  - ".github/workflows/*.{yml,yaml}"
---

# GitHub Actions — Workflow CI (lint, typecheck, tests, build, audit)

## À faire
- Runner épinglé **`ubuntu-24.04`** (pas `ubuntu-latest`, qui bascule sans préavis)
- **Actions épinglées par SHA de commit**, version exacte en commentaire (`uses: actions/checkout@3d3c42e… # v7.0.1`) : un tag `@vN` est mobile et détournable (`tj-actions/changed-files`, mars 2025, secrets exfiltrés sur des milliers de dépôts). Dependabot (`github-actions`) met à jour le SHA et le commentaire ensemble, l'inventaire vit dans VERSIONS.md § GitHub Actions
- **`pnpm/action-setup` AVANT `setup-node`**, sans `version:` : setup-node doit trouver pnpm sur le PATH pour le cache, et la version se lit dans `packageManager`
- **Node 24** explicite dans `setup-node` (`node-version: '24'`) : le Node système de l'image runner change à chaque image, ne jamais s'y fier
- **Cache pnpm** explicite : `cache: 'pnpm'` dans `actions/setup-node` (le cache auto a été retiré en v6), puis **`pnpm install --frozen-lockfile`**
- **Concurrency** : `group: ${{ github.workflow }}-${{ github.ref }}` + `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` : les runs redondants d'une PR s'annulent, chaque commit de `main` garde son verdict
- **Permissions minimales** au niveau workflow (`contents: read`), le défaut accordant tout
- **`timeout-minutes: 15`** sur les jobs de qualité : un test qui hang ne consomme pas les 6 h par défaut
- **Service container Postgres** pour les tests d'intégration : `image: postgres:18-alpine` (même tag que `compose.override.yaml`), healthcheck `pg_isready`, `DATABASE_URL` sur `localhost:5432` depuis le runner
- **`just build` avec une `DATABASE_URL` injoignable** (`127.0.0.1:1`) et `SKIP_ENV_VALIDATION: 'true'` : depuis ADR-022 le build ne lit plus la base, un accès résiduel doit casser la CI au lieu de passer inaperçu
- **Pattern agrégateur** pour un required check compatible doc-only : `changes` (`dorny/paths-filter` avec `predicate-quantifier: every`) → `quality` conditionnel → `ci` en `if: always()`, qui réussit si `quality` est vert ou sauté. Ajouter `pull-requests: read` aux permissions (API de paths-filter)
- **Sauter `quality` sur les PR de release** par `&& !startsWith(github.head_ref, 'release-please--')` : elles touchent `package.json`, donc `source` rend `true`. Exclure `package.json` du filtre ferait sauter la CI à une vraie PR de dépendances. `github.head_ref` est vide au push, le garde-fou y reste intact

## À éviter
- Valeurs sensibles en clair : toujours `${{ secrets.NAME }}`, ne jamais `echo` un secret dans les logs
- Omettre `permissions:` au niveau workflow

## Gotchas
- **`actions/setup-node` v5 → v6** : le cache automatique pour pnpm a été retiré, `cache: 'pnpm'` est obligatoire (VERSIONS.md)
- **`pnpm/action-setup` v3 → v4** : erreur si `packageManager` contredit une `version:` passée à l'action. Un pin en double diverge en silence au prochain bump de pnpm, d'où l'absence de `version:`
- **Node 20 est EOL depuis le 30 avril 2026** : seul l'override `node-version: '24'` rend le runtime déterministe
- Release, déploiement et tokens : voir `github-actions/release-deploy.md`

## Exemples
```yaml
# ✅ Job quality : setup déterministe, commandes via just
quality:
  needs: changes
  if: needs.changes.outputs.source == 'true' && !startsWith(github.head_ref, 'release-please--')
  runs-on: ubuntu-24.04
  timeout-minutes: 15
  steps:
    - uses: actions/checkout@<sha> # v7.0.1
    - uses: pnpm/action-setup@<sha> # v6.1.0
    - uses: actions/setup-node@<sha> # v7.0.0
      with: { node-version: '24', cache: 'pnpm' }
    - run: pnpm install --frozen-lockfile
    - run: just lint && just typecheck && just test
    - run: just build
      env: { DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/test_db' }

# ❌ Tag mobile et version pnpm pinnée en double
- uses: pnpm/action-setup@v6
  with: { version: 10 }
```
