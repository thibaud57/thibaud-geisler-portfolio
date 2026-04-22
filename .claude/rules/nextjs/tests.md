---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
---

# Next.js — Tests (specifics Next.js)

## À faire
- Mocker **`next/navigation`** (`useRouter`, `usePathname`, `useSearchParams`, `redirect`) via `vi.mock()` — non disponibles en jsdom
- Mocker **`next/cache`** (`revalidateTag`, `revalidatePath`) pour tester les Server Actions en isolation
- Mocker **`next/image`** : contrairement à `next/jest`, Vitest + jsdom ne résout pas les imports d'images dynamiques (cause `SyntaxError`) — soit `vi.mock('next/image')` retournant un `<img>` simple, soit un plugin Vite qui transforme les fichiers image
- Pour les **Server Components asynchrones** (non testables dans Vitest/jsdom) : extraire le data fetching dans une fonction pure testable + tester le composant de présentation en lui passant les données en props
- Pour les **Server Actions** : tester la logique métier en isolant la fonction pure (validation Zod, transformation de données), mocker `next/cache` et `next/navigation`
- Utiliser des **factory functions** (`createUser(overrides?)`) pour les fixtures plutôt que des constantes partagées (évite la mutation accidentelle entre tests)
- Pour les **tests de composants React** (Testing Library, `getByRole`, `userEvent`, `screen`) : voir `vitest/components.md`

## À éviter
- Tester un **Server Component async** dans Vitest : jsdom ne fournit pas le runtime serveur React, passer en E2E (Playwright) ou refactor en composant de présentation pur
- **Mocker Prisma** au lieu d'utiliser une DB de test pour les tests d'intégration : les mocks divergent du schéma réel et masquent les régressions de migration
- Utiliser `useFormState` de `react-dom` dans les tests : **déprécié** R19, utiliser `useActionState` de `react`

## Gotchas
- **SMTP doit toujours être mocké** dans les tests d'intégration (les appels nodemailer ne sont jamais réels) — voir `nodemailer/email.md` pour le pattern de mock du transporter
- **Tests E2E (Playwright)** : non prévus pour le MVP, à ajouter post-MVP si le dashboard devient complexe

## Exemples
```typescript
// ✅ Mock next/navigation pour tester un Client Component
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))
```

```typescript
// ✅ Tester une Server Action en isolation : mocker next/cache et next/navigation
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

test('submitForm valide et redirige', async () => {
  const { redirect } = await import('next/navigation')
  await submitForm({}, new FormData())
  expect(redirect).toHaveBeenCalled()
})
```

```typescript
// ✅ Factory function pour fixtures (évite la mutation partagée)
function createUser(overrides?: Partial<User>): User {
  return { id: '1', name: 'Test', email: 'a@b.c', ...overrides }
}

// ❌ Constante partagée : mutation dans un test pollue les autres
const user = { id: '1', name: 'Test' } // dangereux
```
