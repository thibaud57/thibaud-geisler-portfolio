---
paths:
  - "Dockerfile"
  - "next.config.ts"
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
- Déclarer `src/instrumentation.ts` avec `register()` et `onRequestError()` pour amorcer l'observabilité (Pino, Sentry)
- Exposer `GET /api/health` sur le dynamique par défaut (aucun `export const dynamic`, incompatible avec `cacheComponents: true`) avec `Cache-Control: no-cache, no-store, must-revalidate`, exclu du matcher du proxy
- Valider les variables d'environnement via `@t3-oss/env-nextjs` + Zod, avec `SKIP_ENV_VALIDATION` au build : les secrets serveur n'existent qu'au runtime
- Configurer un `cacheHandler` custom (Redis) si l'app passe en multi-replicas : le cache filesystem se désynchroniserait entre instances

## À éviter
- Utiliser `output: 'export'` : ni Server Actions, ni proxy, ni Route Handlers Node, ni `cookies()`/`headers()` runtime
- Mettre des secrets dans le `Dockerfile`, un fichier d'environnement committé ou le code source : utiliser les variables Dokploy
- Utiliser `console.log` en production self-hosted : ni rotation, ni niveaux, ni contexte
- Cacher la réponse de `/api/health` : un cache qui garde un 200 enverrait du trafic vers une instance morte

## Gotchas
- Next 16 : Turbopack est le bundler **par défaut en dev ET build**, y compris dans le Dockerfile. L'opt-out `next build --webpack` ne se pose pas sans erreur reproduite : dev et prod cesseraient d'utiliser le même bundler
- **Prisma 7 + Turbopack build** : l'opt-out `--webpack` posé pour une erreur WASM (`query_compiler_fast_bg.postgresql.mjs`) a été **retiré le 3 septembre 2026**, build de l'image revérifié sur Next 16.3.6 le 3 octobre 2026 (`docs/VERSIONS.md` § Prisma ORM). Revalider à chaque montée de Next ou de Prisma
- `sharp` est auto-installé depuis Next 15 : vérifier sa présence dans les deps de production en self-hosted
- Le build Docker tourne sur GitHub Actions (`deploy.yml`) sans aucune base : le rendu public ne lit rien au build (ADR-022). Il n'a lieu qu'au tag, un changement du `Dockerfile` se valide donc par un `docker build` local. L'issue Prisma #29025 (hash mismatch) impose la même version Prisma et la même image Node entre build et runtime
- Codemod disponible : `next upgrade latest` (Next 16.1+) applique les migrations
- Logging : `pino/logger.md`. Dockerfile générique : `docker/dockerfile.md`. Compose : `docker-compose/compose.md`. En-tête `X-Forwarded-Host` des Server Actions : `nextjs/server-actions-security.md`

## Exemples
```typescript
// ✅ /api/health : dynamique par défaut + Cache-Control no-cache
export async function GET() {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } })
}

// ❌ export const dynamic = 'force-dynamic' : incompatible avec cacheComponents, throw au build
```
