## Context

Python/FastAPI API to scrape 3 music platforms (Soundcloud, Beatport, Bandcamp) and expose the data to n8n workflows, then **migration to an MCP server** (Model Context Protocol) for native integration with AI agents (Claude Desktop, n8n MCP Server Trigger).

**Business goal**: have a unified interface to automatically extract music metadata across several platforms, usable both by classic workflows and by AI agents.

**My role**: end-to-end design, development and deployment, autonomously.

## Key achievements

### Multi-platform music scraping

Robust scrapers for 3 platforms: **Soundcloud** (via official API after obtaining developer access), **Beatport** (extraction of structured JSON data), **Bandcamp** (HTML parsing with filtering).

**Technical challenges**: rate-limit handling, mid-project pivot on Soundcloud (HTML scraping → official API), resilience to page-structure changes.

**Solutions**: async architecture with retry and backoff, separate handling of temporary errors (automatic retry) and permanent errors (escalation), parallelization of related requests.

### REST API then MCP server

Scrapers exposed via an authenticated REST API, then **migration to an MCP server** exposing the scrapers as **native tools** for AI agents (Claude Desktop, n8n MCP).

**Technical challenges**: first MCP server implemented, several iterations to stabilize communication, coexistence of REST and MCP with shared business code.

**Solutions**: 1 MCP tool = 1 former REST route, business code shared between both interfaces, separate Docker images for REST and MCP.

### Self-hosted deployment

Initial deployment via GitHub Actions + SSH, then migration to **Dokploy** to simplify orchestration and centralize the infrastructure with the other self-hosted projects. Automatic CI/CD on merge.

## Results

- 3 music platforms scrapeable through a unified interface
- MCP phases 1 to 3 complete (all scrapers exposed as tools)
- Native integration with the ecosystem's AI agents (Claude Desktop, n8n)

## Takeaways

- Robust async scraping (fine-grained error handling, retry, resilience)
- OAuth 2.1 and integration with official APIs
- Model Context Protocol (MCP): first server implemented
- Modern self-hosting via Dokploy
- When an official API becomes available, **pivoting** is more sustainable than maintaining a scraper

## Planned evolutions

- Refactor of the MCP server (first implementation to revisit)
- Discogs and Songstats scrapers
- Monitoring and caching for frequent requests

## Links

- [MCP Usage documentation](https://github.com/thibaud57/techno-scraper/blob/master/docs/mcp-usage.md)
- [n8n MCP Setup documentation](https://github.com/thibaud57/techno-scraper/blob/master/docs/n8n-mcp-setup.md)
