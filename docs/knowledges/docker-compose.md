---
title: "Docker Compose — Orchestration multi-services"
version: "5.5.1"
description: "Référence technique pour Docker Compose v5 : compose.yaml, healthchecks et depends_on."
date: "2026-04-13"
keywords: ["docker-compose", "orchestration", "yaml", "healthcheck"]
scope: ["docs"]
technologies: ["Docker", "PostgreSQL", "Dokploy"]
---

# Description

`Docker Compose` v5 orchestre les services multi-conteneurs du portfolio (Next.js + PostgreSQL) sur le VPS IONOS via Dokploy. La v5 délègue le build à Docker Bake, ignore définitivement le champ `version:` dans `compose.yaml` (warning en v5), et saute directement de v2 à v5.

---

# Concepts Clés

## compose.yaml (structure)

### Description

Le fichier canonique s'appelle `compose.yaml` (pas `docker-compose.yml`). Structure : `services`, `volumes`, `networks`, `configs`, `secrets`. En v5, le champ `version:` est ignoré et génère un warning. Ne commence plus par `version: '3.8'`, directement par `services:`.

### Exemple

Le projet répartit ses services sur deux fichiers : `compose.yaml`, seul lu par Dokploy en production, ne déclare que l'application ; `compose.override.yaml`, chargé automatiquement en local, ajoute le Postgres de dev et rend l'application optionnelle.

```yaml
# compose.yaml : production (Dokploy), image tirée de GHCR, jamais buildée ici
services:
  nextjs:
    image: ghcr.io/thibaud57/thibaud-geisler-portfolio:latest
    pull_policy: always
    restart: unless-stopped
    env_file: .env
    init: true          # Node en PID 1 ne récolte pas les processus orphelins
    mem_limit: 1g       # sans plafond, l'OOM killer peut tuer un autre service du VPS
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      start_period: 60s # couvre `prisma migrate deploy`, lancé avant le serveur

# compose.override.yaml : dev local uniquement
services:
  postgres:
    image: postgres:18-alpine
    volumes:
      - portfolio_pgdata:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-portfolio} -d ${POSTGRES_DB:-portfolio}"]
  nextjs:
    profiles: [validation]   # lancé seulement par `just docker-up`
    depends_on:
      postgres:
        condition: service_healthy
```

### Points Importants

- Pas de champ `version:` en v5
- **Aucun `build:`** : l'image est construite en CI et poussée sur GHCR, Dokploy la tire (`pull_policy: always`). En production, Postgres est une Dokploy Database autonome, pas un service de ce fichier
- Le profil `validation` garde l'application éteinte au quotidien : `just db` ne lance que Postgres et laisse le port 3000 à `just dev`
- Le healthcheck passe par `node -e fetch(...)` : l'image alpine n'embarque pas `curl`
- `${VAR:-défaut}` interpole depuis `.env` avec une valeur de repli, `$${VAR}` référence la variable du conteneur et non de l'hôte
- Aucun réseau déclaré : le réseau par défaut du projet suffit en local, Dokploy branche ses services sur `dokploy-network`

---

## Healthcheck et depends_on condition

### Description

Combiner `healthcheck` et `depends_on: condition: service_healthy` garantit que les services dépendants ne démarrent qu'une fois leur dépendance opérationnelle. Pattern essentiel pour que Next.js n'essaie pas de se connecter à PostgreSQL avant qu'il soit prêt.

### Exemple

```yaml
# compose.override.yaml
services:
  postgres:
    image: postgres:18-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-portfolio} -d ${POSTGRES_DB:-portfolio}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
      start_interval: 2s

  nextjs:
    depends_on:
      postgres:
        condition: service_healthy
```

### Points Importants

- `service_started` (défaut) ne vérifie que le démarrage du conteneur
- `service_healthy` attend le passage du healthcheck
- `service_completed_successfully` pour les jobs (migrations)
- `start_period` donne le temps au service de démarrer avant d'évaluer les retries, `start_interval` sonde plus souvent pendant cette fenêtre
- Ce couplage n'existe qu'en local : en production, Postgres est une Dokploy Database, hors du fichier

---

## Volumes et persistance

### Description

Les volumes nommés sont la méthode recommandée pour persister les données entre redémarrages. Pour PostgreSQL 18, le mount doit être sur `/var/lib/postgresql` (pas `/var/lib/postgresql/data`, changement v18). Les volumes `external: true` ne sont jamais supprimés par `docker compose down`.

