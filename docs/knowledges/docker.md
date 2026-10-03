---
title: "Docker Engine — Conteneurisation"
version: "29.8.0"
description: "Référence technique pour Docker Engine 29 : Dockerfile multi-stage, volumes, networks."
date: "2026-04-13"
keywords: ["docker", "container", "dockerfile", "multistage", "volumes"]
scope: ["docs"]
technologies: ["Node.js", "Next.js", "PostgreSQL", "Dokploy"]
---

# Description

`Docker Engine` 29 est utilisé pour conteneuriser les services du portfolio (Next.js, PostgreSQL) sur le VPS IONOS via Dokploy. La v29 active le containerd image store par défaut sur les fresh installs, réduit le ulimit nofile par défaut de 1048576 à 1024 (attention aux workloads avec nombreuses connexions), et supporte nftables comme backend firewall expérimental.

---

# Concepts Clés

## Dockerfile multi-stage

### Description

Pattern fondamental pour réduire la taille des images de production : séparer les dépendances de build (toolchain, devDependencies) des dépendances runtime. Le `Dockerfile` du portfolio compte cinq stages : `base` (Node 24 alpine, corepack), `deps` (install complet et génération du client Prisma), `builder` (build Next.js standalone), `deploy-prisma` (dépendances de production à plat pour la CLI Prisma) et `runner` (image finale).

### Exemple

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

FROM base AS builder
ENV SKIP_ENV_VALIDATION=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /app/src/generated ./src/generated
RUN --mount=type=secret,id=sentry_auth_token \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token 2>/dev/null || true)" pnpm exec next build

FROM base AS deploy-prisma
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm deploy --legacy --prod --filter=. /prod

FROM base AS runner
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=deploy-prisma --chown=nextjs:nodejs /prod/node_modules ./node_modules
USER nextjs
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
```

### Points Importants

- Nommer les stages avec `AS <name>` pour éviter les erreurs de réordonnancement
- `output: 'standalone'` dans `next.config.ts` produit le runtime minimal copié dans `runner`
- `pnpm deploy --legacy --prod` sort un `node_modules` sans les liens symboliques `.pnpm` : c'est ce qui permet à la CLI Prisma de lancer `migrate deploy` au démarrage du conteneur
- Le token Sentry passe par un secret BuildKit (`--mount=type=secret`), jamais par un `ARG` qui resterait dans une couche de l'image
- `SKIP_ENV_VALIDATION=true` au build : les secrets serveur n'existent qu'au runtime, injectés par Dokploy. Les `NEXT_PUBLIC_*` arrivent par `ARG`, sinon ils seraient `undefined` dans le bundle
- Utilisateur non-root (`USER nextjs`), et `npm`/`npx` retirés de l'image finale : jamais exécutés au runtime, ils sortent leurs dépendances des alertes Trivy

---

## Optimisation du cache de layers

### Description

Docker cache chaque instruction du Dockerfile. Ordonner du moins fréquemment modifié au plus fréquemment modifié maximise la réutilisation du cache. Les changements de code source invalident toutes les instructions suivantes, d'où l'importance de copier `package.json` avant le code.

### Exemple

```dockerfile
# ❌ Mauvais : COPY . . invalide le cache à chaque changement
FROM node:24-alpine
WORKDIR /app
COPY . .
RUN pnpm install

# ✅ Bon : les dépendances ne sont réinstallées que si package.json change
FROM node:24-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
```

### Points Importants

- COPY `package.json` + `pnpm-lock.yaml` AVANT le code source
- Combiner `apt-get update && apt-get install` dans le même `RUN`
- Utiliser `--frozen-lockfile` pour la reproductibilité
- `.dockerignore` pour exclure `node_modules`, `.next`, `.git`

---

## Volumes et bind mounts

### Description

Trois types de stockage : volumes nommés (gérés par Docker, portables), bind mounts (répertoire hôte monté, dev), tmpfs (mémoire, temporaire). Pour les données persistantes (PostgreSQL), préférer les volumes nommés. Préférer la syntaxe `--mount` à `-v` pour la clarté.

### Exemple

```bash
# Volume nommé pour PostgreSQL
docker run -d \
  --name postgres \
  --mount type=volume,src=pgdata,dst=/var/lib/postgresql \
  -e POSTGRES_PASSWORD=secret \
  postgres:18

# Bind mount pour le dev local (hot reload)
docker run -d \
  --mount type=bind,src=$(pwd),dst=/app \
  -p 3000:3000 \
  node:24-alpine

