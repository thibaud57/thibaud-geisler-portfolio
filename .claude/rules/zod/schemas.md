---
paths:
  - "src/lib/schemas/**/*.ts"
  - "src/env.ts"
  - "src/server/**/*.ts"
  - "src/app/api/**/*.ts"
---

# Zod : schémas et typing

## À faire
- Déclarer les schémas **au niveau module** dans `src/lib/schemas/`, jamais dans un handler ou une Server Action : partage client/serveur, pas de recompilation à chaque appel, importable depuis un test unitaire
- Dériver les types via **`z.infer<typeof Schema>`** : JAMAIS dupliquer le type TypeScript à la main à côté du schéma
- Utiliser **`z.coerce.number()`** pour convertir les nombres bruts de `FormData` ou `process.env` (toutes en string à la base) et **`z.stringbool()`** pour leurs booléens (`"true"`/`"false"`, `"1"`/`"0"`…)
- `.refine()` pour les validations mono-champ, **`.superRefine()`** pour les validations cross-champs (multi-erreurs via `ctx.addIssue`)
- `.transform()` pour normaliser après validation (trim, lowercase) : distinguer **`z.input<typeof S>`** (avant transform) et **`z.output<typeof S>`** (après, alias de `z.infer`)

## À éviter
- Utiliser `z.any()` / `z.unknown()` pour contourner la validation : perd la garantie runtime, utiliser un schéma discriminé
- `z.coerce.boolean()` sur une chaîne : c'est `Boolean(input)`, donc `"false"` et `"0"` donnent `true`

## Gotchas
- **`z.uuid()` v4 ≠ `z.string().uuid()` v3** : strict RFC 9562, rejette les UUID v3/v5 non conformes. Utiliser **`z.guid()`** pour l'équivalent lâche v3
- Erreurs v4 : `message`, `invalid_type_error`, `required_error` **fusionnés** en un paramètre `error` unique (string ou `(issue) => string`)
- **`z.coerce.number()` accepte un champ vide** : `Number("")` vaut `0`, donc un input numérique vidé dans un `FormData` passe la validation avec la valeur `0`. Pour un champ requis, contrôler la chaîne avant de convertir : `z.string().trim().min(1, '…').pipe(z.coerce.number<string>())`
- **`.pipe()` derrière une chaîne exige `z.coerce.number<string>()`** : l'entrée d'un schéma coercé est typée `unknown`, que `.pipe()` refuse en `TS2345` après un `z.string()`. Le générique aligne le type d'entrée (constaté sur Zod 4.5.4 le 2026-09-17)
- `.strict()` reste disponible mais legacy → `z.strictObject({ ... })`

## Exemples
```typescript
// ✅ Schéma module + z.infer + validators top-level v4
export const Schema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.coerce.number().int().positive(),
})

export type SchemaInput = z.infer<typeof Schema>

// ❌ Type dupliqué à la main (divergence inévitable)
type SchemaInput = { name: string; email: string; age: number }
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
```
