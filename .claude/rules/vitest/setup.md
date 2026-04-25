---
paths:
  - "vitest.config.ts"
  - "vitest.config.mts"
  - "vitest.setup.ts"
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
---

# Vitest — Configuration, matchers, mocks, coverage

## À faire
- Configurer `vitest.config.ts` avec le plugin **`@vitejs/plugin-react`** + résoudre les alias `@/*` via le plugin **`vite-tsconfig-paths`** (`plugins: [tsconfigPaths(), react()]`) **OU** la forme native Vitest 4 **`resolve.tsconfigPaths: true`** dans le bloc `resolve` (équivalent fonctionnel, pas de dep additionnelle si Vitest 4)
- **Séparer unit / integration via `projects`** (pattern Vitest 4) : un project `unit` (env jsdom, parallélisme normal) et un project `integration` (env node, sérialisation si DB partagée — voir gotcha plus bas). Évite le directive `// @vitest-environment node` par fichier
- **Inliner `next-intl` côté project unit** via **`server.deps.inline: ['next-intl']`** : next-intl est ESM-only et importe `next/navigation` sans extension `.js` (workaround Next.js [#77200](https://github.com/vercel/next.js/issues/77200), pas fixé en Next 16). Sans inline, Node ESM strict refuse la résolution. Solution officielle [next-intl.dev/docs/environments/testing](https://next-intl.dev/docs/environments/testing). Préférer cette option à `vi.mock('next/navigation')` (insuffisant car le bug est à la résolution, avant `vi.mock`)
- Définir `environment: 'jsdom'` pour les tests qui touchent au DOM, **`node`** pour les tests de logique pure (plus rapide)
- Activer `globals: true` dans `vitest.config.ts` + ajouter `"types": ["vitest/globals"]` dans `tsconfig.json` pour avoir `describe`/`it`/`expect` sans import
- Importer les matchers Testing Library via **`@testing-library/jest-dom/vitest`** (chemin `/vitest` obligatoire) dans le fichier setup
- Installer les packages canoniques : `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event`
- Colocaliser les fichiers `.test.ts(x)` et `.integration.test.ts(x)` **strictement à plat** à côté du fichier testé (ex: `foo.ts` + `foo.test.ts` dans le même dossier). Convention projet : pas de dossier `__tests__/`, pas de dossier `tests/` à la racine, pas de structure miroir
- **Matchers** : `toBe` (primitives, `Object.is`), `toEqual` (objets, comparaison récursive), `toStrictEqual` (strict avec types + `undefined`)
- **Erreurs sync** : `expect(() => fn()).toThrow(/pattern/)` (wrapper en arrow function obligatoire)
- **Erreurs async** : `await expect(promise).rejects.toThrow('msg')` pour les rejets de promise
- **3 niveaux de mock** : `vi.fn()` crée un mock isolé, `vi.spyOn(obj, 'method')` observe/remplace une méthode existante, `vi.mock('module')` remplace un module entier
- **Mock partiel** d'un module : `vi.mock('./module', async (orig) => ({ ...(await orig()), fn: vi.fn() }))`
- Préférer **`vi.spyOn`** quand possible : moins invasif que `vi.mock` (n'affecte qu'une méthode, plus facile à restaurer)
- Nettoyer les mocks avec **`afterEach(() => vi.clearAllMocks())`** par défaut (clear l'historique des appels sans toucher aux implementations) ; utiliser **`restoreAllMocks()`** uniquement si tu as des `vi.spyOn` à restaurer aux originaux ; éviter `resetAllMocks()` qui remplace les implémentations par `undefined`
- Coverage via le provider **`v8`** (par défaut Vitest 4, plus rapide qu'Istanbul) avec reporters multiples (`text`, `html`, `lcov` pour CI)
- `/* v8 ignore next -- <raison> */` pour exclure ponctuellement une ligne du coverage (toujours commenter la raison)
- Maintenir une **DB de test séparée** pour les tests d'intégration Prisma (database `_test` distincte de `_dev`, ou container éphémère en CI)

## À éviter
- Utiliser `react-test-renderer` : **déprécié** React 19, utiliser `@testing-library/react`
- Utiliser `jsdom` pour des tests de **logique pure** (sans DOM) : utiliser `node` (plus rapide, moins de bruit)
- Partager du state entre tests via `beforeAll` : préférer `beforeEach`/`afterEach` pour l'isolation
- Viser **100% de coverage** au détriment de la pertinence des tests (préférer couvrir les chemins critiques)
- Faire dépendre `vi.mock()` de variables locales : le mock est **hoisted** au top du fichier, les variables ne sont pas encore définies au moment de l'exécution
- Compter sur l'ordre d'exécution des tests : Vitest exécute les fichiers en parallèle (non-déterministe par design)

## Gotchas
- Vitest 4.1.4 : Vite ≥ 6 + Node.js ≥ 20 requis
- **Vitest 4 a aplani `poolOptions`** : `pool`, `maxWorkers`, `minWorkers`, `isolate`, `fileParallelism` sont désormais des options **top-level** (dans `test:` ou dans `projects[].test:`). Plus de `poolOptions: { forks: { singleFork: true } }` (typage refuse). Migration : `singleFork: true` → `maxWorkers: 1` + `fileParallelism: false` (voir [Vitest 4 migration guide](https://vitest.dev/guide/migration.html))
- **Tests d'intégration partageant une DB** (Postgres unique pour tous les workers) : le parallélisme inter-fichiers crée des race conditions (truncate + insert concurrents). **Forcer la sérialisation** sur le project `integration` via `pool: 'forks'` + `maxWorkers: 1` + `fileParallelism: false`. Alternative production-grade : schema-per-worker via `VITEST_POOL_ID` (1..N), une DB ou un schéma Postgres par worker — voir [zenn.dev pattern Vitest+Prisma+Testcontainers](https://zenn.dev/onozaty/articles/vitest-testcontainer-prisma)
- Async Server Components Next.js **non testables** dans Vitest (limitation jsdom + RSC) — passer en E2E (Playwright) ou extraire le data fetching dans une fonction pure
- `@testing-library/react@16.x` : combo officiel avec Vitest 4 (versions antérieures incompatibles)
- **Emplacement des tests (convention projet)** : strictement à plat à côté du fichier testé. Pas de `__tests__/`, pas de `tests/` racine, pas de structure miroir. Les helpers de test partagés (fixtures, setup DB) vont dans `src/lib/*-test-setup.ts` (colocalisés avec les utilitaires `lib/` qu'ils testent)

## Exemples
```typescript
// ✅ vitest.config.ts Vitest 4 — projects unit/integration séparés
// Plugins / resolve / setupFiles hérités par les projects via extends: true
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true, // forme native Vitest 4 (équivaut au plugin vite-tsconfig-paths)
  },
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.integration.test.{ts,tsx}'],
          // next-intl ESM-only importe `next/navigation` sans extension .js (cf. vercel/next.js#77200)
          server: { deps: { inline: ['next-intl'] } },
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/**/*.integration.test.{ts,tsx}'],
          // DB partagée → sérialisation totale entre fichiers
          pool: 'forks',
          maxWorkers: 1,
          fileParallelism: false,
        },
      },
    ],
  },
})

// ✅ vitest.setup.ts — chemin /vitest obligatoire
import '@testing-library/jest-dom/vitest'
```

```typescript
// ✅ Trois niveaux de mock côte à côte
const fnMock = vi.fn().mockReturnValue(42)
const spy = vi.spyOn(service, 'doWork').mockResolvedValue('ok')
vi.mock('@/lib/external', () => ({ fetch: vi.fn() }))

// ✅ Mock partiel : ne remplace que `send`, garde le reste du module
vi.mock('@/lib/mailer', async (orig) => ({
  ...(await orig<typeof import('@/lib/mailer')>()),
  send: vi.fn(),
}))

// ❌ vi.mock dépend d'une variable locale (hoisted avant son init)
const fakeUser = { id: '1' }
vi.mock('@/lib/auth', () => ({ getUser: () => fakeUser })) // erreur runtime
```

```typescript
// ✅ Matchers : sync, async, erreurs
expect(value).toBe(42)                    // primitive
expect(obj).toEqual({ a: 1 })             // objet
expect(() => fn()).toThrow(/invalid/)     // erreur sync (wrapper arrow)
await expect(asyncFn()).rejects.toThrow() // erreur async

// ✅ Cleanup : clearAllMocks (pas restoreAllMocks qui est pour spies)
afterEach(() => vi.clearAllMocks())
```
