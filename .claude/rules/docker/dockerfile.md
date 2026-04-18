---
paths:
  - "Dockerfile"
  - "Dockerfile.*"
  - ".dockerignore"
---

# Docker — Dockerfile (multi-stage, cache, base image)

## À faire
- Utiliser un **Dockerfile multi-stage** avec stages nommés via `AS <name>` (ex: `deps → builder → runner`) pour isoler toolchain/devDeps du runtime image
- Image de base **`node:24-alpine`** (Node 20 EOL 30 avril 2026, Alpine pour poids minimum)
- Activer pnpm via **`corepack enable`** dans le stage `deps` — pas `npm install -g pnpm` (corepack est la voie officielle depuis Node 16.10+)
- Copier **`package.json`** et **`pnpm-lock.yaml`** AVANT le code source dans le stage `deps` pour maximiser le cache de layers Docker
- **`pnpm install --frozen-lockfile`** pour garantir la reproductibilité du build (échoue si lockfile désynchronisé)
- Exploiter le **cache BuildKit** pour le store pnpm : `RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile` — évite de retélécharger les dépendances à chaque rebuild (BuildKit activé par défaut Docker 23+, cache persisté sur le VPS entre rebuilds Dokploy)
- Créer un **utilisateur non-root** dédié (`addgroup` + `adduser`) et l'activer via `USER` dans le stage final `runner`
- Maintenir un **`.dockerignore`** à la racine excluant au minimum `node_modules`, `.next`, `.git`, `.env*`, `README.md` pour réduire le build context
- Pour les règles **Next.js spécifiques** au conteneur (`output: standalone`, `HOSTNAME`, `libc6-compat` pour sharp, `/api/health`, `instrumentation.ts`) : voir `nextjs/production-deployment.md`

## À éviter
- `COPY . .` avant l'installation des dépendances : invalide le cache de layers à chaque modification de code
- Épingler le tag **`latest`** pour l'image de base en production : non reproductible, un rebuild peut casser sans changement code
- Lancer le stage final en **root** : risque de sécurité, toujours un USER non-root dédié
- Copier `node_modules` depuis l'hôte via le build context : toujours réinstaller dans le build pour des binaires natifs corrects (cross-arch Alpine vs host)

## Gotchas
- **Node 20 EOL 30 avril 2026** : `node:24-alpine` non négociable pour tout nouveau build, ne pas utiliser `node:20-*` (VERSIONS.md)
- **Docker Engine 29 ulimit nofile** : valeur par défaut tombée à 1024 (depuis 1048576). Ajuster côté `daemon.json` ou compose si le service a beaucoup de connexions — pas dans le Dockerfile (voir `docker-compose/compose.md`)

## Exemples
```dockerfile
# ✅ Dockerfile multi-stage : deps → builder → runner non-root
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm run build

FROM node:24-alpine AS runner
WORKDIR /app
RUN addgroup -S app && adduser -S -G app appuser
COPY --from=builder --chown=appuser:app /app/dist ./
USER appuser
CMD ["node", "server.js"]
```

```dockerfile
# ❌ COPY . . avant install → cache invalidé à chaque commit
FROM node:24-alpine AS deps
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
```
