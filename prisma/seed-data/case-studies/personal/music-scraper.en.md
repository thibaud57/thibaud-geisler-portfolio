## Context

Python/FastAPI API to scrape 3 music platforms (Soundcloud, Beatport, Bandcamp) and expose the data to n8n workflows, **complemented by an MCP server** (Model Context Protocol) that exposes the same features as native tools for AI agents (Claude Desktop, n8n MCP Server Trigger). Both interfaces **coexist** on the same business code.

**Business goal**: have a unified interface to automatically extract music metadata across several platforms, usable both by classic workflows (REST) and by AI agents (MCP).

**My role**: end-to-end design, development and deployment, autonomously.

## Key achievements

### Multi-platform music scraping

Robust scrapers for 3 platforms: **Soundcloud** (via official API after obtaining developer access), **Beatport** (extraction of structured JSON data), **Bandcamp** (HTML parsing with filtering).

**Technical challenges**: rate-limit handling, mid-project pivot on Soundcloud (HTML scraping → official API), resilience to page-structure changes.

**Solutions**: async architecture with retry and backoff, separate handling of temporary errors (automatic retry) and permanent errors (escalation), parallelization of related requests.

### Dual interface: REST + MCP in parallel

Scrapers exposed via an **authenticated REST API** (classic n8n workflows, scripts, dashboards) and via an **MCP server** (native tools for AI agents: Claude Desktop, n8n MCP). Both interfaces share the same business code — no rewrite, no replacement.

**Technical challenges**: first MCP server implemented, several iterations to stabilize communication, sharing the business code between both interfaces without duplicating the scrapers' logic.

**Solutions**: each MCP tool maps to its REST endpoint counterpart, scrapers factored into a business layer reused by both interfaces, separate Docker images so REST and MCP can be deployed independently as needed.

### Self-hosted deployment

Initial deployment via GitHub Actions + SSH, then migration to **Dokploy** to simplify orchestration and centralize the infrastructure with the other self-hosted projects. Automatic CI/CD on merge.

## Results

- 3 platforms (Soundcloud, Beatport, Bandcamp) accessible via REST + MCP
- **Performance**: 100+ pages processed in <30s (async architecture + controlled parallelism)
- All scrapers exposed as MCP tools, usable natively by AI agents (Claude Desktop, n8n)
- Business code shared between both interfaces, zero duplication

## Takeaways

- Robust async scraping (fine-grained error handling, retry, resilience)
- OAuth 2.1 and integration with official APIs
- Model Context Protocol (MCP): first server implemented
- Modern self-hosting via Dokploy
- When an official API becomes available, **pivoting** is more sustainable than maintaining a scraper

## Planned evolutions

- Refactor of the MCP server (first implementation to revisit)
- Discogs and Songstats scrapers
- Monitoring (alert if scrapers break after page-structure changes)

## Links

- [MCP Usage documentation](https://github.com/thibaud57/techno-scraper/blob/master/docs/mcp-usage.md)
- [n8n MCP Setup documentation](https://github.com/thibaud57/techno-scraper/blob/master/docs/n8n-mcp-setup.md)
