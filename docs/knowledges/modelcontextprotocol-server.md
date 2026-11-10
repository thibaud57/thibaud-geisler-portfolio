---
title: "MCP TypeScript SDK (serveur) - Outils exposés aux agents"
version: "2.4.0"
description: "Référence technique pour @modelcontextprotocol/server v2 : serveur et outils, handler HTTP sans état, intégration en route handler Next.js, erreurs, schéma d'entrée multi-entités, tests et spec MCP 2026-07-28."
date: "2026-11-10"
keywords: ["mcp", "model-context-protocol", "agents", "outils", "streamable-http", "zod", "route-handler"]
scope: ["docs"]
technologies: ["Next.js", "TypeScript", "Zod", "Better Auth", "Claude Code"]
---

# Description

`@modelcontextprotocol/server` est le paquet serveur de la ligne v2 du SDK TypeScript officiel du Model Context Protocol, le protocole par lequel un client d'agent (Claude Code, Claude Agent SDK, connecteurs claude.ai) découvre et appelle les outils d'une application. La v2, stable depuis le 2026-07-27, implémente la révision 2026-07-28 de la spec : plus de handshake `initialize` ni de session, chaque requête HTTP POST se suffit à elle-même. Le portfolio l'emploie pour servir ses outils aux agents depuis une route Next.js, une adresse par domaine, authentifiée par une clé d'API vérifiée par l'app ([ADR-025](../adrs/025-acces-agents-app.md)).

La ligne v1 (`@modelcontextprotocol/sdk`) reste publiée mais n'est pas utilisée ici : son mode sans état garde la régression [typescript-sdk #1994](https://github.com/modelcontextprotocol/typescript-sdk/issues/1994).

---

# Concepts Clés

## Serveur et enregistrement d'outils

### Description

Un `McpServer` porte un nom, une version et la liste de ses outils. Chaque outil se déclare par `registerTool(nom, config, handler)` : la config donne la description lue par le modèle, le schéma d'entrée en Zod 4, un schéma de sortie optionnel et des annotations. Le handler reçoit les arguments déjà validés et un contexte de requête.

### Exemple

```ts
import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'

export function buildServer(): McpServer {
  const server = new McpServer({ name: 'acme-orders', version: '1.0.0' })

  server.registerTool(
    'orders_fetch',
    {
      title: 'Fetch an order',
      description: 'Returns one order with its lines. Use orders_search first to find the id.',
      inputSchema: z.object({ id: z.string().describe('Order id returned by orders_search') }),
      outputSchema: z.object({ id: z.string(), status: z.enum(['draft', 'sent']) }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ id }) => {
      const order = await getOrder(id)
      return {
        content: [{ type: 'text', text: JSON.stringify(order) }],
        structuredContent: order,
      }
    },
  )

  return server
}
```

### Points Importants

