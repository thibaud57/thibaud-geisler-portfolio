---
paths:
  - "Dockerfile"
  - "next.config.ts"
  - "instrumentation.ts"
  - "src/instrumentation.ts"
  - "src/app/api/health/route.ts"
---

# Next.js — Production & Déploiement

## À faire
- Activer `output: 'standalone'` dans `next.config.ts` pour un bundle Node.js minimal (~80% de réduction d'image Docker)
- Copier manuellement `.next/static` et `public/` dans le stage `runner` du Dockerfile (non inclus dans standalone)
- Lancer le serveur avec `node server.js` en mode standalone (pas `next start`)
- Définir `HOSTNAME="0.0.0.0"` dans le container Docker pour écouter sur toutes les interfaces
- Installer `libc6-compat` via `apk add --no-cache libc6-compat` dans le Dockerfile alpine pour que `sharp` fonctionne
- Activer `optimizePackageImports` pour les barrel files (`lucide-react`, `date-fns`, `@heroicons/react`)
- Créer `instrumentation.ts` à la racine avec `register()` et `onRequestError()` pour bootstrap observabilité (Pino, Sentry, etc.)
- Exposer `GET /api/health` en s'appuyant sur le dynamic par défaut (aucun `export const dynamic` — incompatible avec `cacheComponents: true`) + `Cache-Control: no-cache, no-store, must-revalidate`, exclure du matcher proxy auth
- Valider les variables d'environnement au build via `@t3-oss/env-nextjs` + Zod pour bloquer les builds invalides
- Configurer `proxy_set_header X-Forwarded-Host $host;` côté reverse proxy (Nginx/Caddy) pour les Server Actions
- Configurer un `cacheHandler` custom (Redis) si multi-replicas, sinon le cache filesystem se désynchronise
- Pour le logging applicatif self-hosted (Pino singleton, transports dev/prod, `serverExternalPackages`, child loggers, redact) : voir `pino/logger.md`
- Pour les règles **Docker génériques** du Dockerfile (multi-stage, base image `node:24-alpine`, `corepack enable`, cache layering COPY, `pnpm install --frozen-lockfile`, USER non-root, `.dockerignore`) : voir `docker/dockerfile.md`
- Pour la config **Docker Compose** du service (volumes, healthcheck `pg_isready`, `depends_on: service_healthy`) : voir `docker-compose/compose.md`

## À éviter
- Utiliser `output: 'export'` : pas de Server Actions, ISR, middleware/proxy, Route Handlers Node, image optimization serveur, `cookies()`/`headers()` runtime (incompatible avec ce projet)
- Mettre des secrets dans `Dockerfile`, `.env.production` committé, ou le code source : utiliser les env vars Dokploy
- Utiliser `console.log` en production self-hosted : pas de rotation, pas de niveaux, pas de contexte
- Cacher la réponse de `/api/health` : un CDN qui cache un 200 route du trafic vers une instance morte
- Utiliser `serverRuntimeConfig` / `publicRuntimeConfig` : **supprimés** Next 16, passer par `process.env`

## Gotchas
- Next 16 : Turbopack est le bundler **par défaut en dev ET build**. Pour opt-out (ex: si issue avec un plugin webpack custom), utiliser `next build --webpack`
- **Prisma 7 + Turbopack build** : issue WASM connue (`query_compiler_fast_bg.postgresql.mjs` not found). Workaround : opt-out via `next build --webpack` dans le Dockerfile jusqu'à correction upstream. Surveiller l'état de l'issue Prisma avant chaque upgrade
- Next 15 : `serverComponentsExternalPackages` renommé `serverExternalPackages`, l'ancien nom provoque un warning
- `sharp` auto-installé depuis Next 15 : vérifier sa présence dans les deps de production en self-hosted
- Dokploy build directement sur le serveur, donc pas concerné par l'issue Prisma #29025 (hash mismatch CI séparé du déploiement)
- Codemod automatique disponible : `next upgrade latest` (Next 16.1+) applique les migrations

## Exemples
```typescript
// ✅ instrumentation.ts : register() côté serveur uniquement + onRequestError
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // bootstrap des loggers, tracing, etc.
  }
}
export const onRequestError = async (error, request, context) => { ... }
```

```typescript
// ✅ /api/health : dynamic par défaut (cacheComponents: true = PAS d'export const dynamic) + Cache-Control no-cache
export async function GET() {
  return Response.json({ status: 'ok' }, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  })
}

// ❌ export const dynamic = 'force-dynamic' : incompatible avec cacheComponents: true, throw au build
```
