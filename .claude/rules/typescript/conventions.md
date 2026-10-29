---
paths:
  - "src/**/*.{ts,tsx}"
  - "__mocks__/**/*.ts"
  - "scripts/**/*.ts"
  - "*.config.ts"
  - "vitest.setup.ts"
  - "tsconfig.json"
---

# TypeScript : patterns et gotchas v6

## À faire
- Dériver les types de leur source (`typeof` d'une constante, types exportés par Prisma, `z.infer` : cf. `zod/schemas.md`), jamais un type dupliqué à la main à côté
- Importer les types Prisma via **`@/generated/prisma/client`** (Prisma 7, plus `@prisma/client`) et utiliser **`Prisma.<Model>GetPayload<T>`** pour typer un résultat avec relations incluses
- Importer un enum Prisma **en valeur** (`z.enum(TagKind)`, une itération) depuis **`@/generated/prisma/browser`** dès que le module est atteignable côté client : c'est le cas des schémas Zod partagés, que la Server Action et le formulaire consomment tous deux. `@/generated/prisma/client` embarque le runtime Node et ne passe pas dans un bundle navigateur. Un `import type` reste sur `client` quelle que soit la couche : TypeScript l'efface à la compilation, il n'atteint jamais le bundle
- Utiliser l'alias **`@/*`** pour tous les imports : jamais de chemins relatifs de plus de 2 niveaux (`../../../lib/foo` → `@/lib/foo`)
- Exécuter **`tsc --noEmit`** en CI (`just typecheck`) : Turbopack et Vitest gèrent la compilation en dev, `tsc` sert uniquement au type-check

## À éviter
- Activer **`preserveSymlinks: true`** dans `tsconfig.json` : incompatible pnpm, casse la résolution des types

## Gotchas
- TypeScript 6 : **`strict: true`** par défaut (ne pas le forcer à `false`)
- TypeScript 6 : **`module: esnext`** par défaut (plus `commonjs`). Casse les imports CJS existants, migrer les `require()` vers `import`
- TypeScript 6 : **`moduleResolution: node`** (node10) **déprécié** → utiliser `bundler` (Next 16 / Turbopack) ou `nodenext`
- TypeScript 6 : **`types: []`** par défaut (plus d'auto-discovery des `@types/*`). Déclarer explicitement les types utilisés (le projet : `["node", "vitest/globals", "react/canary", "react/experimental"]`)
- TypeScript 6 : `lib: ["dom"]` suffit, `dom.iterable` et `dom.asynciterable` y sont intégrés. **`noUncheckedSideEffectImports`** vaut `true` par défaut (un `import './x.css'` introuvable devient une erreur) et `esModuleInterop: false` est refusé

## Exemples
```typescript
// ✅ Import Prisma v7 + type avec relations
import type { Prisma } from '@/generated/prisma/client'

type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: true }
}>

// ❌ Ancien chemin v6
import type { Prisma } from '@prisma/client'
```