- `inputSchema` exige un schéma Zod 4 (dépendance `zod ^4.2.0`). Zod 4.2+ convertit en JSON Schema nativement, les `.describe()` arrivent au modèle ; Zod 3 n'est pas supporté et lève « Schema appears to be from zod 3 » à la conversion. Les `inputSchema` se convertissent à chaque `tools/list`, pas à l'enregistrement (code 2.4.0) : un seul schéma inconvertible fait échouer la liste de tout le serveur
- `structuredContent` est validé contre `outputSchema` avant l'envoi : renvoyer aussi `content` en texte JSON pour les clients qui ignorent la sortie structurée
- Les annotations ne changent rien à l'exécution, ce sont des indices pour le client. Claude Code lit `readOnlyHint` (il parallélise ces appels avec les autres lectures) et `idempotentHint`, pas `destructiveHint` : une confirmation d'écriture ne repose jamais sur une annotation
- La forme v2 remplace les surcharges variadiques de la v1 (`server.tool(nom, description, shape, cb)`) : un exemple en ligne qui les emploie vise la v1
- L'option `instructions` (texte lu par le modèle avec le chargement différé des outils) se passe en second argument du constructeur : `new McpServer({ name, version }, { instructions })`, champ de `ServerOptions` dans les types 2.4.0 (lus le 2026-11-06), absent des pages de la documentation v2
- Coût en contexte mesuré par `/context` de Claude Code le 2026-11-06, un serveur à un outil connecté : environ 100 tokens pour deux phrases d'`instructions` ; le schéma d'un outil n'entre en contexte qu'à son chargement pour un appel (196 tokens pour un `_fetch` à union d'une entité), seul son nom y figure avant

---

## Handler HTTP sans état

### Description

`createMcpHandler(factory, options)` rend un handler Web standard, `fetch(Request) → Promise<Response>`, qui sert le transport Streamable HTTP. Le handler se crée une fois, au niveau du module ; sa factory est appelée **une fois par requête** et construit le `McpServer` de cette requête : aucun serveur singleton, aucun état entre deux appels.

### Exemple

```ts
import { createMcpHandler } from '@modelcontextprotocol/server'

const handler = createMcpHandler((ctx) => buildServer(), {
  legacy: 'stateless',
})

const response = await handler.fetch(request, { authInfo })
```

### Points Importants

- `ctx` de la factory contient `era` (`'legacy'` pour un client des révisions 2025, `'modern'` pour la 2026-07-28), `authInfo` et `requestInfo` : `era`, journalisé par requête, dit quelle révision parle chaque client
- `legacy: 'stateless'` (défaut) sert aussi les clients des révisions 2025, avec une instance fraîche par requête et sans session ; `legacy: 'reject'` leur renvoie une erreur de version. Claude Code 2.1.310 et le CLI 2.1.317 embarqué par `claude-agent-sdk` 0.2.177 parlent déjà la 2026-07-28 (`era: 'modern'`, relevé le 2026-11-06), comme `@modelcontextprotocol/client` 2.4.0 : garder le défaut, rien ne justifiant de couper un client 2025
- `responseMode` : `'auto'` (défaut) n'ouvre un flux SSE que si une notification précède la réponse, `'json'` répond toujours en JSON et perd les notifications émises avant le résultat. Des outils CRUD n'émettent pas de notification : `'auto'` leur répond déjà en JSON. `'json'` émet en plus un `console.warn` à chaque construction du handler (code 2.4.0) et ne s'applique qu'à l'ère modern, la branche legacy n'en tenant pas compte
- Chaque construction du handler crée son bus d'événements et son routeur d'abonnements : le construire dans la route à chaque requête les multiplie
- Autres options et défauts : `keepAliveMs` 15000, `maxSubscriptions` 1024, `maxRequestBodySize` 4194304 octets, `onerror`
- Le handler expose aussi `close()`, à appeler en fin de test
- Le handler ne lit jamais l'authentification dans les en-têtes : `authInfo` est « passed through, never derived from headers ». L'app vérifie le jeton elle-même et le transmet

---

## Route handler Next.js

### Description

Le handler Web standard se branche tel quel dans un route handler de l'App Router. Avant de lui passer la requête, la route valide l'origine, vérifie le jeton et répond elle-même en 401 ou 403. Le transport 2026-07-28 n'utilise que POST : GET et DELETE répondent 405.

### Exemple

```ts
// app/api/mcp/[domain]/route.ts
import { createMcpHandler, originValidationResponse } from '@modelcontextprotocol/server'

const handlers = { orders: createMcpHandler(() => buildServer('orders')) }

export async function POST(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const rejected = originValidationResponse(request, allowedOrigins)
  if (rejected) return rejected

  const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
  const key = token ? await verifyKey(token) : null
  if (!key) return new Response(null, { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } })

  const { domain } = await params
  return handlers[domain].fetch(request, { authInfo: { token, clientId: key.id, scopes: key.scopes } })
}

const methodNotAllowed = () => new Response(null, { status: 405, headers: { Allow: 'POST' } })
export const GET = methodNotAllowed
export const DELETE = methodNotAllowed
```

### Points Importants

- `createMcpHandler` ne valide ni `Origin` ni `Host`. La spec l'impose : « Servers MUST validate the Origin header on all incoming connections to prevent DNS rebinding attacks. If the Origin header is present and invalid, servers MUST respond with HTTP 403 Forbidden. » Le paquet exporte `originValidationResponse(request, hostnames)` et `hostHeaderValidationResponse(request, hostnames)`, qui rendent une `Response` 403 ou `undefined`. La liste attend des noms d'hôte (`example.com`), pas des origines complètes. Un `Origin` absent ou vide passe : c'est le cas normal d'un agent hors navigateur. Une valeur non analysable, dont le littéral `null` des contextes opaques, est refusée (`validateOriginHeader`, code 2.4.0 lu le 2026-11-06)
- Dans l'outil, l'authentification se lit par `ctx.http?.authInfo` et la requête brute par `ctx.http?.req` (objet `Request` Web) ; la forme exacte du type `AuthInfo` se vérifie dans les types du paquet
- Le segment dynamique se résout par `await params` (Promise depuis Next 15) avant de construire le handler
- Le SDK exige Node.js 20 ou plus : la route tourne en runtime Node, pas Edge
- Les en-têtes `Mcp-Session-Id` et `Last-Event-ID` sont à ignorer : la révision 2026-07-28 retire les sessions et la reprise de flux

---

## Erreurs d'outil

### Description

Un outil signale un échec par un résultat `isError: true`, que le modèle lit et peut corriger. Lever une exception dans le handler produit la même forme : le message de l'exception devient le texte du résultat. Un outil ne produit jamais d'erreur de protocole JSON-RPC.

### Exemple

```ts
async ({ id }) => {
  const order = await findOrder(id)
  if (!order) {
    return {
      isError: true,
      content: [{ type: 'text', text: `No order ${id}. Search with orders_search to get a valid id.` }],
    }
  }
  return { content: [{ type: 'text', text: JSON.stringify(order) }], structuredContent: order }
}
```

### Points Importants

- Un message d'erreur nomme la correction attendue : c'est le seul retour que le modèle reçoit pour réessayer
- La validation de `outputSchema` est sautée pour tout résultat `isError`
- Des arguments qui ne passent pas `inputSchema` reviennent aussi en `isError: true` (« Input validation error: Invalid arguments for tool … ») sans que le handler soit appelé
- Seule exception de protocole possible depuis un outil : `UrlElicitationRequiredError` (code -32042)
- `ProtocolError` et `ProtocolErrorCode` remplacent `McpError` et `ErrorCode` de la v1

---

## Schéma d'entrée multi-entités

### Description

Un outil générique qui sert plusieurs entités garde une racine plate : `entity` en `z.enum`, et la partie propre à chaque entité dans une propriété décrite par un `anyOf` imbriqué, une branche titrée par entité. Le handler reparse l'entrée avec le schéma strict de l'entité désignée. Une union discriminée à la racine est acceptée par le SDK depuis la PR [#1796](https://github.com/modelcontextprotocol/typescript-sdk/pull/1796) (mergée le 30 mars 2026, `type: "object"` ajouté à la racine, l'union en `oneOf` dessous), mais Claude Code n'en transmet au modèle que la première branche.

### Exemple

```ts
const SCHEMAS = { customer: customerDataSchema, supplier: supplierDataSchema } as const

const branchOf = (entity: keyof typeof SCHEMAS) => ({
  title: entity,
  ...z.toJSONSchema(SCHEMAS[entity], { io: 'input' }),
})

const createInput = z.strictObject({
  entity: z.enum(['customer', 'supplier']),
  // Affichée au modèle, non validée par le SDK : le schéma strict de l'entité la reparse
  data: z.looseObject({}).meta({ anyOf: [branchOf('customer'), branchOf('supplier')] }),
})

server.registerTool('sales_create', { description: 'Create a customer or a supplier', inputSchema: createInput }, async ({ entity, data }) => {
  const parsed = SCHEMAS[entity].safeParse(data)
  return parsed.success ? toResult(await create(entity, parsed.data)) : toError(z.prettifyError(parsed.error))
})
```

### Points Importants

- Claude Code réduit un `oneOf` racine à sa première branche : `entity` devient un `const` de la première entité et `required` est vidé (relevé le 2026-11-10 par une session Claude Code headless sur le serveur local, qui recopiait le schéma reçu). Un `anyOf` imbriqué dans une propriété est transmis tel quel
- Les clés posées par `.meta()` sont fusionnées dans le JSON Schema annoncé (`~standard.jsonSchema` de Zod 4, appelé par le SDK au `tools/list`) : `anyOf` s'ajoute à côté de `type: "object"` de la propriété
- La validation du SDK précède le handler et l'échec d'une union ne rend que « Invalid input » : laisser la partie propre à l'entité permissive pour le SDK (`z.looseObject({})`) et confier les erreurs au schéma strict de l'entité, qui nomme le champ fautif
- Pas de valeur par défaut à la racine si elle varie selon l'entité (ex. un ordre de tri) : le SDK l'appliquerait avant le reparse et masquerait celle de l'entité
- Avant #1796, une union discriminée donnait un schéma d'outil vide ([#1643](https://github.com/modelcontextprotocol/typescript-sdk/issues/1643)). Effet de bord du correctif : un schéma racine qui n'est ni objet ni union (`z.string()`) lève à sa conversion au `tools/list`
- L'instruction du serveur (`new McpServer(info, { instructions })`) se tire du registre des entités : écrite à la main, elle reste figée sur les entités du premier jour

---

## Tests sans réseau

### Description

Un test appelle les outils par le vrai handler HTTP, sans serveur ni port : le transport client reçoit une fonction `fetch` branchée sur `handler.fetch`. Le chemin testé est celui de la production, révision 2026-07-28 comprise.

### Exemple

```ts
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { createMcpHandler } from '@modelcontextprotocol/server'

const handler = createMcpHandler(() => buildServer())
const transport = new StreamableHTTPClientTransport(new URL('http://test.invalid/mcp'), {
  fetch: (url, init) => handler.fetch(new Request(url, init), { authInfo }),
})
const client = new Client({ name: 'test', version: '1.0.0' }, { versionNegotiation: { mode: 'auto' } })
await client.connect(transport)

const result = await client.callTool({ name: 'orders_fetch', arguments: { id: 'o1' } })

await client.close()
await handler.close()
```

### Points Importants

- `@modelcontextprotocol/client` est une dépendance de développement, pour les tests seulement
- `InMemoryTransport.createLinkedPair()` ne couvre que l'ère 2025 (`server.connect`) : il ne teste pas le chemin servi par `createMcpHandler`
- `authInfo` s'injecte dans le `fetch` du test, comme la route le fait après vérification de la clé
- Fermer le client puis le handler à chaque test

---

## Révision 2026-07-28 de la spec

### Description

La révision en vigueur au 2026-11-06 rend le protocole sans état et précise le transport HTTP. Ce qui suit est ce qu'un serveur d'outils doit savoir ; le SDK v2 en implémente le cœur.

### Exemple

```http
POST /api/mcp/sales HTTP/1.1
Authorization: Bearer <clé>
Content-Type: application/json
Mcp-Method: tools/call
Mcp-Name: sales_fetch

{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"sales_fetch","arguments":{"entity":"customer","id":"c1"}}}
```

### Points Importants

- Sessions et `initialize` retirés : chaque requête porte sa version de protocole et ses capacités dans `_meta`. Un état côté serveur passe par des identifiants explicites en arguments d'outil
- Un seul endpoint POST, réponse en JSON ou en SSE ; GET et DELETE répondent 405 ; les en-têtes `Mcp-Method` et `Mcp-Name` sont obligatoires côté client, une discordance avec le corps se rejette en 400 (code -32020). `createMcpHandler` fait ce contrôle lui-même en ère modern, avec celui de `MCP-Protocol-Version` (`validateStandardRequestHeaders`, code 2.4.0)
- Autorisation facultative : « Authorization is **OPTIONAL** for MCP implementations ». Si l'OAuth est adopté, la Protected Resource Metadata (RFC 9728) devient obligatoire et l'enregistrement dynamique des clients est déprécié au profit des Client ID Metadata Documents
- Dépréciés : transport HTTP+SSE, Sampling, Roots, Logging, enregistrement dynamique des clients ; le batching JSON-RPC est retiré depuis 2025-06-18
- `Tasks` devient une extension officielle (`io.modelcontextprotocol/tasks`) réservée aux opérations longues ; la 2.4.0 ajoute l'extension Skills (SEP-2640) par des sous-chemins `ext/skills`

---

## Différences avec la ligne v1

### Description

Une grande partie des exemples publiés visent encore la v1. La table de migration officielle donne les correspondances ; un codemod les applique.

### Exemple

```ts
// v1
server.tool('greet', 'Greet a user', { name: z.string() }, cb)
server.setRequestHandler(CallToolRequestSchema, (req, extra) => extra.authInfo)

// v2
server.registerTool('greet', { description: 'Greet a user', inputSchema: z.object({ name: z.string() }) }, cb)
server.setRequestHandler('tools/call', (req, ctx) => ctx.http?.authInfo)
```

### Points Importants

- Paquets : `@modelcontextprotocol/sdk` devient `@modelcontextprotocol/server`, `/client` et `/core`, plus des adaptateurs (`/node`, `/express`, `/hono`, `/fastify`) inutiles derrière un route handler
- `extra.authInfo` devient `ctx.http?.authInfo`, `extra.requestInfo` devient `ctx.http?.req`, `RequestHandlerExtra` devient `ServerContext`
- `StreamableHTTPServerTransport` devient `WebStandardStreamableHTTPServerTransport` ; `server.connect(transport)` ne sert que les clients 2025, la révision 2026-07-28 passe par `createMcpHandler`
- Retirés : `SSEServerTransport`, les tâches expérimentales, les helpers de conversion Zod
- Codemod : `npx @modelcontextprotocol/codemod@latest v1-to-v2 .`

---

# Bonnes Pratiques

## ✅ Recommandations

- Construire le `McpServer` dans la factory de `createMcpHandler`, une instance par requête, jamais en singleton de module
- Valider l'origine et vérifier la clé dans la route, avant `handler.fetch`, et répondre soi-même 401 (clé absente ou invalide) ou 403 (domaine hors des permissions de la clé)
- Peu d'outils, orientés tâche, nommés avec le préfixe de leur domaine (`crm_search`, `crm_fetch`…) : un même générique enregistré une fois par domaine, l'entité désignée par un discriminant ([ADR-025](../adrs/025-acces-agents-app.md))
- Des réponses courtes par défaut, paginées et filtrables : le résultat d'un outil entre en contexte
- Des descriptions d'outils écrites pour un nouvel arrivant : quand l'appeler, ce que chaque champ attend, quel outil appeler avant
- Faire appeler par chaque outil la logique métier commune aux Server Actions, jamais Prisma directement : les règles de validation et métier ne s'écrivent qu'une fois
- Poser `readOnlyHint: true` sur les lectures, pour que Claude Code les parallélise
- Tester chaque outil par le handler HTTP et un client en mémoire, pas en appelant la fonction du handler à la main

## ❌ Anti-Patterns

- Un outil par entité et par opération, ou des outils générés depuis des routes REST : « A common error we've observed is tools that merely wrap existing software functionality or API endpoints » (Anthropic)
- Un jeu d'outils global à tous les domaines : chaque schéma porterait toutes les entités, et aucune restriction ne serait possible par domaine
- Compter sur `destructiveHint` ou sur une règle de permission de Claude Code pour confirmer une écriture : les sessions d'`agent-os` tournent sans accord d'outil
- Accepter la session de l'espace admin ou un jeton émis pour un autre service : « MCP servers MUST NOT accept any tokens that were not explicitly issued for the MCP server »
- Suivre un exemple v1 (`server.tool`, `extra.authInfo`, `StreamableHTTPServerTransport`) sans le traduire
- Exposer un outil de suppression par défaut : une suppression se fait dans l'admin, sauf besoin établi

---

# 🔗 Ressources

## Documentation Officielle

- [Documentation du SDK TypeScript v2](https://ts.sdk.modelcontextprotocol.io/v2/)
- [createMcpHandler](https://ts.sdk.modelcontextprotocol.io/v2/api/@modelcontextprotocol/server/server/createMcpHandler.html)
- [Outils](https://ts.sdk.modelcontextprotocol.io/v2/servers/tools.html)
- [Erreurs](https://ts.sdk.modelcontextprotocol.io/v2/servers/errors.html)
- [Tests](https://ts.sdk.modelcontextprotocol.io/v2/testing.html)
- [Migration v1 vers v2](https://ts.sdk.modelcontextprotocol.io/v2/migration/upgrade-to-v2)
- [Dépôt typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [Spec MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)
- [Transport Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)

## Ressources Complémentaires

- [Anthropic, Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Claude Code, MCP](https://code.claude.com/docs/en/mcp)
- [MCP, Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)
