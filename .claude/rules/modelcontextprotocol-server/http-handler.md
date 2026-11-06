---
paths:
  - "src/app/api/mcp/**/route.ts"
  - "src/server/mcp/**/*.ts"
---

# MCP TypeScript SDK : handler HTTP

## À faire
- Servir le transport par `createMcpHandler(factory, options)` de `@modelcontextprotocol/server`, qui rend un handler Web standard `fetch(Request) → Response`
- Construire le `McpServer` et enregistrer ses outils dans la factory, appelée une fois par requête
- Garder une route par domaine (`/api/mcp/<domaine>`) : le domaine de l'adresse choisit les outils servis et se vérifie contre les permissions de la clé (ADR-025)
- Dans la route, dans cet ordre : valider l'origine, vérifier la clé, répondre soi-même 401 (clé absente ou invalide, avec `WWW-Authenticate: Bearer`) ou 403 (domaine hors des permissions), puis seulement `handler.fetch(request, { authInfo })`
- Passer l'identité de la clé vérifiée en `authInfo` et la lire dans l'outil par `ctx.http?.authInfo`
- Exporter `POST` seul pour le transport, `GET` et `DELETE` répondant 405 avec `Allow: POST`
- Utiliser `responseMode: 'json'` : des outils CRUD n'émettent ni flux ni notification de progression
- Garder `legacy` à son défaut (`'stateless'`) tant que la révision parlée par Claude Code et l'Agent SDK n'est pas relevée : `'reject'` couperait les clients des révisions 2025

## À éviter
- Un `McpServer` singleton de module partagé entre requêtes
- Lire l'authentification dans les en-têtes depuis un outil : le handler ne dérive jamais `authInfo` des en-têtes, seule la route vérifie la clé
- Accepter la session de l'espace admin ou un jeton émis pour un autre service sur cette route
- La ligne v1 `@modelcontextprotocol/sdk` et son `StreamableHTTPServerTransport` : régression #1994 en mode sans état, ouverte au 2026-11-06

## Gotchas
- `createMcpHandler` ne valide pas `Origin`, que la spec 2026-07-28 impose (403 sur un `Origin` présent et invalide) : passer par `originValidationResponse(request, hostnames)` avant le handler. La liste attend des noms d'hôte, pas des origines. Un `Origin` absent passe (agent hors navigateur), le littéral `null` est refusé (code 2.4.0)
- La révision 2026-07-28 retire sessions et reprise de flux : ignorer `Mcp-Session-Id` et `Last-Event-ID`, ne jamais en émettre
- Le SDK exige Node.js 20 ou plus : la route reste en runtime Node, défaut du projet
- L'option `instructions` se passe en second argument du constructeur, `new McpServer({ name, version }, { instructions })` (`ServerOptions`, types 2.4.0) : la documentation v2 ne la montre pas

## Exemples
```typescript
// ✅ Clé vérifiée par la route, transmise en authInfo, serveur construit par requête
export async function POST(request: NextRequest, { params }: RouteContext<'/api/mcp/[domain]'>) {
  const key = await verifyBearer(request)
  if (!key) return new Response(null, { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } })
  const { domain } = await params
  return createMcpHandler(() => buildServer(domain), { responseMode: 'json' })
    .fetch(request, { authInfo: toAuthInfo(key) })
}

// ❌ Serveur partagé, aucune vérification avant le handler
const handler = createMcpHandler(() => sharedServer)
export const POST = (request: Request) => handler.fetch(request)
```