### Exemple

```yaml
# compose.override.yaml
services:
  postgres:
    image: postgres:18-alpine
    volumes:
      - portfolio_pgdata:/var/lib/postgresql   # v18 : /var/lib/postgresql, pas /data

volumes:
  portfolio_pgdata:
```

### Points Importants

- Mount PostgreSQL v18 : `/var/lib/postgresql` (pas `/var/lib/postgresql/data`)
- `docker compose down --volumes` supprime les volumes (données perdues)
- `external: true` protège le volume de la suppression
- Les scripts dans `/docker-entrypoint-initdb.d/` sont exécutés au premier démarrage

---

## Networks et résolution DNS

### Description

Compose crée automatiquement un réseau bridge nommé `{projet}_default`. Tous les services y sont connectés et se résolvent par leur nom de service (DNS interne). En local, `nextjs` joint `postgres:5432` par ce DNS, sans réseau déclaré.

### Exemple

```yaml
# compose.override.yaml
services:
  nextjs:
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-portfolio}:${POSTGRES_PASSWORD:-portfolio}@postgres:5432/${POSTGRES_DB:-portfolio}  # "postgres" = nom du service
```

### Points Importants

- Tous les services d'un même compose sont sur le même réseau par défaut
- Résolution DNS par nom de service (`postgres`, `nextjs`, pas par IP)
- Réseaux multiples pour isoler des groupes de services
- En Dokploy : le réseau `dokploy-network` est injecté automatiquement

---

# Commandes Clés

## Orchestration quotidienne

### Description

Les commandes essentielles pour démarrer, arrêter, consulter l'état et les logs de la stack. Utilisées en dev local et en debug sur le VPS (Dokploy orchestre en prod).

### Syntaxe

```bash
# Démarrage
docker compose up -d                      # arrière-plan (postgres seul, nextjs est sous profil)
docker compose --profile validation up -d # avec l'image applicative (recette `just docker-up`)
docker compose up -d --wait               # attend que tous soient healthy

# Arrêt
docker compose down                       # stop + remove containers/networks
docker compose down --volumes             # + supprime volumes (DANGEREUX)

# Logs
docker compose logs -f                    # stream tous les services
docker compose logs -f --tail 100 nextjs # un service, dernières 100 lignes

# État
docker compose ps                         # services en cours
docker compose ps -a                      # tous (y compris arrêtés)

# Exec
docker compose exec postgres psql -U portfolio portfolio
```

### Points Importants

- `-d` (detach) : démarre en arrière-plan
- `--wait` attend les healthchecks (nouveau v2+)
- `down --volumes` supprime les données persistées (irréversible)
- `ps` ne montre que les services en cours par défaut

---

# Bonnes Pratiques

## ✅ Recommandations

- Utiliser `compose.yaml` (pas `docker-compose.yml`)
- Pas de champ `version:` en v5
- Toujours définir un `healthcheck` pour PostgreSQL
- Utiliser `depends_on: condition: service_healthy` pour les dépendances
- Mount PostgreSQL 18 sur `/var/lib/postgresql` (pas `/data`)
- Utiliser `${VAR}` pour les secrets, jamais hardcodés

## ❌ Anti-Patterns

- Ne pas utiliser `docker compose down --volumes` en prod sans backup
- Ne pas mélanger `depends_on: service_started` et attentes manuelles
- Ne pas exposer les ports de la DB publiquement : le `5432:5432` ne vit que dans l'override de dev
- Ne pas ajouter de `build:` à `compose.yaml` : Dokploy est en pull-only, l'image vient de GHCR
- Ne pas oublier le changement de mount PostgreSQL v18
- Ne pas committer `compose.override.yaml` si contient des secrets

---

# 🔗 Ressources

## Documentation Officielle

- [Docker Compose : Documentation](https://docs.docker.com/compose/)
- [compose.yaml reference](https://docs.docker.com/reference/compose-file/)
- [Startup order](https://docs.docker.com/compose/how-tos/startup-order/)

## Ressources Complémentaires

- [docker compose up](https://docs.docker.com/reference/cli/docker/compose/up/)
- [Dokploy : Docker Compose](https://docs.dokploy.com/docs/core/docker-compose)
