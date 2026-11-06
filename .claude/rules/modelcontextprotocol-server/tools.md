---
paths:
  - "src/server/mcp/**/*.ts"
---

# MCP TypeScript SDK : outils

## À faire
- Exposer par domaine un même jeu d'outils génériques, préfixés du domaine (`<domaine>_search`, `_fetch`, `_query`, `_create`, `_update`), l'entité désignée par un discriminant `entity` (ADR-025)
- Déclarer chaque outil par `registerTool(nom, { title, description, inputSchema, outputSchema?, annotations }, handler)` du paquet `@modelcontextprotocol/server`
- Écrire `inputSchema` en Zod 4, avec un `.describe()` sur chaque champ que le modèle doit remplir : la description arrive au modèle
- Construire l'union d'entités du schéma (`z.discriminatedUnion('entity', [...])`) depuis le registre des entités du domaine, et faire résoudre l'entité par ce registre dans le handler : une entité ajoutée ne touche ni les outils ni un `switch`. L'exhaustivité se porte sur les codes d'erreur du domaine (`assertNever`)
- Renvoyer `content` (texte JSON) en plus de `structuredContent` quand l'outil a un `outputSchema`
- Poser `readOnlyHint: true` sur les lectures (`search`, `fetch`, `query`), `idempotentHint: true` sur `update`
- Signaler un échec récupérable par `isError: true` avec un message qui nomme la correction attendue (outil à appeler, champ à fournir)
- Faire appeler par chaque outil la logique métier commune aux Server Actions, jamais Prisma directement
- Invalider le cache après une écriture par `revalidateTag(tag, 'max')` ou `revalidatePath` : l'outil s'exécute dans un route handler, où `updateTag` ne s'appelle pas (réservé aux Server Actions, cf. `nextjs/rendering-caching.md`)
- Paginer et filtrer les lectures, réponses courtes par défaut : le résultat d'un outil entre en contexte
- Rédiger la description d'un outil pour un nouvel arrivant : quand l'appeler, quel outil appeler avant, ce que renvoie la réponse

## À éviter
- Un outil par entité et par opération (`update_lead`, `update_contact`) ou un outil par route REST
- Un jeu d'outils commun à tous les domaines : chaque schéma porterait toutes les entités, sans restriction possible par domaine
- Un outil de suppression par défaut : la suppression reste dans l'espace admin, sauf besoin établi au spec du domaine
- Compter sur `destructiveHint` pour faire confirmer une écriture : Claude Code ne le lit pas, et les sessions d'`agent-os` tournent sans accord d'outil
- Les surcharges v1 `server.tool(nom, description, shape, cb)` et `extra.authInfo` : la v2 passe par `registerTool` et `ctx.http?.authInfo`

## Gotchas
- `@modelcontextprotocol/server` 2.x exige `zod ^4.2.0` : un schéma Zod 3 lève « Schema appears to be from zod 3 » à la conversion
- Les `inputSchema` se convertissent en JSON Schema à chaque `tools/list`, pas à l'enregistrement (code 2.4.0) : un seul schéma inconvertible fait échouer la liste de tout le domaine, d'où un test de contrat qui appelle `listTools`
- Un schéma racine en union est accepté depuis la PR #1796 (le SDK ajoute `type: "object"` à la racine), mais un schéma racine ni objet ni union (`z.string()`) lève à cette conversion
- Claude Code 2.1.310 lit correctement un `oneOf` racine à une seule entité (relevé le 2026-11-06), non vérifié dès plusieurs entités : si un client le lit mal, replier sur un `z.object` plat avec `entity: z.enum([...])` et un parse discriminé dans le handler
- Des arguments qui ne passent pas `inputSchema` reviennent en `isError: true` sans appel du handler, et la validation de `outputSchema` est sautée sur tout résultat `isError`
- Les schémas de `src/lib/schemas/` sont écrits pour `FormData` (chaînes, `transform`, `preprocess`, sentinelle de valeur vide, messages en français pour le formulaire) : un `inputSchema` décrit des types JSON, il ne reprend pas ces schémas tels quels mais leurs définitions communes (enums Prisma, bornes, identifiants de `@/lib/ids`)

## Exemples
```typescript
// ✅ Un outil générique du domaine : union et résolution passent par le registre
server.registerTool('sales_fetch', {
  description: 'Fetch one record. Get the id from sales_search first.',
  inputSchema: z.discriminatedUnion('entity', ENTITIES.map(fetchSchemaFor)),
  annotations: { readOnlyHint: true },
}, ({ entity, id }) => ENTITIES.find((e) => e.entity === entity).fetch(id))

// ❌ Un outil par entité et par opération
server.registerTool('update_customer', { ... }, async () => { ... })
server.registerTool('update_supplier', { ... }, async () => { ... })
```
