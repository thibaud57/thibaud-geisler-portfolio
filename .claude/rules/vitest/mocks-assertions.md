---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
---

# Vitest — Mocks et assertions

## À faire
- **Matchers** : `toBe` (primitives, `Object.is`), `toEqual` (objets, comparaison récursive), `toStrictEqual` (strict avec types + `undefined`)
- **Erreurs sync** : `expect(() => fn()).toThrow(/pattern/)` (wrapper en arrow function obligatoire)
- **Erreurs async** : `await expect(promise).rejects.toThrow('msg')`, toujours précédé de `await`
- **3 niveaux de mock** : `vi.fn()` crée un mock isolé, `vi.spyOn(obj, 'method')` observe ou remplace une méthode existante, `vi.mock('module')` remplace un module entier. Préférer `vi.spyOn` quand il suffit : il n'affecte qu'une méthode et se restaure facilement
- **Mock partiel** d'un module : `vi.mock('./module', async (orig) => ({ ...(await orig()), fn: vi.fn() }))`
- Déclarer `vi.mock` au **top-level** du fichier, jamais dans un `describe`, un `it` ou une fonction
- S'appuyer sur **`clearMocks: true`**, défaut de Vitest 5, pour vider l'historique d'appels avant chaque test. Réserver `restoreAllMocks()` aux `vi.spyOn` dont il faut rendre l'original

## À éviter
- Ajouter `afterEach(() => vi.clearAllMocks())` dans un nouveau fichier : redondant avec le défaut de Vitest 5
- `resetAllMocks()`, qui remplace les implémentations par `undefined`
- Faire dépendre `vi.mock()` de variables locales : le mock est **hoisted** au top du fichier, les variables ne sont pas encore définies au moment de l'exécution
- Compter sur l'ordre d'exécution des tests : Vitest exécute les fichiers en parallèle (non-déterministe par design)
- Partager du state entre tests via `beforeAll` : préférer `beforeEach`/`afterEach` pour l'isolation

## Gotchas
- **Vitest 5 : `clearMocks` passe à `true` par défaut.** Seul l'historique d'appels est vidé avant chaque test, les implémentations posées par `mockResolvedValue` restent en place
- **Vitest 5 : `vi.mock` appelé hors du top-level lève une erreur** (simple warning en v4)
- **Vitest 5 : une assertion asynchrone non attendue** (`resolves`, `rejects`, `toMatchFileSnapshot`) fait échouer le test, et `expect.poll` rejette si son callback ne se stabilise pas avant `timeout`

## Exemples
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
vi.mock('@/lib/auth', () => ({ getUser: () => fakeUser }))

// ❌ vi.mock dans un describe : erreur depuis Vitest 5
describe('getUser', () => {
  vi.mock('@/lib/auth')
})
```

```typescript
// ✅ Matchers : sync, async, erreurs
expect(value).toBe(42)                    // primitive
expect(obj).toEqual({ a: 1 })             // objet
expect(() => fn()).toThrow(/invalid/)     // erreur sync (wrapper arrow)
await expect(asyncFn()).rejects.toThrow() // erreur async, await obligatoire

// ❌ Assertion async non attendue : le test échoue depuis Vitest 5
expect(asyncFn()).rejects.toThrow()
```
