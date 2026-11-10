---
paths:
  - "src/server/mcp/**/*.test.ts"
  - "src/app/api/mcp/**/*.test.ts"
---

# MCP TypeScript SDK : tests

## À faire
- Appeler les outils par le vrai handler : `StreamableHTTPClientTransport` de `@modelcontextprotocol/client` avec une option `fetch` branchée sur `handler.fetch`, sans serveur ni port
- Injecter `authInfo` dans ce `fetch` de test, comme la route le fait après vérification de la clé
- Négocier la version côté client par `versionNegotiation: { mode: 'auto' }`
- Fermer le client puis le handler (`client.close()`, `handler.close()`) après chaque test
- Tester la règle métier et le contrat de l'outil (arguments refusés, `isError`, `structuredContent`)

## À éviter
- `InMemoryTransport.createLinkedPair()` avec `server.connect` : il ne couvre que l'ère 2025, pas le chemin servi par `createMcpHandler`
- Appeler la fonction handler d'un outil à la main : la validation `inputSchema` et la forme du résultat ne seraient pas testées

## Exemples
```typescript
// ✅ Client en mémoire sur le handler réel
const handler = createMcpHandler(() => buildServer('sales'))
const transport = new StreamableHTTPClientTransport(new URL('http://test.invalid/mcp'), {
  fetch: (url, init) => handler.fetch(new Request(url, init), { authInfo }),
})

// ❌ Transport en mémoire de l'ère 2025
const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
await buildServer('sales').connect(serverSide)
```
