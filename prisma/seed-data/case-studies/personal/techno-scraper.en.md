<!-- TODO: translate to English -->

## Contexte

API Python/FastAPI pour scraper 3 plateformes musicales (Soundcloud, Beatport, Bandcamp) et exposer les données à des workflows n8n, puis **migration vers un serveur MCP** (Model Context Protocol) pour intégration native avec des agents IA (Claude Desktop, n8n MCP Server Trigger).

**Objectif business** : disposer d'une interface unifiée pour extraire automatiquement les métadonnées musicales de plusieurs plateformes, utilisable à la fois par des workflows classiques et par des agents IA.

**Mon rôle** : conception, développement et déploiement de bout en bout en autonomie.

## Réalisations marquantes

### Scraping multi-plateformes musicales

Scrapers robustes pour 3 plateformes : **Soundcloud** (via API officielle après obtention des accès développeur), **Beatport** (extraction de données JSON structurées), **Bandcamp** (parsing HTML avec filtrage).

**Défis techniques** : gestion des rate limits, pivot en cours de route sur Soundcloud (scraping HTML → API officielle), résilience aux changements de structure des pages.

**Solutions** : architecture async avec retry et backoff, gestion distincte des erreurs temporaires (retry automatique) et permanentes (remontée), parallélisation des requêtes liées.

### API REST puis serveur MCP

Exposition des scrapers via une API REST authentifiée, puis **migration vers un serveur MCP** exposant les scrapers comme **tools natifs** pour agents IA (Claude Desktop, n8n MCP).

**Défis techniques** : premier serveur MCP implémenté, plusieurs itérations pour stabiliser la communication, coexistence REST + MCP avec code métier partagé.

**Solutions** : 1 tool MCP = 1 ex-route REST, code métier partagé entre les deux interfaces, images Docker distinctes pour REST et MCP.

### Déploiement self-hosted

Déploiement initial via GitHub Actions + SSH, puis migration vers **Dokploy** pour simplifier l'orchestration et centraliser l'infra avec les autres projets self-hosted. CI/CD automatique sur merge.

## Résultats

- 3 plateformes musicales scrapeables via une interface unifiée
- Phases 1-3 MCP complètes (tous les scrapers exposés en tools)
- Intégration native avec les agents IA de l'écosystème (Claude Desktop, n8n)

## Apprentissages

- Scraping async robuste (gestion fine des erreurs, retry, résilience)
- OAuth 2.1 et intégration avec des APIs officielles
- Model Context Protocol (MCP) : premier serveur implémenté
- Self-hosting moderne via Dokploy
- Quand une API officielle devient accessible, **pivoter** est plus durable que maintenir un scraper

## Évolutions prévues

- Refactor du serveur MCP (première implémentation à revoir)
- Scraper Discogs et Songstats
- Monitoring et cache pour requêtes fréquentes

## Liens

- [Documentation MCP Usage](https://github.com/thibaud57/techno-scraper/blob/master/docs/mcp-usage.md)
- [Documentation n8n MCP Setup](https://github.com/thibaud57/techno-scraper/blob/master/docs/n8n-mcp-setup.md)
