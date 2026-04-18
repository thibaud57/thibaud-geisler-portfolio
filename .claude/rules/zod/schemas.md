---
paths:
  - "src/lib/schemas/**/*.ts"
  - "src/lib/env*.ts"
  - "src/server/**/*.ts"
  - "src/app/api/**/*.ts"
---

# Zod — Schémas & Typing

## À faire
- Déclarer les schémas **au niveau module** dans `src/lib/schemas/` (pas à l'intérieur d'une fonction) : partage client/serveur et pas de re-compilation à chaque appel
- Dériver les types via **`z.infer<typeof Schema>`** — JAMAIS dupliquer le type TypeScript à la main à côté du schéma
- Préférer les **validators top-level v4** (`z.email()`, `z.url()`, `z.iso.datetime()`) aux formes chaînées v3 (`z.string().email()`) : plus rapide et tree-shakable
- Utiliser **`z.coerce.number()`** / `z.coerce.boolean()` pour convertir les valeurs brutes `FormData` ou `process.env` (toutes en string à la base)
- `.refine()` pour les validations mono-champ, **`.superRefine()`** pour les validations cross-champs (multi-erreurs via `ctx.addIssue`)
- `.transform()` pour normaliser après validation (trim, lowercase) — distinguer **`z.input<typeof S>`** (avant transform) et **`z.output<typeof S>`** (après, alias de `z.infer`)

## À éviter
- Dupliquer le type TypeScript à la main à côté du schéma : divergence inévitable, toujours passer par `z.infer`
- Utiliser `z.any()` / `z.unknown()` pour contourner la validation : perd la garantie runtime, utiliser un schéma discriminé
- Chaîner `z.string().email()` / `.uuid()` / `.url()` : **déprécié en v4**, les validators top-level sont obligatoires
- Déclarer un schéma à l'intérieur d'un handler ou d'une Server Action : recompilation à chaque appel, et impossible à importer depuis un test unitaire

## Gotchas
- Zod 4 requiert **TypeScript 5.5+** avec **`strict: true`** obligatoire (VERSIONS.md)
- **`z.uuid()` v4 ≠ `z.string().uuid()` v3** : strict RFC 9562, rejette les UUID v3/v5 non conformes. Utiliser **`z.guid()`** pour l'équivalent lâche v3
- Erreurs v4 : `message`, `invalid_type_error`, `required_error` **fusionnés** en un paramètre `error` unique (string ou `(issue) => string`)
- `.strict()` / `.passthrough()` / `.merge()` sur un objet : **dépréciés en v4** → remplacés par `z.strictObject({ ... })`, `z.looseObject({ ... })`, `.extend({ ... })`

## Exemples
```typescript
// ✅ Schéma module + z.infer + validators top-level v4
import { z } from 'zod'

export const Schema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.coerce.number().int().positive(),
  website: z.url().optional(),
})

export type SchemaInput = z.infer<typeof Schema>

// ❌ Type dupliqué à la main (divergence inévitable)
type SchemaInput = {
  name: string
  email: string
  age: number
  website?: string
}
```

```typescript
// ✅ superRefine pour validation cross-champs
const PairSchema = z
  .object({ password: z.string().min(8), confirm: z.string() })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirm) {
      ctx.addIssue({ path: ['confirm'], code: 'custom', message: 'Mismatch' })
    }
  })

// ✅ transform + distinction input/output
const Email = z.email().transform((v) => v.toLowerCase().trim())
type EmailRaw = z.input<typeof Email>    // string brut
type EmailNorm = z.output<typeof Email>  // string normalisée
```

```typescript
// ❌ Formes chaînées v3 dépréciées en v4
const Bad = z.object({
  email: z.string().email(),  // → z.email()
  id: z.string().uuid(),      // → z.uuid() (strict) ou z.guid() (lâche)
  site: z.string().url(),     // → z.url()
})
```
