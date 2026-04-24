---
paths:
  - "compose.yaml"
  - "compose.yml"
  - "compose.override.yaml"
  - "docker-compose.yaml"
  - "docker-compose.yml"
---

# Docker Compose — services, volumes, healthchecks

## À faire
- Nommer le fichier **`compose.yaml`** (nom canonique v5) et démarrer directement par `services:` — **sans** `version:` (ignoré en v5, bruit inutile)
- Utiliser la syntaxe **`docker compose`** (plugin CLI officiel), jamais `docker-compose` (binaire v1 supprimé avril 2025)
- **Mount volume Postgres 18** sur `pgdata:/var/lib/postgresql` — **JAMAIS** `/var/lib/postgresql/data` (breaking change v17→v18 : `PGDATA` passe à `/var/lib/postgresql/18/docker`, ancien mount casse le conteneur)
- **Healthcheck `pg_isready`** sur le service `db` + **`depends_on.db.condition: service_healthy`** sur le service `app` : évite que le conteneur `app` démarre avant que Postgres soit prêt
- Résoudre les services entre eux par **nom de service DNS** interne (ex: `postgresql://user:pass@db:5432/...`), jamais par IP ni `localhost`
- Déclarer les volumes persistants en **volumes nommés** (section `volumes:` top-level), jamais en bind mount pour les données Postgres (permissions, portabilité)
- Définir **`restart: unless-stopped`** sur tous les services de production : redémarrage automatique après un crash (OOM, exception non gérée) ou un reboot du VPS, tout en respectant un `docker compose stop` manuel (contrairement à `restart: always`)
- **Séparer config prod et overrides dev via `compose.yaml` + `compose.override.yaml`** : `compose.yaml` prod-ready (volumes nommés persistants, pas de bind mount host, pas d'exposition de port interne, pas de safe net `DATABASE_URL`). Les overrides dev (exposition port DB pour DBeaver/psql, bind-mount `./assets`, override `DATABASE_URL` si `.env` contient `localhost`) vont dans `compose.override.yaml`, auto-chargé par `docker compose up` en local et ignoré par Dokploy en prod
- Pour la **config runtime du service app Next.js** (`output: standalone`, `HOSTNAME`, health endpoint, env vars) : voir `nextjs/production-deployment.md`
- Pour le **build multi-stage du service app** (base image, cache, USER non-root) : voir `docker/dockerfile.md`

## À éviter
- Exposer publiquement les ports du service `db` (`ports: "5432:5432"`) en production : garder l'accès interne au réseau compose uniquement (déplacer l'exposition dans `compose.override.yaml` pour le dev)
- Mettre des overrides dev-specific (bind-mount de dossiers host, `DATABASE_URL` pointant vers `localhost`, exposition de ports internes) directement dans `compose.yaml` : pollue la config prod et mélange les contextes, préférer `compose.override.yaml`
- Utiliser **`depends_on: service_started`** (défaut) quand le dépendant a besoin de la DB prête : préférer **`service_healthy`** couplé à un healthcheck
- `docker compose down --volumes` sans backup : suppression irréversible du volume de données Postgres

## Gotchas
- Docker Compose v1 (`docker-compose`) **entièrement supprimé** depuis avril 2025 → utiliser `docker compose` (plugin CLI) (VERSIONS.md)
- Docker Compose v5 : champ **`version:`** dans le YAML désormais **ignoré** (saut direct v2→v5, plus besoin de déclarer la version) (VERSIONS.md)
- **PostgreSQL 18 Docker breaking** : `PGDATA` passe à `/var/lib/postgresql/18/docker`, réutiliser l'ancien mount `/var/lib/postgresql/data` avec l'image `postgres:18` casse le conteneur au démarrage (VERSIONS.md)
- **`compose.override.yaml` auto-chargé** par `docker compose up` si présent à côté de `compose.yaml` (convention officielle) — mais **Dokploy ne charge que `compose.yaml`** par défaut, donc les overrides dev sont naturellement ignorés en prod sans config Dokploy particulière

## Exemples
```yaml
# ✅ compose.yaml générique app + db avec mount v18 correct et healthcheck
services:
  app:
    build: .
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/mydb

  db:
    image: postgres:18-alpine
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql       # ✅ v18
      # - pgdata:/var/lib/postgresql/data  ❌ casse le conteneur en v18
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

volumes:
  pgdata:
```

```yaml
# ✅ compose.override.yaml — overrides dev auto-chargés en local, ignorés par Dokploy en prod
services:
  db:
    # exposition pour clients SQL locaux (DBeaver, psql)
    ports:
      - '5432:5432'
  app:
    environment:
      # override du .env host (localhost) vers le service DNS compose
      DATABASE_URL: postgresql://user:pass@db:5432/mydb
    volumes:
      # bind-mount host pour voir les modifs en direct (remplace le volume nommé de compose.yaml)
      - ./assets:/app/assets:ro
```
