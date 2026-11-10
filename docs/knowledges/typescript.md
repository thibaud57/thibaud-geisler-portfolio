---
title: "TypeScript : Langage typé"
version: "6.0.3"
description: "Référence technique pour TypeScript 6 : tsconfig, inférence, patterns et intégration Next.js."
date: "2026-11-10"
keywords: ["typescript", "types", "tsconfig", "inference"]
scope: ["docs"]
technologies: ["Node.js", "Next.js", "React"]
---

# Description

`TypeScript` 6 est utilisé en mode `strict` pour tout le portfolio. La v6 change les defaults : `strict: true`, `module: esnext`, `target: es2025`, `types: []` (plus de auto-crawl des `@types/*`). Ces changements imposent une config explicite, qui accélère les builds : « Many projects we've looked at have improved their build time anywhere from 20-50% just by setting `types` appropriately » ([annonce TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/), relevé non garanti). Supporte la Temporal API, `using`, et `RegExp.escape` via les libs ES2025.

---

# Concepts Clés

## tsconfig.json recommandé

### Description

Configuration adaptée à Next.js 16 + React 19 + Prisma. Mode strict obligatoire, moduleResolution `bundler` pour la compatibilité avec Turbopack, paths aliases pour les imports propres.

### Exemple

```json
{
  "compilerOptions": {
    "target": "es2025",
    "lib": ["dom", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "types": ["node", "vitest/globals", "react/canary", "react/experimental"],
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts", "**/*.mts"],
  "exclude": ["node_modules", ".claude", ".design-sync"]
}
```

### Points Importants

