---
title: "TypeScript — Langage typé"
version: "6.0.2"
description: "Référence technique pour TypeScript 6 : tsconfig, inférence, patterns et intégration Next.js."
date: "2026-04-13"
keywords: ["typescript", "types", "tsconfig", "inference"]
scope: ["docs"]
technologies: ["Node.js", "Next.js", "React"]
---

# Description

`TypeScript` 6 est utilisé en mode `strict` pour tout le portfolio. La v6 change les defaults : `strict: true`, `module: esnext`, `target: es2025`, `types: []` (plus de auto-crawl des `@types/*`). Ces changements imposent une config explicite mais accélèrent les builds de 20-50%. Supporte la Temporal API, `using`, et `RegExp.escape` via les libs ES2025.

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
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["node", "vitest/globals"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Points Importants

- `strict: true` est désormais le défaut en v6
- `moduleResolution: bundler` pour Turbopack et Next.js 16
- `types: []` ou liste explicite : plus de auto-crawl (gain de build)
- `paths: { "@/*": ["./src/*"] }` pour les imports courts

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

- `z.infer` : source unique de vérité entre runtime et types
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

Les types générés par Prisma sont disponibles via `@prisma/client`. Combinés avec `z.infer`, ils permettent de typer de bout en bout les données : de la validation Zod (entrée) à la persistance Prisma (sortie).

### Exemple

```ts
import type { Project, Prisma } from '@/generated/prisma/client'
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
- Importer depuis `@/generated/prisma/client` en Prisma 7 (plus `@prisma/client` : le client est généré dans `output` du schema.prisma)
- Partager les schémas Zod entre client et serveur via `src/lib/schemas/`

---

# Commandes Clés

## Initialisation (tsc --init)

### Description

`tsc --init` génère un `tsconfig.json` initial. En v6, les nouveaux défauts sont breaking par rapport à v5 : `strict: true`, `module: esnext`, `target: es2025`, `moduleResolution: bundler`, `types: []`. Dans un projet Next.js 16, `create-next-app` génère déjà un `tsconfig.json` adapté, `tsc --init` sert surtout pour des projets TS purs.

### Syntaxe

```bash
# Générer un tsconfig.json avec les défauts v6
pnpm exec tsc --init

# Pour Next.js, le tsconfig est généré par create-next-app — pas besoin
```

### Points Importants

- **Breaking v6** : nouveaux défauts `strict: true`, `target: es2025`, `module: esnext`, `moduleResolution: bundler`, `types: []`
- `types: []` signifie que `@types/node` doit être déclaré explicitement si besoin (plus d'auto-discovery)
- `moduleResolution: bundler` est aligné avec les attentes de Next.js 16+ et Turbopack
- Pour un projet Next.js, `create-next-app` génère le `tsconfig.json` correct, pas besoin de `tsc --init`
- Pour supprimer les warnings de dépréciation des anciennes options : `"ignoreDeprecations": "6.0"`

---

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

- Activer `strict: true` (désormais le défaut v6)
- Utiliser `moduleResolution: bundler` avec Next.js 16
- Déclarer les alias `@/*` pour éviter les imports relatifs profonds
- Préférer les discriminated unions aux enums
- Dériver les types des schémas Zod via `z.infer`
- Exécuter `tsc --noEmit` en CI

## ❌ Anti-Patterns

- Ne pas utiliser `any` : préférer `unknown` + narrowing
- Ne pas désactiver `strict` sans raison explicite
- Ne pas dupliquer les types à la main si `z.infer` peut les dériver
- Ne pas utiliser `--emit` pour Next.js (le bundler gère)
- Ne pas activer `preserveSymlinks: true` (casse avec pnpm)

---

# 🔗 Ressources

## Documentation Officielle

- [TypeScript : Documentation](https://www.typescriptlang.org/docs/)
- [TypeScript 6.0 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)

## Ressources Complémentaires

- [TypeScript DevBlogs](https://devblogs.microsoft.com/typescript/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)
