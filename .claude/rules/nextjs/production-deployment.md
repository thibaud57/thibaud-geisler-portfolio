---
paths:
  - "Dockerfile"
  - "next.config.ts"
  - "src/instrumentation.ts"
  - "src/app/api/health/route.ts"
---

# Next.js : production et déploiement

## À faire
- Activer `output: 'standalone'` dans `next.config.ts` pour un bundle Node.js minimal
- Copier manuellement `.next/static` et `public/` dans le stage `runner` du Dockerfile (non inclus dans standalone)
- Lancer le serveur avec `node server.js` en mode standalone (pas `next start`)
- Définir `HOSTNAME="0.0.0.0"` dans le container Docker pour écouter sur toutes les interfaces
- Exposer `GET /api/health` exécuté à chaque requête par `await connection()`, avec `Cache-Control: no-cache, no-store, must-revalidate`, exclu du matcher du proxy. Sans lecture runtime, `cacheComponents` le prérend au build (`○` au rapport) et le health check renvoie un fichier figé
- Analyser le bundle par **`next analyze`** (ou `next build --analyze`), branché sur le module graph de Turbopack : `@next/bundle-analyzer` ne sert qu'un build Webpack
- Poser `SKIP_ENV_VALIDATION` au build (validation `@t3-oss/env-nextjs` : `nextjs/configuration.md`) : les secrets serveur n'existent qu'au runtime

## À éviter
- Mettre des secrets dans le `Dockerfile`, un fichier d'environnement committé ou le code source : utiliser les variables Dokploy
- Cacher la réponse de `/api/health` : un cache qui garde un 200 enverrait du trafic vers une instance morte
- Installer `libc6-compat` dans l'image Alpine : `sharp` et les moteurs Prisma publient des binaires musl (image validée sans lui le 9 octobre 2026 : migrations appliquées, AVIF servi par l'optimiseur)

## Gotchas
- Next 16 : Turbopack est le bundler **par défaut en dev ET build**, y compris dans le Dockerfile. L'opt-out `next build --webpack` ne se pose pas sans erreur reproduite : dev et prod cesseraient d'utiliser le même bundler
- **Prisma 7 + Turbopack build** : l'opt-out `--webpack` posé pour une erreur WASM (`query_compiler_fast_bg.postgresql.mjs`) a été **retiré le 3 septembre 2026**, build de l'image revérifié sur Next 16.4.0 le 9 octobre 2026 (`docs/VERSIONS.md` § Prisma ORM). Revalider à chaque montée de Next ou de Prisma
- Le build Docker tourne sur GitHub Actions (`deploy.yml`) sans aucune base : le rendu public ne lit rien au build (ADR-022). Il n'a lieu qu'au tag, un changement du `Dockerfile` se valide donc par un `docker build` local. L'issue Prisma #29025 (hash mismatch) impose la même version Prisma et la même image Node entre build et runtime
- Codemod disponible : `next upgrade` (ou `next upgrade --revision <tag npm>`, Next 16.1+) applique les migrations. Le premier argument positionnel est un dossier, `next upgrade latest` viserait un dossier `latest`
- Logging : `pino/logger.md`. Instrumentation : `sentry/instrumentation.md`. Dockerfile générique : `docker/dockerfile.md`. Compose : `docker-compose/compose.md`. `sharp` sur Alpine : `nextjs/images.md`. En-tête `X-Forwarded-Host` des Server Actions : `nextjs/server-actions-security.md`

## Exemples
```typescript
// ✅ /api/health : connection() le sort du prerender, Cache-Control no-cache
export async function GET() {
  await connection()
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } })
}

// ❌ export const dynamic = 'force-dynamic' : incompatible avec cacheComponents, throw au build
```