- `strict: true` est le défaut en v6
- Cinq options strictes en plus de `strict` : `noUncheckedIndexedAccess` (un accès indexé peut valoir `undefined`), `noImplicitOverride`, `noPropertyAccessFromIndexSignature` (d'où `process.env["X"]` plutôt que `process.env.X`), `noImplicitReturns`, `noFallthroughCasesInSwitch`
- `jsx: "react-jsx"` et non le `preserve` du template Next : le bundler transforme dans les deux cas, la valeur ne joue que sur ce que vérifie `tsc --noEmit`
- `react/canary` et `react/experimental` dans `types` exposent les API React pas encore dans les types stables
- `moduleResolution: bundler` pour Turbopack et Next.js 16
- `types: []` ou liste explicite : plus de auto-crawl (gain de build)
- `paths: { "@/*": ["./src/*"] }` pour les imports courts
- TypeScript 7.0.2 (`latest` npm au 2026-11-10) reste écarté : `typescript-eslint@8.72.2`, la dernière stable, déclare `typescript >=4.8.4 <6.1.0` en peer (relevé sur le registre npm le 2026-11-10), `tsc --noEmit` passe mais `eslint` casse au chargement de la config (`docs/VERSIONS.md` § Montées Bloquées)
- TypeScript 7 refuse `baseUrl` : le projet n'en pose pas, les alias passent par `paths` seuls (`docs/VERSIONS.md`)

---

## Inférence et type utilities

### Description

TypeScript infère les types des retours de fonctions, des littéraux d'objet et des arrays. Utiliser `z.infer` pour extraire un type d'un schéma Zod, `typeof` pour capturer le type d'une valeur, `keyof` et `Pick` pour dériver des types.

### Exemple

```ts
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string(),
  email: z.email(),
  role: z.enum(['admin', 'user']),
})

type User = z.infer<typeof UserSchema>
// { id: string; email: string; role: 'admin' | 'user' }

type UserEmail = User['email']           // string
type UserKeys = keyof User               // 'id' | 'email' | 'role'
type UserPreview = Pick<User, 'id' | 'email'>
type UserWithoutRole = Omit<User, 'role'>
```

### Points Importants

- `z.infer` pour dériver un type d'un schéma : voir [zod.md](zod.md)
- `typeof` pour capturer le type d'une constante
- `Pick`, `Omit`, `Partial`, `Required` pour dériver des types
- Éviter `any` : utiliser `unknown` puis narrowing

---

## Discriminated unions

### Description

Pattern clé pour modéliser des états mutuellement exclusifs avec une propriété discriminante (`status`, `type`, `kind`). TypeScript narrow automatiquement selon la discriminante. Préféré aux enums dans les codebases modernes.

### Exemple

```ts
type Result<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }
  | { status: 'loading' }

function render<T>(result: Result<T>) {
  switch (result.status) {
    case 'success':
      return result.data       // typé T
    case 'error':
      return result.message    // typé string
    case 'loading':
      return 'Chargement...'
  }
}
```

### Points Importants

- Discriminante commune dans tous les variants (`status` ici)
- Narrowing automatique via `switch` ou `if`
- Préféré aux enums (moins de duplication, meilleure inférence)
- Pattern utilisé dans les résultats `safeParse` de Zod

---

## Path aliases avec @/*

### Description

Les alias d'imports rendent le code plus lisible et facilitent les refactors. Configurés dans `tsconfig.json` (`paths`), respectés par Next.js, Vitest, Prisma et les éditeurs.

### Exemple

```ts
// ❌ Sans alias
import { prisma } from '../../../lib/prisma'
import { logger } from '../../../lib/logger'

// ✅ Avec alias
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
```

### Points Importants

- Déclarer dans `tsconfig.json` → `compilerOptions.paths`
- `baseUrl` n'est plus nécessaire en v6 (intégrer le préfixe dans `paths`)
- Next.js respecte automatiquement les alias du tsconfig
- Éviter les chemins relatifs de plus de 2 niveaux

---

## Types Zod et inférence Prisma

### Description

Les types générés par Prisma sont disponibles depuis le dossier `output` du générateur du `schema.prisma`. Combinés avec `z.infer`, ils permettent de typer de bout en bout les données : de la validation Zod (entrée) à la persistance Prisma (sortie).

### Exemple

```ts
import type { Project, Prisma } from './generated/prisma/client' // chemin = `output` du générateur
import { z } from 'zod'

export const CreateProjectSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string(),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>

// Type de retour Prisma avec relations
type ProjectWithAssets = Prisma.ProjectGetPayload<{
  include: { assets: true }
}>
```

### Points Importants

- `Project` : type de base du modèle (champs scalaires)
- `Prisma.ProjectGetPayload<T>` : type avec relations incluses
- `Prisma.ProjectCreateInput` : type attendu par `prisma.project.create`
- Importer depuis le chemin `output` du générateur en Prisma 7 (plus `@prisma/client` : le client est généré dans `output` du schema.prisma)

---

# Commandes Clés

## Type-check sans émission

### Description

Le compilateur `tsc` sert surtout à la vérification des types en CI (`--noEmit`). En dev, Turbopack gère la compilation Next.js. Vitest gère ses propres types. Donc `tsc` ne doit **jamais** émettre de JS dans un projet Next.js.

### Syntaxe

```bash
# Vérification de types sans émission (CI, pre-commit)
pnpm exec tsc --noEmit

# Vérification en continu pendant dev
pnpm exec tsc --noEmit --watch

# Vérification d'un fichier unique en ignorant le tsconfig (nouveau v6)
pnpm exec tsc --ignoreConfig foo.ts
```

### Points Importants

- Toujours utiliser `--noEmit` : Turbopack et Vitest gèrent leur propre pipeline
- Utiliser `tsc --noEmit` en CI et dans un pre-commit hook
- Combiner avec `vitest run` pour un check complet
- **Nouveau v6** : `--ignoreConfig` est requis pour compiler un fichier unique en présence d'un `tsconfig.json` (sinon erreur)
- Les erreurs TypeScript n'apparaissent pas toutes à l'exécution dev (importance du check CI)

---

# Bonnes Pratiques

## ✅ Recommandations

- Dériver les types des schémas Zod (voir [zod.md](zod.md))
- Lancer `tsc --noEmit` en CI, précédé de `next typegen` avec Next : les types de routes (`PageProps`, `LayoutProps`, `RouteContext`) en dépendent

## ❌ Anti-Patterns

- Ne pas activer `preserveSymlinks: true` (casse avec pnpm)

---

# 🔗 Ressources

## Documentation Officielle

- [TypeScript : Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript 6.0 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
- [Annonce TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)

## Ressources Complémentaires

- [TypeScript DevBlogs](https://devblogs.microsoft.com/typescript/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)
