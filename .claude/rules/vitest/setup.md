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
- Configurer `vitest.config.ts` avec les plugins **`@vitejs/plugin-react`** et **`vite-tsconfig-paths`** (sinon les alias `@/*` cassent dans les tests)
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
- Async Server Components Next.js **non testables** dans Vitest (limitation jsdom + RSC) — passer en E2E (Playwright) ou extraire le data fetching dans une fonction pure
- `@testing-library/react@16.x` : combo officiel avec Vitest 4 (versions antérieures incompatibles)
- **Emplacement des tests (convention projet)** : strictement à plat à côté du fichier testé. Pas de `__tests__/`, pas de `tests/` racine, pas de structure miroir. Les helpers de test partagés (fixtures, setup DB) vont dans `src/lib/*-test-setup.ts` (colocalisés avec les utilitaires `lib/` qu'ils testent)

## Exemples
```typescript
// ✅ vitest.config.ts minimal — plugins + jsdom + globals + setup
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
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
