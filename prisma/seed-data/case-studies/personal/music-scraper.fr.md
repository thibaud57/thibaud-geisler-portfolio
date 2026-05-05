## Contexte

API Python/FastAPI pour scraper 3 plateformes musicales (Soundcloud, Beatport, Bandcamp) et exposer les données à des workflows n8n, **complétée par un serveur MCP** (Model Context Protocol) qui expose les mêmes fonctionnalités comme tools natifs pour agents IA (Claude Desktop, n8n MCP Server Trigger). Les deux interfaces **coexistent** sur le même code métier.

**Objectif business** : disposer d'une interface unifiée pour extraire automatiquement les métadonnées musicales de plusieurs plateformes, utilisable à la fois par des workflows classiques (REST) et par des agents IA (MCP).

**Mon rôle** : conception, développement et déploiement de bout en bout en autonomie.

## Réalisations marquantes

### Scraping multi-plateformes musicales

Scrapers robustes pour 3 plateformes : **Soundcloud** (via API officielle après obtention des accès développeur), **Beatport** (extraction de données JSON structurées), **Bandcamp** (parsing HTML avec filtrage).

**Défis techniques** : gestion des rate limits, pivot en cours de route sur Soundcloud (scraping HTML → API officielle), résilience aux changements de structure des pages.

**Solutions** : architecture async avec retry et backoff, gestion distincte des erreurs temporaires (retry automatique) et permanentes (remontée), parallélisation des requêtes liées.

### Double interface : REST + MCP en parallèle

Scrapers exposés via une **API REST authentifiée** (workflows n8n classiques, scripts, dashboards) et via un **serveur MCP** (tools natifs pour agents IA : Claude Desktop, n8n MCP). Les deux interfaces partagent le même code métier — pas de réécriture, pas de remplacement.

**Défis techniques** : premier serveur MCP implémenté, plusieurs itérations pour stabiliser la communication, mutualiser le code métier sans dupliquer la logique des scrapers entre les deux interfaces.

**Solutions** : 1 tool MCP correspond à 1 endpoint REST équivalent, scrapers factorisés dans une couche métier réutilisée par les deux interfaces, images Docker distinctes pour déployer REST et MCP indépendamment selon le besoin.

### Déploiement self-hosted

Déploiement initial via GitHub Actions + SSH, puis migration vers **Dokploy** pour simplifier l'orchestration et centraliser l'infra avec les autres projets self-hosted. CI/CD automatique sur merge.

## Résultats

- 3 plateformes (Soundcloud, Beatport, Bandcamp) accessibles via REST + MCP
- **Performance** : 100+ pages traitées en <30s (architecture async + parallélisation contrôlée)
- Tous les scrapers exposés comme MCP tools, utilisables nativement par les agents IA (Claude Desktop, n8n)
- Code métier mutualisé entre les deux interfaces, zéro duplication

## Apprentissages

- Scraping async robuste (gestion fine des erreurs, retry, résilience)
- OAuth 2.1 et intégration avec des APIs officielles
- Model Context Protocol (MCP) : premier serveur implémenté
- Self-hosting moderne via Dokploy
- Quand une API officielle devient accessible, **pivoter** est plus durable que maintenir un scraper

## Évolutions prévues

- Refactor du serveur MCP (première implémentation à revoir)
- Scraper Discogs et Songstats
- Monitoring (alerte si scrapers cassés suite à changement de structure des pages)

## Liens

- [Documentation MCP Usage](https://github.com/thibaud57/techno-scraper/blob/master/docs/mcp-usage.md)
- [Documentation n8n MCP Setup](https://github.com/thibaud57/techno-scraper/blob/master/docs/n8n-mcp-setup.md)
