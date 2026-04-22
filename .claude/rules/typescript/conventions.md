---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "prisma/**/*.ts"
  - "__mocks__/**/*.ts"
  - "*.config.ts"
  - "vitest.setup.ts"
  - "tsconfig.json"
---

# TypeScript — Patterns & Gotchas v6

## À faire
- Dériver les types via **`z.infer<typeof Schema>`** (Zod) ou **`typeof`** (constantes) — source unique de vérité entre runtime et types
- Préférer les **discriminated unions** aux enums : narrowing automatique via `switch`/`if` sur la propriété discriminante (`status`, `kind`, `type`), pattern utilisé par `safeParse` Zod (`{ success, data } | { success: false, error }`)
- Importer les types Prisma via **`@/generated/prisma/client`** (Prisma 7, plus `@prisma/client`) et utiliser **`Prisma.ModelGetPayload<T>`** pour typer un résultat avec relations incluses
- Utiliser l'alias **`@/*`** pour tous les imports : jamais de chemins relatifs de plus de 2 niveaux (`../../../lib/foo` → `@/lib/foo`)
- Narrowing via **`unknown` + `typeof`/`in`/discriminant check** plutôt que `any` : préserve la type-safety tout en acceptant des entrées runtime inconnues
- Exécuter **`tsc --noEmit`** en CI et pre-commit : Turbopack et Vitest gèrent la compilation en dev, `tsc` sert uniquement au type-check

## À éviter
- Utiliser **`any`** pour contourner le typage : toujours `unknown` + narrowing (préserve la type-safety)
- Dupliquer les types TypeScript à la main à côté d'un schéma Zod ou d'un modèle Prisma : utiliser `z.infer` ou les types exportés Prisma
- Utiliser **`tsc --emit`** pour un projet Next.js : le bundler (Turbopack) gère la compilation, `tsc` sert uniquement au type-check (`--noEmit`)
- Chemins d'import **relatifs profonds** (`../../../lib/foo`) : utiliser l'alias `@/*`
- Activer **`preserveSymlinks: true`** dans `tsconfig.json` : incompatible pnpm, casse la résolution des types

## Gotchas
- TypeScript 6 : **`strict: true`** par défaut (ne pas le forcer à `false`)
- TypeScript 6 : **`module: esnext`** par défaut (plus `commonjs`) — casse les imports CJS existants, migrer les `require()` vers `import`
- TypeScript 6 : **`moduleResolution: node`** (node10) **déprécié** → utiliser `bundler` (Next 16 / Turbopack) ou `nodenext`
- TypeScript 6 : **`types: []`** par défaut (plus d'auto-discovery des `@types/*`) — déclarer explicitement les types utilisés (ex: `["node", "vitest/globals"]`)

## Exemples
```typescript
// ✅ z.infer comme source unique de vérité
const Schema = z.object({ id: z.string(), email: z.email() })
type Input = z.infer<typeof Schema>  // { id: string; email: string }

// ❌ Type dupliqué à la main → divergence inévitable
type Input = { id: string; email: string }
```

```typescript
// ✅ Discriminated union + narrowing automatique via switch
type Result<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }
  | { status: 'loading' }

function handle<T>(result: Result<T>) {
  switch (result.status) {
    case 'success': return result.data     // typé T
    case 'error': return result.message    // typé string
    case 'loading': return 'Chargement...'
  }
}
```

```typescript
// ✅ Import Prisma v7 + type avec relations
import type { Prisma } from '@/generated/prisma/client'

type ModelWithRelations = Prisma.ModelGetPayload<{
  include: { relation: true }
}>
```
