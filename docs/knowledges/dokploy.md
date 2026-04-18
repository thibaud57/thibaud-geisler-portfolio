---
title: "Dokploy — Self-hosted PaaS"
version: "0.28.8"
description: "Référence technique pour Dokploy : déploiement, auto-deploy webhook, Traefik et environments."
date: "2026-04-13"
keywords: ["dokploy", "paas", "self-hosted", "traefik", "deployment"]
scope: ["docs"]
technologies: ["Docker", "Docker Compose", "Traefik", "GitHub"]
---

# Description

`Dokploy` est le PaaS self-hosted utilisé pour déployer le portfolio sur le VPS IONOS. Il installe automatiquement Docker Swarm, Traefik (v3.5) et une interface web. Gère le déploiement via webhook GitHub, les environments par projet, les rollbacks registry-based (v0.26+), les certificats Let's Encrypt, et l'orchestration Docker Compose. Pour le portfolio : un projet "portfolio" avec un service application Next.js et un service base PostgreSQL.

---

# Concepts Clés

## Installation et structure

### Description

Dokploy s'installe via un script sur un VPS Linux (Ubuntu/Debian). Il crée un dashboard web sur le port 3000 et organise les ressources en Organizations → Projects → Environments → Services. Pour le portfolio : 1 projet, environnement `production`, services `app` (Next.js) et `db` (PostgreSQL).

### Exemple

```bash
# Installation sur le VPS
curl -sSL https://dokploy.com/install.sh | sh

# Accès dashboard
# http://<ip-vps>:3000 → créer compte admin → configurer domaine

# Après config, retirer l'exposition publique du port 3000
docker service update --publish-rm "published=3000,target=3000,mode=host" dokploy
```

### Points Importants

- Prérequis : 2GB RAM min, 30GB disk, ports 80/443/3000 libres
- Installe Docker Swarm automatiquement si absent
- Dashboard accessible via un sous-domaine une fois configuré
- Retirer l'exposition du port 3000 après config (sécurité)

---

## Auto-deploy via webhook GitHub

### Description

Dokploy supporte deux méthodes d'auto-deploy : GitHub App (OAuth, push vers branche configurée) ou API webhook (GitHub Actions + curl). Pour le portfolio : GitHub App est le plus simple, push vers `main` déclenche un rebuild + redéploiement automatique.

### Exemple

```bash
# Alternative : déclencher via API (GitHub Actions)
curl -X POST https://<dokploy-domain>/api/application.deploy \
  -H "x-api-key: ${DOKPLOY_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"applicationId": "${DOKPLOY_APPLICATION_ID}"}'
```

### Points Importants

- GitHub App : configuration via Settings > Git > Create Github App
- Push vers la branche configurée déclenche un build automatique
- Les autres branches sont ignorées ("Branch Not Match")
- Alternative : API REST + header `x-api-key` pour les pipelines custom

---

## Environments et variables

### Description

Dokploy organise les variables d'environnement en trois niveaux : project (partagées entre services), environment (spécifiques à dev/prod), service (isolées). Syntaxe de référence : `${{project.VAR}}`, `${{environment.VAR}}`. Pour le portfolio : DATABASE_URL au niveau project, SMTP_HOST au niveau environment.

### Exemple

```bash
# Variables d'environnement dans le service app (Dokploy UI)
DATABASE_URL=${{project.DATABASE_URL}}
SMTP_HOST=${{environment.SMTP_HOST}}
SMTP_PORT=${{environment.SMTP_PORT}}
NEXT_PUBLIC_SITE_URL=https://thibaud-geisler.com
```

### Points Importants

- Hiérarchie : service > environment > project
- `${{project.VAR}}` : référence une var du niveau project
- `${{DOKPLOY_DEPLOY_URL}}` : URL automatique pour les Preview Deployments
- Les valeurs multilignes doivent être wrappées dans des doubles guillemets

---

## Traefik et Let's Encrypt

### Description

Dokploy embarque Traefik v3.5 comme reverse proxy. Génère automatiquement les certificats Let's Encrypt via HTTP-01 challenge (port 80 ouvert). Configuration statique dans `traefik.yml` (restart requis), dynamique dans `/etc/dokploy/traefik/dynamic/` (hot reload).

