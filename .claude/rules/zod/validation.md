---
paths:
  - "src/server/actions/**/*.ts"
  - "src/server/queries/**/*.ts"
  - "src/app/api/**/*.ts"
  - "src/env.ts"
---

# Zod — Validation runtime (safeParse / parse)

## À faire
- Utiliser **`safeParse`** dans les Server Actions et route handlers : retourne `{ success: true, data } | { success: false, error }`, pas besoin de try/catch
- Retourner **`result.error.flatten().fieldErrors`** pour alimenter l'UI formulaire : objet `{ champ: string[] }` directement exploitable par `useActionState`
- Utiliser **`parse`** (pas `safeParse`) pour valider `process.env` au boot : fail-fast, crash au démarrage = signal explicite qu'une env est manquante/invalide
- Typer `process.env` via **`z.infer<typeof EnvSchema>`**, jamais à la main
- Valider **toujours côté serveur** même si une validation client existe déjà : client = feedback UX, serveur = sécurité (seul le serveur est source de vérité)
- `Object.fromEntries(formData)` avant `safeParse` pour convertir un `FormData` en objet plain

## À éviter
- `parse` dans une Server Action : exception non gérée remonte en 500, pas de feedback utilisateur propre
- Typer `process.env` à la main avec `declare namespace NodeJS` : diverge forcément du schéma Zod, perd le fail-fast
- Valider uniquement côté client : contournable via DevTools, ne compte pas comme validation sécurité
- Oublier `z.coerce.number()` pour les `FormData` / env vars : `z.number()` strict refusera les strings brutes

## Gotchas
- `Object.fromEntries(formData)` **perd les champs multi-valeurs** (checkbox multi, input `name="tags[]"`) : utiliser `formData.getAll('key')` explicitement et un schéma avec `z.array()`
- **`safeParseAsync`** obligatoire si le schéma contient un refinement ou un transform asynchrone : sinon erreur runtime "Async refinement encountered in sync mode"
- Pour **Next.js spécifiquement** : utiliser **`@t3-oss/env-nextjs`** + `createEnv` (sépare `server` / `client`, tree-shake les secrets serveur du bundle client) plutôt que `z.parse(process.env)` direct — voir `nextjs/configuration.md`

## Exemples
```typescript
// ✅ Server Action avec safeParse + flatten().fieldErrors
'use server'
import { Schema } from '@/lib/schemas/example'

export async function action(_prev: unknown, formData: FormData) {
  const result = Schema.safeParse(Object.fromEntries(formData))

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  // result.data est typé automatiquement après le narrowing
  await doSomething(result.data)
  return { success: true }
}
```

```typescript
// ✅ Env vars fail-fast avec parse (crash au boot si invalide)
import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  SMTP_PORT: z.coerce.number().int().positive(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
})

export const env = EnvSchema.parse(process.env)
export type Env = z.infer<typeof EnvSchema>
```

```typescript
// ❌ parse dans une Server Action → exception non gérée = 500
'use server'
export async function action(formData: FormData) {
  const data = Schema.parse(Object.fromEntries(formData)) // throw si invalide
  return { data }
}

// ❌ process.env typé à la main — diverge du schéma Zod
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string
    SMTP_PORT: string  // oublie la coercition number
  }
}
```
