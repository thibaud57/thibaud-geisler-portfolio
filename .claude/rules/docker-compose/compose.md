---
paths:
  - "compose.yaml"
  - "compose.override.yaml"
---

# Docker Compose — services, volumes, healthchecks

## À faire
- Nommer le fichier **`compose.yaml`** (nom canonique v5) et démarrer directement par `services:`, **sans** `version:` (ignoré en v5)
- Utiliser la syntaxe **`docker compose`** (plugin CLI officiel), jamais `docker-compose` (binaire v1 supprimé avril 2025)
- Persister Postgres dans un **volume nommé** monté sur **`/var/lib/postgresql`**, jamais `/var/lib/postgresql/data` (Postgres 18 déplace `PGDATA`, l'ancien mount casse le conteneur) ni un bind mount
- **Healthcheck `pg_isready`** sur la base + **`depends_on.<db>.condition: service_healthy`** sur l'application : `service_started`, le défaut, laisserait l'app démarrer avant que Postgres accepte les connexions
- Résoudre les services entre eux par **nom de service DNS** interne (`postgresql://user:pass@postgres:5432/...`), jamais par IP ni `localhost`
- Définir **`restart: unless-stopped`** sur tous les services de production : redémarrage après un crash ou un reboot du VPS, tout en respectant un `docker compose stop` manuel
- **Healthcheck obligatoire sur le service app** : Traefik ne route que vers un container `healthy`. Inutile de poser `start_interval`, Docker l'applique déjà à 5 s pendant le `start_period`
- **`init: true` et `mem_limit` sur le service app** : Node en PID 1 ne récolte pas les processus orphelins ; sans plafond, l'OOM killer du VPS peut tuer un autre service
- **Borner les logs** du service app : `logging.driver: json-file` avec `max-size` et `max-file`, Dokploy ne fait aucune rotation
- **Séparer prod et dev** : `compose.yaml` prod-ready (image tirée de GHCR, aucun port interne exposé), les overrides dev (port de la base pour un client SQL, `DATABASE_URL` vers le service) dans `compose.override.yaml`, chargé automatiquement en local et ignoré par Dokploy
- **Profile `validation`** sur le service app dans `compose.override.yaml` : le port 3000 reste libre pour le dev natif, le container ne se lance qu'avec `--profile validation`

## À éviter
- Ajouter un **`build:`** à `compose.yaml` : l'image se construit en CI et Dokploy la tire en pull-only (`pull_policy: always`)
- Exposer publiquement le port de la base en production : l'exposition ne vit que dans `compose.override.yaml`
- Mettre des réglages de dev (bind mounts, `DATABASE_URL` vers `localhost`, ports internes) dans `compose.yaml`
- `docker compose down --volumes` sans backup : suppression irréversible des données Postgres

## Gotchas
- Docker Compose v5 ignore le champ **`version:`**, et la v1 (`docker-compose`) est supprimée depuis avril 2025 (PRODUCTION.md § Mises à jour > Plateforme d'hébergement)
- **`compose.override.yaml` est auto-chargé** par `docker compose up` en local, mais **Dokploy ne charge que `compose.yaml`** : les overrides dev sont ignorés en prod sans config particulière
- En production, Postgres est une Dokploy Database autonome, pas un service de `compose.yaml`
- Config runtime Next.js du service app (`output: standalone`, `HOSTNAME`, health endpoint) : voir `nextjs/production-deployment.md`. Build de l'image : voir `docker/dockerfile.md`

## Exemples
```yaml
# ✅ compose.yaml : image tirée, healthcheck, logs bornés
services:
  app:
    image: ghcr.io/<org>/<app>:latest
    pull_policy: always
    restart: unless-stopped
    init: true
    mem_limit: 1g
    logging:
      driver: json-file
      options: { max-size: "20m", max-file: "5" }

# ✅ compose.override.yaml : base de dev, montée sur le chemin Postgres 18
services:
  postgres:
    image: postgres:18-alpine
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql       # ❌ /var/lib/postgresql/data casse Postgres 18
```
