---
paths:
  - "src/server/mcp/**/*.ts"
---

# MCP TypeScript SDK : schéma d'entrée des outils

## À faire
- Écrire `inputSchema` en Zod 4, avec un `.describe()` sur chaque champ que le modèle doit remplir : la description arrive au modèle
- Construire la racine de l'`inputSchema` en objet plat, `entity: z.enum([...])` tiré du registre des entités du domaine, et la partie propre à chaque entité (`data`, `fields`, `filters`) en `anyOf` imbriqué, une branche titrée par entité, que le schéma strict de l'entité parse dans le handler : une entité ajoutée ne touche ni les outils ni un `switch`. L'exhaustivité se porte sur les codes d'erreur du domaine (`assertNever`)
- Parser les dates des parties d'entité par un codec Zod (`z.codec`, `src/server/mcp/day-fields.ts`), la conversion chaîne ↔ `Date` se faisant une fois à la frontière, plutôt que par une conversion à la main dans chaque entité

## À éviter
- Une union (`z.discriminatedUnion`, `z.union`) à la racine d'un `inputSchema` : Claude Code n'en montre au modèle que la première branche

## Gotchas
- `@modelcontextprotocol/server` 2.x exige `zod ^4.2.0` : un schéma Zod 3 lève « Schema appears to be from zod 3 » à la conversion
- Les `inputSchema` se convertissent en JSON Schema à chaque `tools/list`, pas à l'enregistrement (code 2.4.0) : un seul schéma inconvertible fait échouer la liste de tout le domaine, d'où un test de contrat qui appelle `listTools`
- Un schéma racine qui n'est pas un objet (`z.string()`) lève à cette conversion
- Claude Code ne garde d'un `oneOf` racine que sa première branche (`entity` en `const`, `required` vide), alors qu'il transmet tel quel un `anyOf` imbriqué dans une propriété (constaté le 2026-11-10)
- Le SDK valide les arguments contre `inputSchema` avant le handler, et l'échec d'une union ne rend que « Invalid input » : poser la partie propre à l'entité en `z.looseObject({}).meta({ anyOf: [...] })`, affichée sans être validée par le SDK, pour que le schéma strict de l'entité nomme le champ fautif
- Les champs racine de l'`inputSchema` (`entity`, `id`, pagination, tri) sont parsés deux fois, par le SDK puis par l'entité : ni codec ni `transform` qui change le type sur eux. La partie d'entité, en `looseObject`, ne l'est qu'une fois, par l'entité
- Zod retire le `default` du JSON Schema d'entrée d'un schéma qui contient un codec : poser `prefault` pour que l'agent voie le défaut (constaté sur Zod 4.6.7 le 2026-11-10)
- Les schémas de `src/lib/schemas/` sont écrits pour `FormData` (chaînes, `transform`, `preprocess`, sentinelle de valeur vide, messages en français pour le formulaire) : un `inputSchema` décrit des types JSON, il ne reprend pas ces schémas tels quels mais leurs définitions communes (enums Prisma, bornes, identifiants de `@/lib/ids`)

## Exemples
```typescript
// ✅ Racine plate tirée du registre, partie propre à chaque entité en anyOf imbriqué
inputSchema: z.strictObject({
  entity: z.enum(ENTITY_NAMES),
  data: z.looseObject({}).meta({ anyOf: ENTITIES.map(dataBranchOf) }),
})

// ❌ Union racine : le modèle ne voit que la première entité
inputSchema: z.discriminatedUnion('entity', ENTITIES.map(createSchemaFor))
```
