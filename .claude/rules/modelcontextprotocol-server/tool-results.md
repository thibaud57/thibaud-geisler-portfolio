---
paths:
  - "src/server/mcp/**/*.ts"
---

# MCP TypeScript SDK : résultats et erreurs d'outil

## À faire
- Renvoyer `content` (texte JSON) en plus de `structuredContent` quand l'outil a un `outputSchema`
- Signaler un échec récupérable par `isError: true` avec un message qui nomme la correction attendue (outil à appeler, champ à fournir)
- Garder chaque outil, lectures comprises, derrière une garde qui logge l'exception (`guardTool`, `src/server/mcp/crm/results.ts`) : le SDK la rend en `isError` sans aucun log

## Gotchas
- Des arguments qui ne passent pas `inputSchema` reviennent en `isError: true` sans appel du handler, et la validation de `outputSchema` est sautée sur tout résultat `isError`

## Exemples
```typescript
// ✅ Échec récupérable : isError et un message qui nomme la correction
return { isError: true, content: [{ type: 'text', text: 'Unknown id. Call sales_search first.' }] }

// ❌ Exception brute : rendue en isError par le SDK, mais sans log ni consigne pour le modèle
throw new Error('not found')
```
