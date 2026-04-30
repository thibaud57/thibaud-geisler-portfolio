---
paths:
  - "next.config.ts"
  - "src/env.ts"
  - "tsconfig.json"
  - ".env*"
---

# Next.js — Configuration & next.config.ts

## À faire
- Typer `next.config.ts` avec `NextConfig` depuis `next` pour l'autocomplétion et la validation au démarrage
- Valider les variables d'environnement au build avec `@t3-oss/env-nextjs` + Zod dans `src/env.ts`, séparer `server` (runtime) et `client` (compile-time)
- Préfixer `NEXT_PUBLIC_*` toute variable exposée au bundle client, sachant qu'elle est inlinée au build et nécessite un rebuild pour changer
- Activer `poweredByHeader: false` pour retirer le header `X-Powered-By: Next.js` en production
- Déclarer `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']` pour que Pino reste côté serveur et ne soit pas bundlé RSC (cf. `pino/logger.md` pour le détail)
- Activer `cacheComponents: true` pour le caching opt-in moderne (Partial Prerendering + directive `'use cache'`, remplace `experimental.ppr` et `experimental.dynamicIO`)
- Configurer `tsconfig.json` pour Next.js 16 + Prisma 7 : `moduleResolution: "bundler"` obligatoire (Turbopack + Prisma 7), `paths: { "@/*": ["./src/*"] }`, `plugins: [{ "name": "next" }]`, `types: ["node", "vitest/globals"]` explicite
- Utiliser `transpilePackages` pour les packages workspace ou node_modules non pré-compilés, pas `next-transpile-modules` communautaire
- Activer `typedRoutes: true` au top-level (plus dans `experimental`) pour la type-safety sur `<Link href>`, `router.push()`, `redirect()`
- Committer `next-env.d.ts` et le référencer dans `tsconfig.json`, ne jamais l'éditer à la main
- Appeler ESLint/Biome directement via `package.json` scripts, `next lint` a été supprimé en Next 16
- Restart `next dev` après toute modification de `next.config.ts` (la config est chargée une seule fois au démarrage)

## À éviter
- Utiliser `serverRuntimeConfig` / `publicRuntimeConfig` : supprimés en Next 16, passer par `process.env`
- Laisser `images.domains` : déprécié Next 16, utiliser `images.remotePatterns` à la place
- Mettre des secrets dans le `.env.production` committé : utiliser Dokploy env vars (ou un vault équivalent)
- Passer des variables serveur (sans `NEXT_PUBLIC_`) en prop à un Client Component

## Gotchas
- Next 16 : `serverComponentsExternalPackages` renommé `serverExternalPackages`, l'ancien nom provoque un warning de dépréciation
- Next 16 : `next lint` supprimé, AMP retiré, `legacyBehavior` sur `<Link>` supprimé
- Pino 10.3.1 + Next 16 : `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']` est **obligatoire** sinon le bundling RSC casse Pino au runtime
- Prisma 7 : `moduleResolution: "bundler"` requis dans `tsconfig.json`, TypeScript 5.4+ minimum
- `cacheComponents: true` remplace `experimental.ppr` (supprimé Next 16) et `experimental.dynamicIO` (renommé)
- `.env.local` n'est pas chargé en `NODE_ENV=test` (reproductibilité des tests en CI)
- Pour la **déclaration des schémas Zod** (niveau module, `z.infer`, validators top-level v4) utilisés comme arguments `server`/`client` de `createEnv` : voir `zod/schemas.md`

## Exemples
```typescript
// ✅ next.config.ts typé (NextConfig depuis 'next')
const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  poweredByHeader: false,
  typedRoutes: true,
  images: { remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com' }] },
}

// ❌ options supprimées Next 16
const nextConfig = {
  serverRuntimeConfig: { ... }, // supprimé
  experimental: { ppr: true }, // remplacé par cacheComponents
  images: { domains: ['...'] }, // déprécié
}
```

```json
// ✅ tsconfig.json — points critiques TypeScript 6 + Next 16 + Prisma 7
{
  "compilerOptions": {
    "target": "es2025",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["node"],
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

```typescript
// ✅ env.ts — validation build-time avec Zod v4 top-level validators (server vs client séparés)
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: { DATABASE_URL: z.url() },
  client: { NEXT_PUBLIC_APP_URL: z.url() },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
```
