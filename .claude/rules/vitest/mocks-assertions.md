---
paths:
  - "src/**/*.test.{ts,tsx}"
---

# Vitest : mocks et assertions

## À faire
- **Mock partiel** d'un module : `vi.mock('./module', async (orig) => ({ ...(await orig()), fn: vi.fn() }))`
- Déclarer `vi.mock` au **top-level** du fichier, jamais dans un `describe`, un `it` ou une fonction
- S'appuyer sur **`clearMocks: true`**, défaut de Vitest 5, pour vider l'historique d'appels avant chaque test. Réserver `restoreAllMocks()` aux `vi.spyOn` dont il faut rendre l'original

## À éviter
- Ajouter `afterEach(() => vi.clearAllMocks())` dans un nouveau fichier : redondant avec le défaut de Vitest 5
- `resetAllMocks()`, qui efface aussi les implémentations posées après coup (`vi.fn()` retombe sur `undefined`, `vi.fn(impl)` revient à `impl`)
- Faire dépendre `vi.mock()` de variables locales : le mock est **hoisted** au top du fichier, les variables ne sont pas encore définies au moment de l'exécution. Une valeur partagée avec la factory se déclare par **`vi.hoisted(() => ...)`**, top-level, avant le `vi.mock`

## Gotchas
- **Vitest 5 : `clearMocks` passe à `true` par défaut.** Seul l'historique d'appels est vidé avant chaque test, les implémentations posées par `mockResolvedValue` restent en place
- **Vitest 5 : `vi.mock` appelé hors du top-level lève une erreur** (simple warning en v4)
- **Vitest 5 : une assertion asynchrone non attendue** (`resolves`, `rejects`, `toMatchFileSnapshot`) fait échouer le test, `expect.poll` rejette si son callback ne se stabilise pas avant `timeout`

## Exemples
```typescript
// ✅ Mock partiel : ne remplace que `send`, garde le reste du module
vi.mock('@/lib/mailer', async (orig) => ({
  ...(await orig<typeof import('@/lib/mailer')>()),
  send: vi.fn(),
}))

// ✅ Valeur partagée avec la factory via vi.hoisted
const { fakeUser } = vi.hoisted(() => ({ fakeUser: { id: '1' } }))
vi.mock('@/lib/auth', () => ({ getUser: () => fakeUser }))

// ❌ Assertion async non attendue : le test échoue depuis Vitest 5
expect(asyncFn()).rejects.toThrow()
```
