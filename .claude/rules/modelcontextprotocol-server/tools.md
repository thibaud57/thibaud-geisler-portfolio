---
paths:
  - "src/server/mcp/**/*.ts"
---

# MCP TypeScript SDK : outils

## À faire
- Exposer par domaine un même jeu d'outils génériques, préfixés du domaine (`<domaine>_search`, `_fetch`, `_query`, `_create`, `_update`), l'entité désignée par un discriminant `entity` (ADR-025)
- Déclarer chaque outil par `registerTool(nom, { title, description, inputSchema, outputSchema?, annotations }, handler)` du paquet `@modelcontextprotocol/server`
- Écrire `inputSchema` en Zod 4, avec un `.describe()` sur chaque champ que le modèle doit remplir : la description arrive au modèle
- Construire la racine de l'`inputSchema` en objet plat, `entity: z.enum([...])` tiré du registre des entités du domaine, et la partie propre à chaque entité (`data`, `fields`, `filters`) en `anyOf` imbriqué, une branche titrée par entité, que le schéma strict de l'entité parse dans le handler : une entité ajoutée ne touche ni les outils ni un `switch`. L'exhaustivité se porte sur les codes d'erreur du domaine (`assertNever`)
- Renvoyer `content` (texte JSON) en plus de `structuredContent` quand l'outil a un `outputSchema`
- Poser `readOnlyHint: true` sur les lectures (`search`, `fetch`, `query`), `idempotentHint: true` sur `update`
- Signaler un échec récupérable par `isError: true` avec un message qui nomme la correction attendue (outil à appeler, champ à fournir)
- Garder chaque outil, lectures comprises, derrière une garde qui logge l'exception (`guardTool`, `src/server/mcp/crm/results.ts`) : le SDK la rend en `isError` sans aucun log
- Parser les dates des parties d'entité par un codec Zod (`z.codec`, `src/server/mcp/crm/day-fields.ts`), la conversion chaîne ↔ `Date` se faisant une fois à la frontière, plutôt que par une conversion à la main dans chaque entité
- Faire appeler par chaque outil la logique métier commune aux Server Actions, jamais Prisma directement
- Invalider le cache après une écriture par `revalidateTag(tag, 'max')` ou `revalidatePath` : l'outil s'exécute dans un route handler, où `updateTag` ne s'appelle pas (réservé aux Server Actions, cf. `nextjs/rendering-caching.md`)
- Paginer et filtrer les lectures, réponses courtes par défaut : le résultat d'un outil entre en contexte
- Rédiger la description d'un outil pour un nouvel arrivant : quand l'appeler, quel outil appeler avant, ce que renvoie la réponse

## À éviter
- Un outil par entité et par opération (`update_lead`, `update_contact`) ou un outil par route REST
- Un jeu d'outils commun à tous les domaines : chaque schéma porterait toutes les entités, sans restriction possible par domaine
- Une union (`z.discriminatedUnion`, `z.union`) à la racine d'un `inputSchema` : Claude Code n'en montre au modèle que la première branche
- Un outil de suppression par défaut : la suppression reste dans l'espace admin, sauf besoin établi au spec du domaine
- Compter sur `destructiveHint` pour faire confirmer une écriture : Claude Code ne le lit pas, et les sessions d'`agent-os` tournent sans accord d'outil
- Les surcharges v1 `server.tool(nom, description, shape, cb)` et `extra.authInfo` : la v2 passe par `registerTool` et `ctx.http?.authInfo`

## Gotchas
- `@modelcontextprotocol/server` 2.x exige `zod ^4.2.0` : un schéma Zod 3 lève « Schema appears to be from zod 3 » à la conversion
- Les `inputSchema` se convertissent en JSON Schema à chaque `tools/list`, pas à l'enregistrement (code 2.4.0) : un seul schéma inconvertible fait échouer la liste de tout le domaine, d'où un test de contrat qui appelle `listTools`
- Un schéma racine qui n'est pas un objet (`z.string()`) lève à cette conversion
- Claude Code ne garde d'un `oneOf` racine que sa première branche (`entity` en `const`, `required` vide), alors qu'il transmet tel quel un `anyOf` imbriqué dans une propriété (constaté le 2026-11-10)
- Le SDK valide les arguments contre `inputSchema` avant le handler, et l'échec d'une union ne rend que « Invalid input » : poser la partie propre à l'entité en `z.looseObject({}).meta({ anyOf: [...] })`, affichée sans être validée par le SDK, pour que le schéma strict de l'entité nomme le champ fautif
- Les champs racine de l'`inputSchema` (`entity`, `id`, pagination, tri) sont parsés deux fois, par le SDK puis par l'entité : ni codec ni `transform` qui change le type sur eux. La partie d'entité, en `looseObject`, ne l'est qu'une fois, par l'entité
- Zod retire le `default` du JSON Schema d'entrée d'un schéma qui contient un codec : poser `prefault` à la place pour que l'agent voie le défaut (constaté sur Zod 4.6.7 le 2026-11-10)
- Des arguments qui ne passent pas `inputSchema` reviennent en `isError: true` sans appel du handler, et la validation de `outputSchema` est sautée sur tout résultat `isError`
- Les schémas de `src/lib/schemas/` sont écrits pour `FormData` (chaînes, `transform`, `preprocess`, sentinelle de valeur vide, messages en français pour le formulaire) : un `inputSchema` décrit des types JSON, il ne reprend pas ces schémas tels quels mais leurs définitions communes (enums Prisma, bornes, identifiants de `@/lib/ids`)

## Exemples
```typescript
// ✅ Racine plate tirée du registre, partie propre à chaque entité en anyOf imbriqué
server.registerTool('sales_create', {
  description: 'Create a record. Call sales_search first.',
  inputSchema: z.strictObject({
    entity: z.enum(ENTITY_NAMES),
    data: z.looseObject({}).meta({ anyOf: ENTITIES.map(dataBranchOf) }),
  }),
}, (args) => ENTITIES.find((e) => e.entity === args.entity).create(args))

// ❌ Union racine : le modèle ne voit que la première entité
inputSchema: z.discriminatedUnion('entity', ENTITIES.map(createSchemaFor))

// ❌ Un outil par entité et par opération
server.registerTool('update_customer', { ... }, async () => { ... })
server.registerTool('update_supplier', { ... }, async () => { ... })
```