# tmpfs pour les données temporaires
docker run --tmpfs /tmp ...
```

### Points Importants

- `type=volume` : géré par Docker, portable entre hôtes
- `type=bind` : monte un répertoire hôte, utile en dev
- `type=tmpfs` : stocké en mémoire, nettoyé au stop
- `--mount` syntaxe explicite préférée à `-v` (détection d'erreurs)

---

## Networks custom bridge

### Description

Créer un réseau bridge dédié par stack applicative pour isoler les conteneurs et permettre la résolution DNS par nom de conteneur. Le réseau `bridge` par défaut de Docker ne supporte pas la résolution de nom, toujours créer un réseau custom.

### Exemple

```bash
# Créer un réseau custom
docker network create portfolio-net

# Lancer les services sur ce réseau
docker run -d --name postgres --network portfolio-net postgres:18
docker run -d --name nextjs --network portfolio-net -p 3000:3000 portfolio-app

# Depuis nextjs, PostgreSQL est accessible via "postgres:5432"
```

### Points Importants

- Toujours utiliser un réseau bridge custom (pas le bridge par défaut)
- Résolution DNS automatique par nom de conteneur
- Isolation par stack : une app = un réseau
- En Dokploy : le réseau `dokploy-network` est utilisé automatiquement

---

## ulimit nofile v29

### Description

Docker Engine 29 réduit le ulimit nofile par défaut de 1048576 à 1024 (valeur du host systemd). Critique pour Node.js avec nombreuses connexions et PostgreSQL. Nécessite une configuration explicite via `daemon.json`, `docker run --ulimit` ou Docker Compose.

### Exemple

```yaml
# docker-compose.yml
services:
  app:
    image: portfolio:latest
    ulimits:
      nofile:
        soft: 65535
        hard: 65535
```

```json
// /etc/docker/daemon.json (config globale)
{
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Soft": 65535,
      "Hard": 65535
    }
  }
}
```

### Points Importants

- Changement silencieux en v29, aucun warning
- Ajuster dans `daemon.json` pour l'ensemble de l'hôte
- Override par conteneur via `--ulimit` ou `ulimits:` dans Compose
- PostgreSQL et Node.js peuvent hit la limite sans configuration explicite
- Le projet ne déclare aucun `ulimits` dans `compose.yaml` ni `compose.override.yaml`, et la valeur du `daemon.json` du VPS n'est pas relevée ici : à vérifier si une erreur `EMFILE` (too many open files) apparaît

---

# Commandes Clés

## Build, run, logs, ps

### Description

Les commandes courantes pour construire une image, démarrer un conteneur, consulter les logs et lister les conteneurs. La plupart du temps dans le portfolio, ces opérations passent par Dokploy ou Docker Compose, mais utiles en débogage direct sur le VPS.

### Syntaxe

```bash
# Build
docker build -t portfolio:latest .
docker buildx build --target production -t portfolio:v1 .

# Run
docker run -d --name portfolio -p 3000:3000 --restart unless-stopped portfolio:latest

# Logs
docker logs -f --tail 100 portfolio
docker logs --since 1h portfolio

# Liste
docker ps                # conteneurs en cours
docker ps -a             # tous les conteneurs
docker images            # images locales

# Exec et debug
docker exec -it portfolio sh
docker inspect portfolio
```

### Points Importants

- `docker buildx build` pour les fonctionnalités BuildKit avancées (secrets, cache)
- `--restart unless-stopped` pour la résilience en prod
- `docker logs -f` pour le streaming en temps réel
- `docker exec -it` pour un shell interactif dans un conteneur

---

# Bonnes Pratiques

## ✅ Recommandations

- Utiliser des Dockerfiles multi-stage pour réduire la taille des images
- Copier `package.json` avant le code source pour maximiser le cache
- Toujours un utilisateur non-root dans le stage final
- Configurer `ulimits.nofile` pour Node.js et PostgreSQL en v29
- Créer un réseau bridge custom par stack
- Utiliser `--restart unless-stopped` en production

## ❌ Anti-Patterns

- Ne pas copier `node_modules` depuis l'hôte (toujours réinstaller dans le build)
- Ne pas oublier `.dockerignore` (build lent, image polluée)
- Ne pas run en root dans le stage final (sécurité)
- Ne pas utiliser `latest` tag en prod (épingler une version)
- Ne pas ignorer le changement ulimit v29 (erreurs silencieuses)

---

# 🔗 Ressources

## Documentation Officielle

- [Docker Engine v29 Release Notes](https://docs.docker.com/engine/release-notes/29/)
- [Dockerfile best practices](https://docs.docker.com/build/building/best-practices/)
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)

## Ressources Complémentaires

- [Docker CLI reference](https://docs.docker.com/reference/cli/docker/)
- [BuildKit](https://docs.docker.com/build/buildkit/)
