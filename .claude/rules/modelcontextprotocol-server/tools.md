---
paths:
  - "src/server/mcp/**/*.ts"
---

# MCP TypeScript SDK : outils

Le schéma d'entrée est dans `input-schema.md`, les résultats et erreurs dans `tool-results.md`.

## À faire
- Exposer par domaine un même jeu d'outils génériques, préfixés du domaine (`<domaine>_search`, `_fetch`, `_query`, `_create`, `_update`), l'entité désignée par un discriminant `entity` (ADR-025)
- Déclarer chaque outil par `registerTool(nom, { title, description, inputSchema, outputSchema?, annotations }, handler)` du paquet `@modelcontextprotocol/server`
- Poser `readOnlyHint: true` sur les lectures (`search`, `fetch`, `query`), `idempotentHint: true` sur `update`
- Faire appeler par chaque outil la logique métier commune aux Server Actions (`src/server/<domaine>/`), jamais Prisma directement
- Invalider le cache après une écriture selon le contexte d'exécution : l'outil tourne dans un route handler (cf. `nextjs/rendering-caching.md`)
- Paginer et filtrer les lectures, réponses courtes par défaut : le résultat d'un outil entre en contexte
- Rédiger la description d'un outil pour un nouvel arrivant : quand l'appeler, quel outil appeler avant, ce que renvoie la réponse

## À éviter
- Un outil par entité et par opération (`update_lead`, `update_contact`) ou un outil par route REST
- Un jeu d'outils commun à tous les domaines : chaque schéma porterait toutes les entités, sans restriction possible par domaine
- Un outil de suppression par défaut : la suppression reste dans l'espace admin, sauf besoin établi au spec du domaine
- Compter sur `destructiveHint` pour faire confirmer une écriture : Claude Code ne le lit pas, et les sessions d'`agent-os` tournent sans accord d'outil
- Les surcharges v1 `server.tool(nom, description, shape, cb)` et `extra.authInfo` : la v2 passe par `registerTool` et `ctx.http?.authInfo`

## Exemples
```typescript
// ✅ Outil générique du domaine, lecture annotée
server.registerTool('sales_search', {
  title: 'Search sales records',
  description: 'Search records of one entity. Call this before sales_create to avoid duplicates.',
  inputSchema,
  annotations: { readOnlyHint: true },
}, handler)

// ❌ Un outil par entité et par opération
server.registerTool('update_customer', { ... }, async () => { ... })
server.registerTool('update_supplier', { ... }, async () => { ... })
```