### Exemple

```yaml
# Les labels Traefik sont ajoutés automatiquement par Dokploy
# (l'UI Domains gère les domaines et certificats)
# Mais en Docker Compose custom, on peut les ajouter manuellement :

services:
  app:
    image: portfolio:latest
    networks:
      - dokploy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portfolio.rule=Host(`thibaud-geisler.com`)"
      - "traefik.http.routers.portfolio.entrypoints=websecure"
      - "traefik.http.routers.portfolio.tls.certResolver=letsencrypt"
      - "traefik.http.services.portfolio.loadbalancer.server.port=3000"

networks:
  dokploy-network:
    external: true
```

### Points Importants

- Préférer l'onglet Domains de l'UI Dokploy aux labels manuels
- Let's Encrypt : ~10s de délai après premier déploiement
- HTTP-01 challenge nécessite le port 80 ouvert
- Le réseau `dokploy-network` est injecté automatiquement

---

## Rollbacks registry-based

### Description

Depuis v0.26, Dokploy supporte les rollbacks en stockant chaque image déployée dans un registry configuré. Chaque déploiement tague et push l'image. Le bouton Rollback pull l'image depuis le registry et redéploie.

### Exemple

```
# Prérequis dans l'UI Dokploy :
# 1. Configurer un Docker registry (Docker Hub, GHCR, custom)
# 2. Activer Rollback dans Deployments → Rollback Settings
# 3. Le bouton Rollback apparaît à côté de chaque record de déploiement
```

### Points Importants

- Prérequis : registry configuré + option Rollback activée
- Rollback vers n'importe quel déploiement historique (pas seulement le précédent)
- Images stockées hors serveur (résilience)
- Les 10 derniers records sont conservés par défaut

---

# Commandes Clés

## CLI Dokploy

### Description

Le CLI `dokploy` permet d'interagir avec une instance Dokploy distante. Utile pour les pipelines CI/CD, les scripts d'automatisation ou la gestion depuis un terminal sans passer par le dashboard.

### Syntaxe

```bash
# Installation
npm install -g @dokploy/cli

# Authentification
dokploy authenticate                         # interactif (URL + API token)
dokploy verify                               # vérifier l'auth courante

# Projets et applications
dokploy project:list
dokploy app:deploy                           # déclencher un déploiement
dokploy app:stop

# Variables d'environnement
dokploy env pull .env.production             # récupère les vars du serveur
dokploy env push .env.production             # envoie les vars vers le serveur
```

### Points Importants

- Authentification via API token (généré dans le profil Dokploy)
- Alternative au dashboard pour les pipelines CI/CD
- `env pull/push` pour synchroniser les variables avec un fichier local
- `--help` sur chaque commande pour les flags complets

---

# Bonnes Pratiques

## ✅ Recommandations

- Installer via le script officiel : `curl -sSL https://dokploy.com/install.sh | sh`
- Retirer l'exposition publique du port 3000 après config
- Activer l'auto-deploy via GitHub App pour la branche `main`
- Configurer un registry pour les rollbacks (Docker Hub ou GHCR)
- Utiliser les variables au niveau project/environment pour la hiérarchie
- Préférer l'UI Domains aux labels Traefik manuels

## ❌ Anti-Patterns

- Ne pas laisser le port 3000 exposé publiquement après la config initiale
- Ne pas mettre des secrets en clair dans `docker-compose.yaml` (utiliser les vars Dokploy)
- Ne pas utiliser `container_name` dans Docker Compose (casse les logs/métriques)
- Ne pas oublier le prérequis `dokploy-network` externe dans les compose manuels
- Ne pas compter sur les rollbacks sans registry configuré

---

# 🔗 Ressources

## Documentation Officielle

- [Dokploy — Documentation](https://docs.dokploy.com/docs/core)
- [CLI reference](https://docs.dokploy.com/docs/cli)
- [Installation guide](https://docs.dokploy.com/docs/core/installation)

## Ressources Complémentaires

- [Auto Deploy](https://docs.dokploy.com/docs/core/auto-deploy)
- [Going Production](https://docs.dokploy.com/docs/core/applications/going-production)
- [GitHub Action : dokploy-deployment](https://github.com/marketplace/actions/dokploy-deployment)
