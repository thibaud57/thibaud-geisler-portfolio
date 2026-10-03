---
paths:
  - "next.config.ts"
  - "src/env.ts"
  - "tsconfig.json"
---

# Next.js — Configuration & next.config.ts

## À faire
- Typer `next.config.ts` avec `NextConfig` depuis `next` pour l'autocomplétion et la validation au démarrage
- Valider les variables d'environnement avec `@t3-oss/env-nextjs` + Zod dans `src/env.ts`, en séparant `server` (runtime) et `client` (inliné au build)
- Préfixer `NEXT_PUBLIC_*` toute variable exposée au bundle client : elle est inlinée au build, un changement exige un rebuild
- Activer `poweredByHeader: false` pour retirer l'en-tête `X-Powered-By: Next.js`
- Déclarer `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']` (détail : `pino/logger.md`)
- Activer `cacheComponents: true` (ce qu'il remplace et ses contraintes : `nextjs/rendering-caching.md`)
- Configurer `tsconfig.json` : `moduleResolution: "bundler"` (Turbopack + Prisma 7), `paths: { "@/*": ["./src/*"] }`, `plugins: [{ "name": "next" }]`, `types` explicites (`["node", "vitest/globals", "react/canary", "react/experimental"]`)
- Utiliser `transpilePackages` pour les packages non pré-compilés, pas `next-transpile-modules`
- Activer `typedRoutes: true` au top-level (plus dans `experimental`) pour typer `<Link href>`, `router.push()`, `redirect()`
- Committer `next-env.d.ts` et le référencer dans `tsconfig.json`, sans jamais l'éditer à la main
- Redémarrer `next dev` après toute modification de `next.config.ts`, chargé une seule fois au démarrage

## À éviter
- `serverRuntimeConfig` / `publicRuntimeConfig` : supprimés en Next 16, passer par `process.env`
- `images.domains` : déprécié en Next 16, utiliser `images.remotePatterns`
- Committer un fichier d'environnement de production : les secrets vivent dans Dokploy
- Passer une variable serveur (sans `NEXT_PUBLIC_`) en prop à un Client Component

## Gotchas
- Next 16 : `serverComponentsExternalPackages` renommé `serverExternalPackages`, l'ancien nom provoque un warning
- Next 16 : `next lint` supprimé (ESLint s'appelle par les scripts de `package.json`), AMP retiré, `legacyBehavior` sur `<Link>` supprimé
- Prisma 7 : `moduleResolution: "bundler"` requis dans `tsconfig.json`, TypeScript 5.4+ minimum
- `.env.local` n'est pas chargé en `NODE_ENV=test` (reproductibilité des tests en CI)
- Déclaration des schémas Zod passés à `createEnv` (`server` / `client`) : voir `zod/schemas.md`

## Exemples
```typescript
// ✅ next.config.ts typé
const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  poweredByHeader: false,
  typedRoutes: true,
}

// ❌ options supprimées ou dépréciées en Next 16
const nextConfig = { serverRuntimeConfig: { ... }, experimental: { ppr: true }, images: { domains: ['...'] } }
```

```typescript
// ✅ env.ts : server et client séparés, validation contournable au build
export const env = createEnv({
  server: { DATABASE_URL: z.url() },
  client: { NEXT_PUBLIC_SITE_URL: z.url() },
  runtimeEnv: { DATABASE_URL: process.env["DATABASE_URL"], NEXT_PUBLIC_SITE_URL: process.env["NEXT_PUBLIC_SITE_URL"] },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env["SKIP_ENV_VALIDATION"],
})
```
