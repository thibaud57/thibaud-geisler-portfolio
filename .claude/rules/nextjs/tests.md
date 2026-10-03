---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
---

# Next.js — Tests (spécificités Next.js)

## À faire
- Mocker **`next/navigation`** (`useRouter`, `usePathname`, `useSearchParams`, `redirect`) via `vi.mock()` : non disponibles en jsdom
- Mocker **`next/cache`** (`revalidateTag`, `revalidatePath`, `updateTag`) pour tester les Server Actions en isolation
- Mocker **`next/image`** : Vitest + jsdom ne résout pas les imports d'images (`SyntaxError`), `vi.mock('next/image')` retourne un `<img>` simple
- Pour un **Server Component async** (non testable dans Vitest/jsdom) : extraire le data fetching dans une fonction testable et tester le composant de présentation en lui passant les données en props
- Pour une **Server Action** : tester la logique (validation Zod, transformation), en mockant `next/cache` et `next/navigation`
- Construire les fixtures par **factory functions** (`createUser(overrides?)`) plutôt que des constantes partagées, qu'un test pourrait muter
- Tests de composants (Testing Library, `getByRole`, `userEvent`) : voir `vitest/components.md`

## À éviter
- **Mocker Prisma** dans un test d'intégration au lieu d'utiliser la base de test : le mock diverge du schéma réel et masque les régressions de migration

## Gotchas
- **SMTP toujours mocké** dans les tests d'intégration : voir `nodemailer/sending.md`
- **Tests E2E (Playwright)** : non prévus pour le MVP

## Exemples
```typescript
// ✅ Server Action testée en isolation : next/cache et next/navigation mockés
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

test('redirects after a valid submission', async () => {
  const { redirect } = await import('next/navigation')

  await submitForm({}, validFormData())

  expect(redirect).toHaveBeenCalled()
})

// ❌ Constante partagée : un test qui la mute pollue les suivants
const user = { id: '1', name: 'Test' }
```
