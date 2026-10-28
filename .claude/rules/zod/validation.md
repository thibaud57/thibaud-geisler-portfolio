---
paths:
  - "src/server/actions/**/*.ts"
  - "src/server/queries/**/*.ts"
  - "src/app/api/**/*.ts"
  - "src/env.ts"
---

# Zod : validation runtime (safeParse / parse)

## À faire
- Utiliser **`safeParse`** dans les Server Actions et route handlers : retourne `{ success: true, data } | { success: false, error }`, pas besoin de try/catch
- Retourner **`z.flattenError(result.error).fieldErrors`** pour alimenter l'UI formulaire : objet `{ champ: string[] }` directement exploitable par `useActionState` (forme en usage dans `src/server/actions/contact.ts` et `tags.ts`)
- Valider **toujours côté serveur** même si une validation client existe déjà : client = feedback UX, serveur = sécurité, une action exportée étant un endpoint public
- `Object.fromEntries(formData)` avant `safeParse` pour convertir un `FormData` en objet plain
- Typer `process.env` par le schéma de `createEnv` (`src/env.ts`, cf. `nextjs/configuration.md`), jamais à la main

## À éviter
- `parse` dans une Server Action : exception non gérée remonte en 500, pas de feedback utilisateur propre
- Typer `process.env` à la main avec `declare namespace NodeJS` : diverge forcément du schéma Zod, perd le fail-fast

## Gotchas
- `Object.fromEntries(formData)` **perd les champs multi-valeurs** (checkbox multi, input `name="tags[]"`) : utiliser `formData.getAll('key')` explicitement et un schéma avec `z.array()`
- **`safeParseAsync`** obligatoire si le schéma contient un refinement ou un transform asynchrone : sinon erreur runtime « Encountered Promise during synchronous parse. Use .parseAsync() instead. »

## Exemples
```typescript
// ✅ Server Action avec safeParse + z.flattenError
export async function action(_prev: unknown, formData: FormData) {
  const result = Schema.safeParse(Object.fromEntries(formData))

  if (!result.success) {
    return { errors: z.flattenError(result.error).fieldErrors }
  }

  await doSomething(result.data)
  return { success: true }
}

// ❌ parse dans une Server Action : exception non gérée = 500
export async function action(formData: FormData) {
  const data = Schema.parse(Object.fromEntries(formData)) // throw si invalide
  return { data }
}
```
