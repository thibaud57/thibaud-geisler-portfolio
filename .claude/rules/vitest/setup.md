---
paths:
  - "vitest.{config,setup}.ts"
  - "src/**/*.test.{ts,tsx}"
---

# Vitest — Configuration, environnements, coverage

## À faire
- Configurer `vitest.config.ts` avec le plugin **`@vitejs/plugin-react`** et résoudre les alias `@/*` par la forme native depuis Vitest 4 **`resolve.tsconfigPaths: true`** : le plugin `vite-tsconfig-paths` a été retiré du projet le 2026-09-03, il ne servait plus
- **Séparer unit / integration via `projects`** : un project `unit` (env jsdom, parallélisme normal) et un project `integration` (env node, sérialisation si DB partagée, voir gotcha plus bas). Évite le directive `// @vitest-environment node` par fichier
- **Inliner `next-intl` côté project unit** via **`server.deps.inline: ['next-intl']`** : next-intl est ESM-only et importe `next/navigation` sans extension `.js` (workaround Next.js [#77200](https://github.com/vercel/next.js/issues/77200), pas fixé en Next 16). Sans inline, Node ESM strict refuse la résolution. Solution officielle [next-intl.dev/docs/environments/testing](https://next-intl.dev/docs/environments/testing). Préférer cette option à `vi.mock('next/navigation')` (insuffisant car le bug est à la résolution, avant `vi.mock`)
- Définir `environment: 'jsdom'` pour les tests qui touchent au DOM, **`node`** pour les tests de logique pure (plus rapide)
- Activer `globals: true` dans `vitest.config.ts` + ajouter `"types": ["vitest/globals"]` dans `tsconfig.json` pour avoir `describe`/`it`/`expect` sans import
- Importer les matchers Testing Library via **`@testing-library/jest-dom/vitest`** (chemin `/vitest` obligatoire) dans le fichier setup
- Installer les packages canoniques : `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react` (16.x), `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event`. `vite` n'est pas à déclarer : peer obligatoire de Vitest 5, pnpm l'installe seul
- Colocaliser les fichiers `.test.ts(x)` et `.integration.test.ts(x)` **strictement à plat** à côté du fichier testé (ex: `foo.ts` + `foo.test.ts` dans le même dossier). Convention projet : pas de dossier `__tests__/`, pas de dossier `tests/` à la racine, pas de structure miroir. Les helpers de test partagés (fixtures, setup DB) vont dans `src/lib/*-test-setup.ts`
- Coverage via le provider **`v8`** (défaut depuis Vitest 4, plus rapide qu'Istanbul) avec reporters multiples (`text`, `html`, `lcov` pour CI)
- `/* v8 ignore next -- <raison> */` pour exclure ponctuellement une ligne du coverage (toujours commenter la raison)
- Maintenir une **DB de test séparée** pour les tests d'intégration Prisma (database `_test` distincte de `_dev`, ou container éphémère en CI)

## À éviter
- Utiliser `jsdom` pour des tests de **logique pure** (sans DOM) : utiliser `node` (plus rapide, moins de bruit)
- Viser **100% de coverage** au détriment de la pertinence des tests (préférer couvrir les chemins critiques)

## Gotchas
- **Vitest 5** : Vite >= 6.4 + Node.js >= 22.12 requis (version exacte : `docs/VERSIONS.md`). Les projects inline héritent désormais de la config racine par défaut (`extends: true`), l'`extends: true` explicite du projet reste valide
- **`poolOptions` aplani depuis Vitest 4** : `pool`, `maxWorkers`, `minWorkers`, `isolate`, `fileParallelism` sont des options **top-level** (dans `test:` ou dans `projects[].test:`). Plus de `poolOptions: { forks: { singleFork: true } }` (typage refuse). Migration : `singleFork: true` → `maxWorkers: 1` + `fileParallelism: false` (voir le [migration guide](https://vitest.dev/guide/migration/))
- **Tests d'intégration partageant une DB** (Postgres unique pour tous les workers) : le parallélisme inter-fichiers crée des race conditions (truncate + insert concurrents). **Forcer la sérialisation** sur le project `integration` via `pool: 'forks'` + `maxWorkers: 1` + `fileParallelism: false`. Alternative production-grade : schema-per-worker via `VITEST_POOL_ID`, une DB ou un schéma Postgres par worker, numérotés à partir de 1 depuis Vitest 5, voir [zenn.dev pattern Vitest+Prisma+Testcontainers](https://zenn.dev/onozaty/articles/vitest-testcontainer-prisma)
- Async Server Components Next.js **non testables** dans Vitest (limitation jsdom + RSC) : passer en E2E (Playwright) ou extraire le data fetching dans une fonction pure
- **`server-only` n'a pas d'implémentation hors du bundler Next** : `resolve.alias` de `vitest.config.ts` le remplace par `__mocks__/server-only.ts`, un module vide. Sans cet alias, tout test qui importe une Server Action ou un module protégé échoue dès l'import

## Exemples
```typescript
// ✅ Deux projects : unit en jsdom, integration sérialisé sur la DB partagée
export default defineConfig({
  resolve: { tsconfigPaths: true, alias: { 'server-only': './__mocks__/server-only.ts' } },
  test: {
    projects: [
      { extends: true, test: { name: 'unit', environment: 'jsdom', server: { deps: { inline: ['next-intl'] } } } },
      { extends: true, test: { name: 'integration', environment: 'node', pool: 'forks', maxWorkers: 1, fileParallelism: false } },
    ],
  },
})

// ❌ Ancienne forme Vitest 3, refusée au typage
test: { poolOptions: { forks: { singleFork: true } } }
```
