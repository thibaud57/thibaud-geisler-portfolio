---
title: "Docker Compose — Orchestration multi-services"
version: "5.1.2"
description: "Référence technique pour Docker Compose v5 : compose.yaml, healthchecks et depends_on."
date: "2026-04-13"
keywords: ["docker-compose", "orchestration", "yaml", "healthcheck"]
scope: ["docs"]
technologies: ["Docker", "PostgreSQL", "Dokploy"]
---

# Description

`Docker Compose` v5 orchestre les services multi-conteneurs du portfolio (Next.js + PostgreSQL) sur le VPS IONOS via Dokploy. La v5 délègue le build à Docker Bake, ignore définitivement le champ `version:` dans `compose.yaml` (warning en v5), et saute directement de v2 à v5 pour éviter la confusion avec les anciens formats v1 "version 3.x".

---

# Concepts Clés

## compose.yaml (structure)

### Description

Le fichier canonique s'appelle `compose.yaml` (pas `docker-compose.yml`). Structure : `services`, `volumes`, `networks`, `configs`, `secrets`. En v5, le champ `version:` est ignoré et génère un warning. Ne commence plus par `version: '3.8'`, directement par `services:`.

### Exemple

```yaml
# compose.yaml
services:
  db:
    image: postgres:18.3
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql
    networks:
      - portfolio
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  app:
    build:
      context: .
      target: production
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      SMTP_HOST: ${SMTP_HOST}
    ports:
      - "3000:3000"
    networks:
      - portfolio
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:

networks:
  portfolio:
    driver: bridge
```

### Points Importants

- Pas de champ `version:` en v5
- `${VAR}` interpole depuis `.env` ou l'environnement du shell
- `$${VAR}` échappe : référence la var d'env du conteneur, pas de l'hôte
- Tout est à plat sous `services:`, `volumes:`, `networks:`

---

## Healthcheck et depends_on condition

### Description

Combiner `healthcheck` et `depends_on: condition: service_healthy` garantit que les services dépendants ne démarrent qu'une fois leur dépendance opérationnelle. Pattern essentiel pour que Next.js n'essaie pas de se connecter à PostgreSQL avant qu'il soit prêt.

### Exemple

```yaml
services:
  db:
    image: postgres:18.3
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U portfolio -d portfolio"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  app:
    depends_on:
      db:
        condition: service_healthy
```

### Points Importants

- `service_started` (défaut) ne vérifie que le démarrage du conteneur
- `service_healthy` attend le passage du healthcheck
- `service_completed_successfully` pour les jobs (migrations)
- `start_period` donne le temps au service de démarrer avant d'évaluer les retries

---

## Volumes et persistance

### Description

Les volumes nommés sont la méthode recommandée pour persister les données entre redémarrages. Pour PostgreSQL 18, le mount doit être sur `/var/lib/postgresql` (pas `/var/lib/postgresql/data`, changement v18). Les volumes `external: true` ne sont jamais supprimés par `docker compose down`.

### Exemple

```yaml
services:
  db:
    image: postgres:18.3
    volumes:
      - pgdata:/var/lib/postgresql   # v18 : /var/lib/postgresql, pas /data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro

volumes:
  pgdata:
    # Pour réutiliser un volume existant créé hors compose
    # external: true
```

### Points Importants

- Mount PostgreSQL v18 : `/var/lib/postgresql` (pas `/var/lib/postgresql/data`)
- `docker compose down --volumes` supprime les volumes (données perdues)
- `external: true` protège le volume de la suppression
- Les scripts dans `/docker-entrypoint-initdb.d/` sont exécutés au premier démarrage

---

## Networks et résolution DNS

### Description

Compose crée automatiquement un réseau bridge nommé `{projet}_default`. Tous les services y sont connectés et se résolvent par leur nom de service (DNS interne). Dans le portfolio, `app` accède à `db:5432` via le DNS Docker.

### Exemple

```yaml
services:
  app:
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/portfolio  # "db" = nom du service

  db:
    image: postgres:18.3

networks:
  # Définition explicite (optionnelle) pour isoler plusieurs stacks
  portfolio:
    driver: bridge
```

### Points Importants

- Tous les services d'un même compose sont sur le même réseau par défaut
- Résolution DNS par nom de service (`db`, `app`, pas par IP)
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
docker compose up -d                      # arrière-plan
docker compose up -d --build              # rebuild avant up
docker compose up -d --wait               # attend que tous soient healthy

# Arrêt
docker compose down                       # stop + remove containers/networks
docker compose down --volumes             # + supprime volumes (DANGEREUX)

# Logs
docker compose logs -f                    # stream tous les services
docker compose logs -f --tail 100 app    # un service, dernières 100 lignes

# État
docker compose ps                         # services en cours
docker compose ps -a                      # tous (y compris arrêtés)

# Exec
docker compose exec db psql -U portfolio portfolio
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
- Ne pas exposer les ports de la DB publiquement (enlever `ports:` sur `db` en prod)
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
