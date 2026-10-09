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
- Garder `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']` (détail : `pino/logger.md`)
- Activer `cacheComponents: true` et `partialPrefetching: true` (ce qu'ils remplacent et leurs contraintes : `nextjs/rendering-caching.md`)
- Poser `compress: false` derrière un reverse proxy qui compresse déjà : Traefik sert le brotli et ne recompresse pas une réponse qui porte un `Content-Encoding`
- Configurer `tsconfig.json` : `moduleResolution: "bundler"` (Turbopack + Prisma 7), `paths: { "@/*": ["./src/*"] }`, `plugins: [{ "name": "next" }]`, `types` explicites (`["node", "vitest/globals", "react/canary", "react/experimental"]`)
- Utiliser `transpilePackages` pour les packages non pré-compilés, pas `next-transpile-modules`
- Activer `typedRoutes: true` au top-level (plus dans `experimental`) pour typer `<Link href>`, `router.push()`, `redirect()`
- Ignorer `next-env.d.ts` dans Git et le garder dans l'`include` de `tsconfig.json`, sans jamais l'éditer à la main : `next dev`, `next build` et `next typegen` le régénèrent
- Redémarrer `next dev` après toute modification de `next.config.ts`, chargé une seule fois au démarrage

## À éviter
- `serverRuntimeConfig` / `publicRuntimeConfig` : supprimés en Next 16, passer par `process.env`
- `images.domains` : déprécié depuis Next 14, utiliser `images.remotePatterns`
- `baseUrl` dans `tsconfig.json` : TypeScript 7 le refuse. Exprimer les `paths` depuis la racine du projet
- Committer un fichier d'environnement de production : les secrets vivent dans Dokploy
- Passer une variable serveur (sans `NEXT_PUBLIC_`) en prop à un Client Component

## Gotchas
- Next 16 : `serverComponentsExternalPackages` renommé `serverExternalPackages`, l'ancien nom provoque un warning
- Next 16 : `next lint` supprimé (ESLint s'appelle par les scripts de `package.json`), AMP retiré, `legacyBehavior` sur `<Link>` supprimé
- Prisma 7 : `moduleResolution: "bundler"` recommandé par son guide d'upgrade, TypeScript 5.4+ minimum
- **`next build` lance le `tsc` local** depuis Next 16.3 (`experimental.useTypeScriptCli`, actif par défaut) : tout le projet du `tsconfig.json` est vérifié au build, tests compris. C'est aussi ce qui rendra le build compatible avec TypeScript 7
- Next 16.4 affiche des rappels de mise à jour pendant `next dev` et `next build` (`experimental.agentUpgrade`, politique `security` par défaut). Laissés actifs : un rappel ne modifie jamais l'app
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
