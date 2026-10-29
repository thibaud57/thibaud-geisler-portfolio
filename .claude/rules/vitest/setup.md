---
paths:
  - "vitest.*.ts"
  - "__mocks__/**/*.ts"
  - "src/**/*.test.{ts,tsx}"
---

# Vitest : configuration et environnements

## À faire
- Configurer `vitest.config.ts` avec le plugin **`@vitejs/plugin-react`** et résoudre les alias `@/*` par **`resolve.tsconfigPaths: true`**, option de Vite (défaut `false`) et non de Vitest : elle dépend du Vite installé, peer de Vitest. Le plugin `vite-tsconfig-paths` a été retiré du projet le 2026-09-03, il ne servait plus
- **Séparer les environnements via `projects`** : `unit` (jsdom, composants et lib), `server` (node, `src/server/**` et `src/app/api/**` hors intégration : actions, requêtes et route handlers tournent avec le `FormData`, le `File` et le `fetch` de Node) et `integration` (node, sérialisé sur la DB partagée, voir Gotchas). Jamais de directive `// @vitest-environment node` par fichier. `just test-unit` lance `unit` et `server`
- **Helpers de test partagés** dans `src/lib/*-test-setup.ts` : `prisma-test-setup.ts` (client et remise à zéro de la base de test), `matchers-test-setup.ts` (`objectMatch`, `constraintViolation` à la forme réelle d'une erreur Prisma 7). Les importer plutôt que recopier ; un `vi.mock` d'une ligne reste dans chaque fichier (hoisting)
- **Inliner `next-intl` côté project unit** via **`server.deps.inline: ['next-intl']`** : next-intl est ESM-only et importe `next/navigation` sans extension `.js` (workaround Next.js [#77200](https://github.com/vercel/next.js/issues/77200), pas fixé en Next 16). Sans inline, Node ESM strict refuse la résolution. Solution officielle [next-intl.dev/docs/environments/testing](https://next-intl.dev/docs/environments/testing). Préférer cette option à `vi.mock('next/navigation')` (insuffisant car le bug est à la résolution, avant `vi.mock`)
- Colocaliser les fichiers `.test.ts(x)` et `.integration.test.ts(x)` **strictement à plat** à côté du fichier testé (ex: `foo.ts` + `foo.test.ts` dans le même dossier). Convention projet : pas de dossier `__tests__/`, pas de dossier `tests/` à la racine, pas de structure miroir
- Maintenir une **DB de test séparée** pour les tests d'intégration Prisma (database `_test` distincte de `_dev`, ou container éphémère en CI)

## Gotchas
- Les projects inline héritent de la config racine par défaut (`extends: true`) depuis Vitest 5, l'`extends: true` explicite du projet reste valide
- **`poolOptions` aplani depuis Vitest 4** : `pool`, `maxWorkers`, `minWorkers`, `isolate`, `fileParallelism` sont des options **top-level** (dans `test:` ou dans `projects[].test:`). Plus de `poolOptions: { forks: { singleFork: true } }` (typage refuse). Migration : `singleFork: true` → `fileParallelism: false`, qui ramène à lui seul `maxWorkers` à 1 (voir le [migration guide](https://vitest.dev/guide/migration/))
- **Tests d'intégration partageant une DB** (Postgres unique pour tous les workers) : le parallélisme inter-fichiers crée des race conditions (truncate + insert concurrents). **Forcer la sérialisation** sur le project `integration` via `pool: 'forks'` + `fileParallelism: false`. Alternative production-grade : schema-per-worker via `VITEST_POOL_ID`, une DB ou un schéma Postgres par worker, numérotés à partir de 1 depuis Vitest 5, voir [zenn.dev pattern Vitest+Prisma+Testcontainers](https://zenn.dev/onozaty/articles/vitest-testcontainer-prisma)
- **`server-only` n'a pas d'implémentation hors du bundler Next** : `resolve.alias` de `vitest.config.ts` le remplace par `__mocks__/server-only.ts`, un module vide. Sans cet alias, tout test qui importe une Server Action ou un module protégé échoue dès l'import

## Exemples
```typescript
// ✅ Deux projects : unit en jsdom, integration sérialisé sur la DB partagée
export default defineConfig({
  resolve: { tsconfigPaths: true, alias: { 'server-only': './__mocks__/server-only.ts' } },
  test: {
    projects: [
      { extends: true, test: { name: 'unit', environment: 'jsdom', server: { deps: { inline: ['next-intl'] } } } },
      { extends: true, test: { name: 'integration', environment: 'node', pool: 'forks', fileParallelism: false } },
    ],
  },
})

// ❌ Ancienne forme Vitest 3, refusée au typage
test: { poolOptions: { forks: { singleFork: true } } }
```
