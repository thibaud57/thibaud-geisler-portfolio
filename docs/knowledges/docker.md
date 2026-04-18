---
title: "Docker Engine — Conteneurisation"
version: "29.4.0"
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

Pattern fondamental pour réduire la taille des images de production : séparer les dépendances de build (toolchain, devDependencies) des dépendances runtime (binaires compilés uniquement). Dans le portfolio, Next.js est conteneurisé en trois stages : deps, build, production.

### Exemple

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm exec prisma generate && pnpm build

FROM base AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs
ENV NODE_ENV=production
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### Points Importants

- Nommer les stages avec `AS <name>` pour éviter les erreurs de réordonnancement
- Copier uniquement les artefacts compilés dans le stage final
- Utiliser un utilisateur non-root (`USER nextjs`)
- Image de base minimale (`alpine` ou `distroless`)
- `output: 'standalone'` dans `next.config.ts` pour le runtime minimal

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

Trois types de stockage : volumes nommés (gérés par Docker, portables), bind mounts (répertoire hôte monté, dev), tmpfs (mémoire, temporaire). Pour les données persistantes (PostgreSQL, assets), préférer les volumes nommés. Préférer la syntaxe `--mount` à `-v` pour la clarté.

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
